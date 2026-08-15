/** A small "?" badge that reveals `text` as a native tooltip on hover/focus. */
export function createHintIcon(text: string): HTMLElement {
  const icon = document.createElement("span");
  icon.className = "hint-icon";
  icon.textContent = "?";
  icon.title = text;
  icon.tabIndex = 0;
  icon.setAttribute("aria-label", text);
  return icon;
}
