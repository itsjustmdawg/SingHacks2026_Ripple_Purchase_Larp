import { LoginForm } from "@/components/auth/LoginForm";
import { AgentCore } from "@/components/visual/AgentCore";
import { Eyebrow } from "@/components/ui/brand";
export const metadata = { title: "Log in" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const p = await searchParams;
  const next =
    p.next && /^\/(dashboard|launch|activity)([/?]|$)/.test(p.next)
      ? p.next
      : "/dashboard";
  return (
    <main id="main" className="wrap page-main">
      <div className="auth-grid">
        <div className="auth-story">
          <Eyebrow>GOOD TO HAVE YOU HERE</Eyebrow>
          <h1>
            Your objective.
            <br />
            <span>Their next move.</span>
          </h1>
          <AgentCore compact />
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
