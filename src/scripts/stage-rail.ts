/**
 * Highlights the current stage in the dot rail as the visitor scrolls. Deliberately its own
 * observer, separate from `scroll-controller.ts` (which starts/stops render loops) — the two
 * concerns don't need to share state, and this keeps the tested render-loop controller untouched.
 */
export function initStageRail(stageIds: readonly string[]): void {
  const links = new Map<string, HTMLAnchorElement>();
  for (const id of stageIds) {
    const link = document.querySelector<HTMLAnchorElement>(`.stage-rail a[href="#${id}"]`);
    if (link) links.set(id, link);
  }
  if (links.size === 0) return;

  const sections = stageIds
    .map((id) => document.querySelector<HTMLElement>(`[data-stage="${id}"]`))
    .filter((section): section is HTMLElement => section !== null);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = entry.target.getAttribute("data-stage");
        if (!id) continue;
        const link = links.get(id);
        if (!link) continue;
        for (const other of links.values()) other.removeAttribute("aria-current");
        link.setAttribute("aria-current", "true");
      }
    },
    { threshold: 0.5 },
  );

  for (const section of sections) observer.observe(section);
}
