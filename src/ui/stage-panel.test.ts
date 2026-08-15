import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { createInitialState } from "../state/scene";
import { createStore } from "../state/store";
import { mountStagePanels } from "./stage-panel";

function stageMarkup(stage: number): string {
  return `
    <section class="stage" data-stage="${stage}">
      <details data-stage-details="${stage}">
        <summary>Stage ${stage}</summary>
        <div class="stage-body"></div>
      </details>
    </section>
  `;
}

describe("mountStagePanels: strict accordion", () => {
  it("closes every other stage's <details> synchronously when a summary is clicked, before the native toggle applies", () => {
    const dom = new JSDOM(`<main>${stageMarkup(1)}${stageMarkup(2)}${stageMarkup(3)}</main>`);
    const { document } = dom.window;
    const root = document.querySelector("main") as ParentNode;
    const state = createInitialState();
    state.progress.revealed = [true, true, true];
    const store = createStore(state);
    mountStagePanels(root, store);

    const details1 = document.querySelector('details[data-stage-details="1"]') as HTMLDetailsElement;
    const details2 = document.querySelector('details[data-stage-details="2"]') as HTMLDetailsElement;
    const details3 = document.querySelector('details[data-stage-details="3"]') as HTMLDetailsElement;
    const summary2 = details2.querySelector("summary") as HTMLElement;

    details1.open = true;
    details3.open = true;

    summary2.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(details1.open).toBe(false);
    expect(details3.open).toBe(false);
  });

  it("does not force-open a newly revealed stage", () => {
    const dom = new JSDOM(`<main>${stageMarkup(1)}${stageMarkup(2)}</main>`);
    const { document } = dom.window;
    const root = document.querySelector("main") as ParentNode;
    const state = createInitialState();
    state.progress.revealed = [true, false];
    const store = createStore(state);
    mountStagePanels(root, store);

    const stage2Details = document.querySelector('details[data-stage-details="2"]') as HTMLDetailsElement;
    expect(stage2Details.open).toBe(false);

    store.update((s) => ({ ...s, progress: { revealed: [true, true] } }));

    const stage2Section = document.querySelector<HTMLElement>('section[data-stage="2"]')!;
    expect(stage2Section.hidden).toBe(false);
    expect(stage2Details.open).toBe(false);
  });
});
