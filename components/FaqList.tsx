"use client";

import { useId, useState } from "react";
import { copy } from "@/lib/copy";

function FaqItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  const buttonId = useId();
  const panelId = useId();

  return (
    <div className="card">
      <button
        type="button"
        id={buttonId}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full font-display font-bold cursor-pointer flex items-center justify-between gap-3 text-left focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      >
        <span className="min-w-0">{question}</span>
        <span
          aria-hidden
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black rounded-brutal font-display font-bold text-lg leading-none shadow-[2px_2px_0_0_#000000] transition-colors duration-200 ${
            open ? "bg-primary text-white" : "bg-white text-foreground"
          }`}
        >
          <span className={open ? "hidden" : "block"}>+</span>
          <span className={open ? "block -mt-0.5" : "hidden"}>−</span>
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-foreground/80 mt-3 pt-3 border-t-2 border-black leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {copy.faqs.items.map((item, index) => (
        <FaqItem
          key={item.question}
          question={item.question}
          answer={item.answer}
          open={openIndex === index}
          onToggle={() =>
            setOpenIndex((current) => (current === index ? null : index))
          }
        />
      ))}
    </div>
  );
}
