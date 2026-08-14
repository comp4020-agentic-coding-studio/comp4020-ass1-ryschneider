import type { Store } from "../state/store";

/**
 * Unhides `<section data-stage="n">` the first time `progress.revealed[n-1]`
 * flips true, and auto-collapses stage n's `<details>` once stage n+1 first
 * reveals — unless the user has manually toggled that `<details>` themselves,
 * in which case their choice wins and auto-collapse backs off for good.
 */
export function mountStagePanels(root: ParentNode, store: Store): void {
  const sections = Array.from(root.querySelectorAll<HTMLElement>("section.stage[data-stage]"));
  const userToggled = new Set<number>();

  for (const section of sections) {
    const stageNumber = Number(section.dataset.stage);
    const details = section.querySelector<HTMLDetailsElement>(`details[data-stage-details="${stageNumber}"]`);
    details?.addEventListener("toggle", () => userToggled.add(stageNumber));
  }

  let previousRevealed: boolean[] = [];

  function render(): void {
    const { revealed } = store.get().progress;

    for (const section of sections) {
      const stageNumber = Number(section.dataset.stage);
      const index = stageNumber - 1;
      const isRevealed = revealed[index] ?? false;
      section.hidden = !isRevealed;

      const justRevealedNext = revealed[stageNumber] && !previousRevealed[stageNumber];
      if (justRevealedNext && !userToggled.has(stageNumber)) {
        const details = section.querySelector<HTMLDetailsElement>(`details[data-stage-details="${stageNumber}"]`);
        if (details) details.open = false;
      }
    }

    previousRevealed = revealed.slice();
  }

  store.subscribe(render);
  render();
}
