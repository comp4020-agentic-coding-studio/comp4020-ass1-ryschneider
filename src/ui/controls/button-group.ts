/**
 * Wires a group of `<button data-value="...">` elements (inside an element
 * matched by `groupSelector`) as a mutually-exclusive toggle, using the same
 * `aria-pressed` highlight convention already used elsewhere (e.g. the
 * "Add vertex" armed state). Replaces radio-input fieldsets. Call the
 * returned `sync` from the caller's own `render()`, mirroring `bindRangeField`.
 */
export function mountButtonGroup<T extends string>(
  root: ParentNode,
  groupSelector: string,
  onSelect: (value: T) => void,
): { sync: (value: T) => void } {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(`${groupSelector} button[data-value]`));
  for (const button of buttons) {
    button.addEventListener("click", () => onSelect(button.dataset.value as T));
  }

  function sync(value: T): void {
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.value === value));
  }

  return { sync };
}
