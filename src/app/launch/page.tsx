import { LaunchFlow } from "@/components/launch/LaunchFlow";
import { initialSearchInput } from "@/services/search-input";
export const metadata = { title: "Launch your agent team" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    objective?: string;
    pricing?: string;
    mode?: string;
  }>;
}) {
  const p = await searchParams;
  const input = initialSearchInput(
    (p.objective ?? "").slice(0, 1700),
    p.pricing?.slice(0, 400),
  );
  return (
    <LaunchFlow
      initialObjective={input.item}
      initialPricing={input.pricing}
      initialMode={p.mode === "demo" ? "demo" : "web"}
    />
  );
}
