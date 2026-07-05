const BRAND_COLORS = ["#F83028", "#E92B22", "#80B040", "#085020", "#D6F5C1"];

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function celebrateGoClaimAccountLink(): Promise<void> {
  if (prefersReducedMotion()) return;

  const { default: confetti } = await import("canvas-confetti");

  const burst = (particleCount: number, spread: number) => {
    void confetti({
      particleCount,
      spread,
      ticks: 120,
      origin: { y: 0.65 },
      colors: BRAND_COLORS,
      disableForReducedMotion: true,
    });
  };

  burst(80, 55);
  window.setTimeout(() => burst(50, 70), 150);
  window.setTimeout(() => burst(30, 90), 300);
}
