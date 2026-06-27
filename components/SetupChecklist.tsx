"use client";

import { copy } from "@/lib/copy";

type SetupChecklistProps = {
  linkComplete: boolean;
  onFinishSetup?: () => void;
};

export function SetupChecklist({
  linkComplete,
  onFinishSetup,
}: SetupChecklistProps) {
  if (linkComplete) return null;

  return (
    <div className="card">
      <h3 className="font-display font-bold text-lg mb-4">
        {copy.setupChecklist.title}
      </h3>
      <ul className="space-y-4">
        <li className="flex items-center gap-3">
          <span className="step-badge-done shrink-0">✓</span>
          <span className="text-sm text-foreground/80">
            {copy.setupChecklist.signedIn}
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="step-badge-todo shrink-0">2</span>
          <span className="text-sm text-foreground/80">
            {copy.setupChecklist.linkSmartAccount}
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="step-badge-todo shrink-0">3</span>
          <span className="text-sm text-foreground/50">
            {copy.setupChecklist.claimsStart}
          </span>
        </li>
      </ul>
      {onFinishSetup && (
        <button
          type="button"
          onClick={onFinishSetup}
          className="btn-primary w-full mt-6"
        >
          {copy.dashboard.finishSetupCta}
        </button>
      )}
    </div>
  );
}
