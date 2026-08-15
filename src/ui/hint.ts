/**
 * A small "?" badge that reveals `text` in a shared tooltip appended
 * directly to `<body>`, positioned via `getBoundingClientRect` rather than
 * CSS `position: absolute` nested inside the icon. The stage panel
 * (`.stage-panels`) scrolls vertically, and setting `overflow-y` on an
 * element forces the browser to also clip `overflow-x` (there's no way to
 * scroll one axis while leaving the other visible) -- so a tooltip
 * positioned as a descendant of that panel gets clipped the moment it
 * needs to spill past the panel's edge onto the canvas. Living at the body
 * level sidesteps that ancestor entirely. Shown on hover/focus of the
 * icon's containing label/legend/paragraph (via delegated listeners), so
 * hovering anywhere in that container -- not just the icon -- shows it
 * immediately, with no OS-native hover delay. `aria-label` stays on the
 * icon so screen readers get the text on focus regardless of the visual
 * tooltip.
 */

const HINT_CONTAINER_SELECTOR = "label, legend, p";
const VIEWPORT_MARGIN = 4;

let tooltipEl: HTMLElement | null = null;
let delegationInstalled = false;

function getTooltip(): HTMLElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement("span");
    tooltipEl.className = "hint-tooltip";
    tooltipEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function showTooltip(icon: HTMLElement): void {
  const text = icon.dataset.hint;
  if (!text) return;
  const tooltip = getTooltip();
  tooltip.textContent = text;
  tooltip.classList.add("hint-tooltip-visible");

  const iconRect = icon.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const left = Math.min(
    Math.max(VIEWPORT_MARGIN, iconRect.left + iconRect.width / 2 - tooltipRect.width / 2),
    window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN,
  );
  const above = iconRect.top - tooltipRect.height - 8;
  const maxTop = window.innerHeight - tooltipRect.height - VIEWPORT_MARGIN;
  const fitsAbove = above >= VIEWPORT_MARGIN;
  const top = Math.min(Math.max(VIEWPORT_MARGIN, fitsAbove ? above : iconRect.bottom + 8), maxTop);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTooltip(): void {
  tooltipEl?.classList.remove("hint-tooltip-visible");
}

function findIcon(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const container = target.closest(HINT_CONTAINER_SELECTOR);
  return container?.querySelector<HTMLElement>(".hint-icon[data-hint]") ?? null;
}

function isWithinSameContainer(target: EventTarget | null, related: EventTarget | null): boolean {
  if (!(target instanceof Element) || !(related instanceof Node)) return false;
  const container = target.closest(HINT_CONTAINER_SELECTOR);
  return container ? container.contains(related) : false;
}

function handleEnter(event: Event): void {
  const icon = findIcon(event.target);
  if (icon) showTooltip(icon);
}

function handleLeave(event: FocusEvent | PointerEvent): void {
  const related = "relatedTarget" in event ? event.relatedTarget : null;
  if (isWithinSameContainer(event.target, related)) return;
  hideTooltip();
}

function ensureDelegation(): void {
  if (delegationInstalled) return;
  delegationInstalled = true;
  document.addEventListener("pointerover", handleEnter);
  document.addEventListener("pointerout", handleLeave);
  document.addEventListener("focusin", handleEnter);
  document.addEventListener("focusout", handleLeave);
}

export function createHintIcon(text: string): HTMLElement {
  ensureDelegation();
  const icon = document.createElement("span");
  icon.className = "hint-icon";
  icon.textContent = "?";
  icon.tabIndex = 0;
  icon.setAttribute("aria-label", text);
  icon.dataset.hint = text;
  return icon;
}

/**
 * index.html has several hand-written `.hint-icon` spans using the native
 * `title` attribute (the old mechanism). Converts each to the same
 * `data-hint` convention `createHintIcon` uses, so every hint icon --
 * static markup or JS-mounted -- gets identical instant, hover-anywhere,
 * unclipped tooltip behavior from the one shared tooltip element.
 */
export function enhanceStaticHintIcons(root: ParentNode): void {
  ensureDelegation();
  for (const icon of root.querySelectorAll<HTMLElement>(".hint-icon[title]")) {
    const text = icon.getAttribute("title");
    if (!text) continue;
    icon.removeAttribute("title");
    icon.setAttribute("aria-label", text);
    icon.dataset.hint = text;
  }
}
