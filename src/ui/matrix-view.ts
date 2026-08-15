import type { Mat4 } from "../lib/raster/mat4";
import type { Store } from "../state/store";

const PULSE_MS = 400;

function formatCell(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "n/a";
}

/**
 * Mounts a 4x4 column-major matrix grid into `mount`, re-reading
 * `matrixSource()` on every store update and briefly highlighting any cell
 * whose value changed (skipped under prefers-reduced-motion, where the
 * highlight is a static color instead of a timed pulse).
 */
export function mountMatrixView(mount: HTMLElement, store: Store, matrixSource: () => Mat4, label: string): void {
  mount.innerHTML = "";
  const table = document.createElement("table");
  table.setAttribute("aria-label", label);
  table.classList.add("matrix-grid");

  const cells: HTMLTableCellElement[] = [];
  for (let row = 0; row < 4; row++) {
    const tr = document.createElement("tr");
    for (let col = 0; col < 4; col++) {
      const td = document.createElement("td");
      const index = col * 4 + row;
      cells[index] = td;
      tr.append(td);
    }
    table.append(tr);
  }
  mount.append(table);

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let previous: Mat4 | null = null;

  function render(): void {
    const matrix = matrixSource();
    for (let i = 0; i < 16; i++) {
      const value = matrix[i] ?? 0;
      const cell = cells[i];
      if (!cell) continue;
      cell.textContent = formatCell(value);
      cell.title = String(value);

      const changed = previous !== null && previous[i] !== value;
      if (changed) {
        cell.classList.add("cell-changed");
        if (!prefersReducedMotion) {
          setTimeout(() => cell.classList.remove("cell-changed"), PULSE_MS);
        }
      } else if (prefersReducedMotion) {
        cell.classList.remove("cell-changed");
      }
    }
    previous = matrix;
  }

  store.subscribe(render);
  render();
}
