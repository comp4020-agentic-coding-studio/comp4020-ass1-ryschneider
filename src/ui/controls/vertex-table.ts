import { addTableRow, removeTableRow, setTableRow } from "../../state/actions";
import type { Store } from "../../state/store";

/** Renders `state.tableRows` into the `data-vertex-rows` tbody and wires edits back to actions.ts. */
export function mountVertexTable(root: ParentNode, store: Store): void {
  const tbodyEl = root.querySelector<HTMLTableSectionElement>("[data-vertex-rows]");
  const addButton = root.querySelector<HTMLButtonElement>('[data-action="add-row"]');
  if (!tbodyEl || !addButton) throw new Error("vertex-table: expected markup not found");
  const tbody: HTMLTableSectionElement = tbodyEl;

  addButton.addEventListener("click", () => addTableRow(store));

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

        const removeTd = document.createElement("td");
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Remove";
        removeButton.disabled = tableRows.length <= 1;
        removeButton.addEventListener("click", () => removeTableRow(store, row.id));
        removeTd.append(removeButton);
        tr.append(removeTd);

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
