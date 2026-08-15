import type { Store } from "../state/store";

/**
 * Unhides `<section data-stage="n">` the first time `progress.revealed[n-1]`
 * flips true. Strict accordion: opening any stage's `<details>` closes every
 * other stage's `<details>`, unconditionally -- at most one stage is ever
 * open at a time.
 */
export function mountStagePanels(root: ParentNode, store: Store): void {
  const sections = Array.from(root.querySelectorAll<HTMLElement>("section.stage[data-stage]"));
  const detailsList = sections
    .map((section) => section.querySelector<HTMLDetailsElement>(`details[data-stage-details="${section.dataset.stage}"]`))
    .filter((details): details is HTMLDetailsElement => details !== null);

  for (const details of detailsList) {
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      for (const other of detailsList) {
        if (other !== details) other.open = false;
      }
    });
  }

  function render(): void {
    const { revealed } = store.get().progress;

    for (const section of sections) {
      const stageNumber = Number(section.dataset.stage);
      const index = stageNumber - 1;
      section.hidden = !(revealed[index] ?? false);
    }
  }

  store.subscribe(render);
  render();
}
