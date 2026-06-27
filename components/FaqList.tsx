import { copy } from "@/lib/copy";

export function FaqList() {
  return (
    <div className="space-y-3">
      {copy.faqs.items.map((item) => (
        <details
          key={item.question}
          className="card group [&::-webkit-details-marker]:hidden"
        >
          <summary className="font-display font-bold cursor-pointer list-none flex items-center justify-between gap-3">
            <span className="min-w-0">{item.question}</span>
            <span
              aria-hidden
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black rounded-brutal bg-white font-display font-bold text-lg leading-none text-foreground shadow-[2px_2px_0_0_#000000] group-open:bg-primary group-open:text-white transition-colors"
            >
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:block -mt-0.5">−</span>
            </span>
          </summary>
          <p className="text-sm text-foreground/80 mt-3 pt-3 border-t-2 border-black leading-relaxed">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
