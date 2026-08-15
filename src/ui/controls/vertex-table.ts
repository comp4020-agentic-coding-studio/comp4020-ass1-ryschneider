import { addTableRowAt, clearPreviewVertex, setPreviewVertex, setTableRow } from "../../state/actions";
import { screenFractionToWorldXY } from "../../lib/raster/pipeline";
import type { Store } from "../../state/store";

const ADD_LABEL = "Add vertex";
const PLACING_LABEL = "Click to place";

/**
 * Renders `state.tableRows` into the `data-vertex-rows` tbody and wires edits
 * back to actions.ts. "Add vertex" arms placement mode (crosshair cursor over
 * the canvas) rather than adding at a fixed point; the next canvas click adds
 * a vertex at that normalized 0..1 position and disarms.
 */
export function mountVertexTable(root: ParentNode, store: Store): void {
  const tbodyEl = root.querySelector<HTMLTableSectionElement>("[data-vertex-rows]");
  const addButtonEl = root.querySelector<HTMLButtonElement>('[data-action="add-row"]');
  const canvasEl = root.querySelector<HTMLCanvasElement>("#scene-canvas");
  if (!tbodyEl || !addButtonEl || !canvasEl) throw new Error("vertex-table: expected markup not found");
  const tbody: HTMLTableSectionElement = tbodyEl;
  const addButton: HTMLButtonElement = addButtonEl;
  const canvas: HTMLCanvasElement = canvasEl;

  let placing = false;

  function setPlacing(value: boolean): void {
    placing = value;
    addButton.setAttribute("aria-pressed", String(placing));
    addButton.textContent = placing ? PLACING_LABEL : ADD_LABEL;
    canvas.style.cursor = placing ? "crosshair" : "";
    if (!placing) clearPreviewVertex(store);
  }

  function normalizedPosition(event: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const xFraction = (event.clientX - rect.left) / rect.width;
    const yFraction = (event.clientY - rect.top) / rect.height;
    return screenFractionToWorldXY(store.get(), xFraction, yFraction);
  }

  addButton.addEventListener("click", () => setPlacing(!placing));

  canvas.addEventListener("click", (event) => {
    if (!placing) return;
    const { x, y } = normalizedPosition(event);
    addTableRowAt(store, x, y);
    setPlacing(false);
  });

  // While armed, the in-progress vertex tracks the pointer so the user sees
  // where it will land (and, once 2+ real vertices exist, the preview
  // completes a live triangle/line) before the click that finalizes it.
  canvas.addEventListener("pointermove", (event) => {
    if (!placing) return;
    const { x, y } = normalizedPosition(event);
    setPreviewVertex(store, x, y);
  });

  canvas.addEventListener("pointerleave", () => {
    if (placing) clearPreviewVertex(store);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && placing) setPlacing(false);
  });

  let previousRowIds: string[] = [];

  function render(): void {
    const { tableRows } = store.get();
    const rowIds = tableRows.map((r) => r.id);
    const sameShape = rowIds.length === previousRowIds.length && rowIds.every((id, i) => id === previousRowIds[i]);

    if (!sameShape) {
      tbody.innerHTML = "";
      for (const row of tableRows) {
        const tr = document.createElement("tr");
        tr.dataset.rowId = row.id;

        for (const axis of ["x", "y", "z"] as const) {
          const td = document.createElement("td");
          const input = document.createElement("input");
          input.type = "number";
          input.step = "0.01";
          input.value = String(row[axis]);
          input.setAttribute("aria-label", `Vertex ${axis}`);
          input.addEventListener("input", () => {
            const value = Number(input.value);
            if (Number.isFinite(value)) setTableRow(store, row.id, { [axis]: value });
          });
          td.append(input);
          tr.append(td);
        }

        tbody.append(tr);
      }
      previousRowIds = rowIds;
      return;
    }

    // Same rows, just values changing (e.g. after an edit): sync inputs
    // without rebuilding the DOM, so focus/caret position survives typing.
    for (const row of tableRows) {
      const tr = tbody.querySelector<HTMLTableRowElement>(`tr[data-row-id="${row.id}"]`);
      if (!tr) continue;
      const inputs = tr.querySelectorAll<HTMLInputElement>("input[type=number]");
      const axes = ["x", "y", "z"] as const;
      inputs.forEach((input, i) => {
        const axis = axes[i];
        if (axis && document.activeElement !== input) input.value = String(row[axis]);
      });
    }
  }

  store.subscribe(render);
  render();
}
