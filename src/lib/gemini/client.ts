import { GoogleGenAI } from "@google/genai";

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [250, 750] as const;

export interface GeminiJsonGenerator {
  readonly model: string;
  generateJson(prompt: string, schema: object): Promise<unknown>;
}

export class GeminiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiResponseError";
  }
}

export class GeminiClient implements GeminiJsonGenerator {
  readonly model: string;
  private readonly client: GoogleGenAI;

  constructor(apiKey: string, model = DEFAULT_GEMINI_MODEL) {
    if (!apiKey.trim()) {
      throw new GeminiResponseError("A Gemini API key is required.");
    }

    this.client = new GoogleGenAI({ apiKey: apiKey.trim() });
    this.model = model.trim() || DEFAULT_GEMINI_MODEL;
  }

  async generateJson(prompt: string, schema: object): Promise<unknown> {
    let response;
    for (let attempt = 0; ; attempt += 1) {
      try {
        response = await this.client.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseJsonSchema: schema,
          },
        });
        break;
      } catch (error) {
        const status = readErrorStatus(error);
        const retryDelay = RETRY_DELAYS_MS[attempt];
        if (retryDelay === undefined || !RETRYABLE_STATUSES.has(status ?? 0)) {
          throw new GeminiResponseError(
            `Gemini request failed${status ? ` with status ${status}` : ""}.`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    const output = response.text?.trim();
    if (!output) {
      throw new GeminiResponseError("Gemini returned no structured output.");
    }

    try {
      return JSON.parse(output) as unknown;
    } catch {
      throw new GeminiResponseError("Gemini returned invalid JSON.");
    }
  }
}

function readErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }
  return typeof error.status === "number" ? error.status : null;
}

export function createConfiguredGeminiClient(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): GeminiJsonGenerator | null {
  const apiKey = environment.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  return new GeminiClient(
    apiKey,
    environment.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
  );
}
