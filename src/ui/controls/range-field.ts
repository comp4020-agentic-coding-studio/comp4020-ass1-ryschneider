import { createHintIcon } from "../hint";

export interface RangeFieldOptions {
  /** Formats the live readout text. Defaults to `String(value)`. */
  formatValue?: (value: number) => string;
  /** Tooltip text shown on hover (and, via a visible hint icon, on focus/touch). */
  hint?: string;
}

/**
 * Adds a live `<output>` readout after a range input and, if given, a
 * visible hint icon with a hover/focus tooltip. The readout listens to the
 * input's own `"input"` event, so it stays in sync even when the caller's
 * `render()` hasn't run yet; `sync` lets `render()` also push authoritative
 * state-driven values (e.g. after a reset).
 */
export function bindRangeField(input: HTMLInputElement, options?: RangeFieldOptions): { sync: (value: number) => void } {
  const formatValue = options?.formatValue ?? ((value: number) => String(value));

  const output = document.createElement("output");
  output.className = "range-field-output";

  function update(value: number): void {
    output.textContent = formatValue(value);
  }

  input.insertAdjacentElement("afterend", output);
  if (options?.hint) output.insertAdjacentElement("afterend", createHintIcon(options.hint));
  input.addEventListener("input", () => update(Number(input.value)));
  update(Number(input.value));

  return { sync: update };
}
