export class ShoppingError extends Error {
  constructor(
    message: string,
    public readonly nextStep: string,
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}
export function shoppingErrorBody(error: unknown) {
  if (error instanceof ShoppingError)
    return {
      status: error.status,
      body: {
        error: error.message,
        nextStep: error.nextStep,
        code: error.code,
      },
    };
  return {
    status: 503,
    body: {
      error: "The research service could not finish this request.",
      nextStep:
        "Retry the search. No payment has been sent. If this keeps happening, check Gemini quota in AI Studio.",
      code: "SEARCH_UNAVAILABLE",
    },
  };
}
