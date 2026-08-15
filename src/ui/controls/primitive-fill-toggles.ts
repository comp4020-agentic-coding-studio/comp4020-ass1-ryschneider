import { setFillMode, setPrimitiveMode } from "../../state/actions";
import type { FillMode, PrimitiveMode } from "../../state/scene";
import type { Store } from "../../state/store";
import { mountButtonGroup } from "./button-group";

/** Wires the stage-1 primitive-mode and fill-mode button groups: global, persistent controls. */
export function mountPrimitiveFillToggles(root: ParentNode, store: Store): void {
  const primitiveGroup = mountButtonGroup<PrimitiveMode>(root, '[data-group="primitive"]', (value) =>
    setPrimitiveMode(store, value),
  );
  const fillGroup = mountButtonGroup<FillMode>(root, '[data-group="fill"]', (value) => setFillMode(store, value));

  function render(): void {
    const { primitive, fill } = store.get();
    primitiveGroup.sync(primitive);
    fillGroup.sync(fill);
  }

  store.subscribe(render);
  render();
}
