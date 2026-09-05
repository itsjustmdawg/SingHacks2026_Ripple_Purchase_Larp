import { LoaderCircle } from "lucide-react";
export default function Loading() {
  return (
    <main id="main" className="wrap page-main">
      <div className="empty-state" role="status">
        <LoaderCircle className="spin" size={25} />
        <p>Opening your next possibility…</p>
      </div>
    </main>
  );
}
