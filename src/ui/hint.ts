/**
 * A small "?" badge that reveals `text` in a custom tooltip. The tooltip
 * itself is revealed by CSS `:hover`/`:focus-within` on the icon's
 * containing label/legend/paragraph (see styles.css), so hovering anywhere
 * in that container -- not just the icon -- shows it immediately, with no
 * OS-native hover delay. `aria-label` stays on the icon so screen readers
 * get the text on focus regardless of the visual tooltip.
 */
export function createHintIcon(text: string): HTMLElement {
  const icon = document.createElement("span");
  icon.className = "hint-icon";
  icon.textContent = "?";
  icon.tabIndex = 0;
  icon.setAttribute("aria-label", text);

  const tooltip = document.createElement("span");
  tooltip.className = "hint-tooltip";
  tooltip.textContent = text;
  tooltip.setAttribute("aria-hidden", "true");
  icon.appendChild(tooltip);

  return icon;
}

/**
 * index.html has several hand-written `.hint-icon` spans using the native
 * `title` attribute (the old mechanism). Converts each to the same
 * tooltip-span structure `createHintIcon` builds, so every hint icon --
 * static markup or JS-mounted -- gets identical instant, hover-anywhere
 * behavior from one CSS rule set.
 */
export function enhanceStaticHintIcons(root: ParentNode): void {
  for (const icon of root.querySelectorAll<HTMLElement>(".hint-icon[title]")) {
    const text = icon.getAttribute("title");
    if (!text) continue;
    icon.removeAttribute("title");
    icon.setAttribute("aria-label", text);

    const tooltip = document.createElement("span");
    tooltip.className = "hint-tooltip";
    tooltip.textContent = text;
    tooltip.setAttribute("aria-hidden", "true");
    icon.appendChild(tooltip);
  }
}
