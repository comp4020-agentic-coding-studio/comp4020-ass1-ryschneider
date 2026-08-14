import { setFillMode, setPrimitiveMode } from "../../state/actions";
import type { FillMode, PrimitiveMode } from "../../state/scene";
import type { Store } from "../../state/store";

/** Wires the stage-1 primitive-mode and fill-mode radio fieldsets — global, persistent controls. */
export function mountPrimitiveFillToggles(root: ParentNode, store: Store): void {
  const primitiveInputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="primitive"]'));
  const fillInputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="fill"]'));

  for (const input of primitiveInputs) {
    input.addEventListener("change", () => {
      if (input.checked) setPrimitiveMode(store, input.value as PrimitiveMode);
    });
  }

  for (const input of fillInputs) {
    input.addEventListener("change", () => {
      if (input.checked) setFillMode(store, input.value as FillMode);
    });
  }

  function render(): void {
    const { primitive, fill } = store.get();
    for (const input of primitiveInputs) input.checked = input.value === primitive;
    for (const input of fillInputs) input.checked = input.value === fill;
  }

  store.subscribe(render);
  render();
}
