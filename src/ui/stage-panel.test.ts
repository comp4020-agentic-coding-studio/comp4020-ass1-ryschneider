import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { createStore } from "../state/store";
import { createInitialState } from "../state/scene";
import { mountStagePanels } from "./stage-panel";

function stageMarkup(stage: number, open: boolean): string {
  return `
    <section class="stage" data-stage="${stage}">
      <details data-stage-details="${stage}" ${open ? "open" : ""}>
        <summary>Stage ${stage}</summary>
        <div>body</div>
      </details>
    </section>
  `;
}

function mountThreeStages() {
  const dom = new JSDOM(
    `<main>${stageMarkup(1, true)}${stageMarkup(2, false)}${stageMarkup(3, false)}</main>`,
  );
  const root = dom.window.document.body;
  const state = createInitialState();
  state.progress.revealed = [true, true, true, false, false, false, false];
  const store = createStore(state);
  mountStagePanels(root, store);
  const details = (n: number) => root.querySelector<HTMLDetailsElement>(`details[data-stage-details="${n}"]`)!;
  return { details };
}

describe("stage-panel: strict accordion", () => {
  it("closes every other stage when one is opened", () => {
    const { details } = mountThreeStages();
    expect(details(1).open).toBe(true);

    details(2).open = true;
    details(2).dispatchEvent(new (details(2).ownerDocument.defaultView as unknown as { Event: typeof Event }).Event("toggle"));

    expect(details(1).open).toBe(false);
    expect(details(2).open).toBe(true);
    expect(details(3).open).toBe(false);
  });

  it("does not force-open a newly revealed stage", () => {
    const dom = new JSDOM(`<main>${stageMarkup(1, true)}${stageMarkup(2, false)}</main>`);
    const root = dom.window.document.body;
    const state = createInitialState();
    state.progress.revealed = [true, false, false, false, false, false, false];
    const store = createStore(state);
    mountStagePanels(root, store);

    const stage2Details = root.querySelector<HTMLDetailsElement>('details[data-stage-details="2"]')!;
    expect(stage2Details.open).toBe(false);

    store.update((s) => ({ ...s, progress: { revealed: [true, true, false, false, false, false, false] } }));

    const stage2Section = root.querySelector<HTMLElement>('section[data-stage="2"]')!;
    expect(stage2Section.hidden).toBe(false);
    expect(stage2Details.open).toBe(false);
  });
});
