export interface RangeFieldOptions {
  /** Formats the live readout text. Defaults to `String(value)`. */
  formatValue?: (value: number) => string;
  /** Tooltip text shown on hover, via the input's `title` attribute. */
  hint?: string;
}

/**
 * Adds a live `<output>` readout after a range input and, if given, a hover
 * tooltip. The readout listens to the input's own `"input"` event, so it
 * stays in sync even when the caller's `render()` hasn't run yet; `sync` lets
 * `render()` also push authoritative state-driven values (e.g. after a reset).
 */
export function bindRangeField(input: HTMLInputElement, options?: RangeFieldOptions): { sync: (value: number) => void } {
  const formatValue = options?.formatValue ?? ((value: number) => String(value));
  if (options?.hint) input.title = options.hint;

  const output = document.createElement("output");
  output.className = "range-field-output";

  function update(value: number): void {
    output.textContent = formatValue(value);
  }

  input.insertAdjacentElement("afterend", output);
  input.addEventListener("input", () => update(Number(input.value)));
  update(Number(input.value));

  return { sync: update };
}
