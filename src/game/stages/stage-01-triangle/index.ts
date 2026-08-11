import { addTriangle, addVertex, createBufferState, isComplete, triangleCount } from "../../opengl/buffers";
import type { BufferState } from "../../opengl/buffers";
import { triangleIndicesToLineIndices } from "../../opengl/geometry";
import { createProgram } from "../../opengl/shader";
import type { StageContext, StageDefinition } from "../../stage";
import { FRAGMENT_SHADER_SOURCE, VERTEX_SHADER_SOURCE } from "./shaders";
import "./styles.css";

type RenderMode = "solid" | "wireframe" | "points";

const RENDER_MODES: { mode: RenderMode; label: string }[] = [
  { mode: "solid", label: "Solid" },
  { mode: "wireframe", label: "Wireframe" },
  { mode: "points", label: "Points" },
];

function mount(ctx: StageContext): () => void {
  const { gl, canvas, hud, log } = ctx;

  const program = createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
  log.record("gl.createProgram() + link(vertexShader, fragmentShader)");
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const colorLocation = gl.getUniformLocation(program, "u_color");

  const vao = gl.createVertexArray();
  const positionBuffer = gl.createBuffer();
  const triangleIndexBuffer = gl.createBuffer();
  const lineIndexBuffer = gl.createBuffer();

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  log.record("gl.bindVertexArray(vao) — attach positionBuffer to a_position (2 floats/vertex)");

  let state: BufferState = createBufferState();
  let selected: number[] = [];
  let mode: RenderMode = "solid";
  let lineIndexCount = 0;

  function clipFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = 1 - ((clientY - rect.top) / rect.height) * 2;
    return { x, y };
  }

  function syncBuffers(): void {
    const positions = new Float32Array(state.vertices.length * 2);
    state.vertices.forEach((v, i) => {
      positions[i * 2] = v.x;
      positions[i * 2 + 1] = v.y;
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    log.record(`gl.bufferData(ARRAY_BUFFER, ${state.vertices.length} vertices, DYNAMIC_DRAW)`);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(state.indices), gl.DYNAMIC_DRAW);
    log.record(`gl.bufferData(ELEMENT_ARRAY_BUFFER, indices=[${state.indices.join(", ")}])`);

    const lineIndices = triangleIndicesToLineIndices(state.indices);
    lineIndexCount = lineIndices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lineIndices), gl.DYNAMIC_DRAW);
  }

  function render(): void {
    gl.clearColor(0.06, 0.07, 0.09, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    log.record("gl.clear(COLOR_BUFFER_BIT)");

    if (state.vertices.length === 0) return;

    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform4f(colorLocation, 0.49, 0.83, 0.99, 1);

    if (mode === "points") {
      gl.drawArrays(gl.POINTS, 0, state.vertices.length);
      log.record(`gl.drawArrays(POINTS, 0, ${state.vertices.length})`);
    } else if (mode === "wireframe") {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIndexBuffer);
      gl.drawElements(gl.LINES, lineIndexCount, gl.UNSIGNED_SHORT, 0);
      log.record(`gl.drawElements(LINES, ${lineIndexCount}, UNSIGNED_SHORT, 0)`);
    } else {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuffer);
      gl.drawElements(gl.TRIANGLES, state.indices.length, gl.UNSIGNED_SHORT, 0);
      log.record(`gl.drawElements(TRIANGLES, ${state.indices.length}, UNSIGNED_SHORT, 0)`);
    }
  }

  function setState(next: BufferState): void {
    state = next;
    syncBuffers();
    renderHud();
    render();
    ctx.setComplete(isComplete(state));
  }

  function onCanvasClick(event: MouseEvent): void {
    const { x, y } = clipFromClient(event.clientX, event.clientY);
    setState(addVertex(state, x, y));
  }

  function toggleSelected(index: number): void {
    if (selected.includes(index)) {
      selected = selected.filter((i) => i !== index);
    } else if (selected.length < 3) {
      selected = [...selected, index];
    }
    renderHud();
  }

  function addSelectedTriangle(): void {
    if (selected.length !== 3) return;
    const [a, b, c] = selected;
    selected = [];
    setState(addTriangle(state, a, b, c));
  }

  function resetAll(): void {
    selected = [];
    setState(createBufferState());
  }

  function onResize(): void {
    render();
  }

  const root = document.createElement("div");
  root.dataset.stageId = "stage-01-triangle";
  root.className = "hud-panel stage-01";
  hud.append(root);

  const vertexListEl = document.createElement("div");
  const indexListEl = document.createElement("div");
  const modeControlsEl = document.createElement("div");
  const logEl = document.createElement("div");

  function renderHud(): void {
    root.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = "Stage 1 — Vertex & Index Buffers";
    root.append(heading);

    const instructions = document.createElement("p");
    instructions.className = "stage-01-hint";
    instructions.textContent = "Click the canvas to add a vertex. Select three vertices below, in any order, to add a triangle.";
    root.append(instructions);

    modeControlsEl.className = "segmented";
    modeControlsEl.replaceChildren();
    const modeGroupLabel = document.createElement("span");
    modeGroupLabel.className = "field-label";
    modeGroupLabel.textContent = "Render mode";
    root.append(modeGroupLabel);
    for (const { mode: candidate, label } of RENDER_MODES) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-pressed", String(candidate === mode));
      button.addEventListener("click", () => {
        mode = candidate;
        renderHud();
        render();
      });
      modeControlsEl.append(button);
    }
    root.append(modeControlsEl);

    const vertexHeading = document.createElement("h3");
    vertexHeading.textContent = `Vertex buffer (${state.vertices.length})`;
    root.append(vertexHeading);

    vertexListEl.className = "pip-list";
    vertexListEl.replaceChildren();
    state.vertices.forEach((v, i) => {
      const pip = document.createElement("button");
      pip.type = "button";
      pip.className = "stage-pip";
      pip.textContent = `v${i}`;
      pip.title = `(${v.x.toFixed(2)}, ${v.y.toFixed(2)})`;
      pip.setAttribute("aria-pressed", String(selected.includes(i)));
      pip.addEventListener("click", () => toggleSelected(i));
      vertexListEl.append(pip);
    });
    root.append(vertexListEl);

    const addTriangleButton = document.createElement("button");
    addTriangleButton.type = "button";
    addTriangleButton.className = "stage-01-add-triangle";
    addTriangleButton.textContent = `Add triangle (${selected.length}/3 selected)`;
    addTriangleButton.disabled = selected.length !== 3;
    addTriangleButton.addEventListener("click", addSelectedTriangle);
    root.append(addTriangleButton);

    const indexHeading = document.createElement("h3");
    indexHeading.textContent = `Index buffer — ${triangleCount(state)} triangle(s)`;
    root.append(indexHeading);

    indexListEl.className = "index-list";
    indexListEl.replaceChildren();
    for (let t = 0; t + 2 < state.indices.length; t += 3) {
      const item = document.createElement("div");
      item.textContent = `triangle ${t / 3}: (${state.indices[t]}, ${state.indices[t + 1]}, ${state.indices[t + 2]})`;
      indexListEl.append(item);
    }
    root.append(indexListEl);

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "stage-01-reset";
    resetButton.textContent = "Reset";
    resetButton.addEventListener("click", resetAll);
    root.append(resetButton);

    const logHeading = document.createElement("h3");
    logHeading.textContent = "OpenGL calls";
    root.append(logHeading);

    logEl.className = "call-log";
    root.append(logEl);
    renderLog();
  }

  function renderLog(): void {
    logEl.replaceChildren();
    for (const entry of log.entries.slice(-8)) {
      const line = document.createElement("div");
      line.textContent = entry.message;
      logEl.append(line);
    }
  }

  const unsubscribeLog = log.subscribe(renderLog);
  canvas.addEventListener("click", onCanvasClick);
  window.addEventListener("resize", onResize);

  syncBuffers();
  renderHud();
  render();
  ctx.setComplete(isComplete(state));

  return () => {
    canvas.removeEventListener("click", onCanvasClick);
    window.removeEventListener("resize", onResize);
    unsubscribeLog();
    gl.deleteBuffer(positionBuffer);
    gl.deleteBuffer(triangleIndexBuffer);
    gl.deleteBuffer(lineIndexBuffer);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
  };
}

export const stage01Triangle: StageDefinition = {
  id: "stage-01-triangle",
  title: "A Single Triangle",
  mount,
};
