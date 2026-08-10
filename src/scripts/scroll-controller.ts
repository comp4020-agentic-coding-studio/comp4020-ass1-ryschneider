export interface RegisteredStage {
  id: string;
  start(): void;
  stop(): void;
}

/**
 * Starts/stops each stage's render loop as its section enters/leaves the viewport, so at most
 * one stage animates at a time — the direct answer to keeping this smooth on a phone.
 */
export function initScrollController(stages: readonly RegisteredStage[]): void {
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.stage;
        if (!id) continue;
        const stage = stageById.get(id);
        if (!stage) continue;
        if (entry.isIntersecting) {
          stage.start();
        } else {
          stage.stop();
        }
      }
    },
    { threshold: 0.35 },
  );

  for (const stage of stages) {
    const section = document.querySelector<HTMLElement>(`[data-stage="${stage.id}"]`);
    if (section) observer.observe(section);
  }
}
