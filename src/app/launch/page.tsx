import { LaunchFlow } from "@/components/launch/LaunchFlow";
export const metadata = { title: "Launch your agent team" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ objective?: string }>;
}) {
  const p = await searchParams;
  return <LaunchFlow initialObjective={(p.objective ?? "").slice(0, 1700)} />;
}
