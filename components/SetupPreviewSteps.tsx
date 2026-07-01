import { copy } from "@/lib/copy";

export function SetupPreviewSteps() {
  return (
    <div className="card w-full text-left p-5">
      <h3 className="font-display font-bold text-xl mb-4">
        {copy.dashboard.setupStepsTitle}
      </h3>
      <ul className="space-y-4">
        {copy.dashboard.setupSteps.map((step, index) => (
          <li key={step.title} className="flex gap-4 min-w-0 items-start">
            <span className="step-badge-todo shrink-0">{index + 1}</span>
            <div className="min-w-0 space-y-1">
              <p className="font-display font-bold text-sm leading-snug">
                {step.title}
              </p>
              <p className="text-xs text-foreground/70 leading-relaxed">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
