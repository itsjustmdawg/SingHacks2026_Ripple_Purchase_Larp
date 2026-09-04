interface FlowStageProps {
  step: number;
  title: string;
  description: string;
}

export function FlowStage({ step, title, description }: FlowStageProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 leading-7 text-slate-600">{description}</p>
        </div>
      </div>
    </section>
  );
}
