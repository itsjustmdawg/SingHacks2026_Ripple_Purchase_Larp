interface FlowStageProps {
  title: string;
  status: "Ready" | "Pending" | "Waiting";
}

const statusStyles = {
  Ready: "ready",
  Pending: "pending",
  Waiting: "waiting",
} as const;

export function FlowStage({ title, status }: FlowStageProps) {
  return (
    <section className="flowStage">
      <h2>{title}</h2>
      <span className={statusStyles[status]}>{status}</span>
    </section>
  );
}
