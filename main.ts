import { mountCanvasHost } from "./src/ui/canvas-host";
import { mountColorControls } from "./src/ui/controls/color-controls";
import { mountLightingControls } from "./src/ui/controls/lighting-controls";
import { mountPrimitiveFillToggles } from "./src/ui/controls/primitive-fill-toggles";
import { mountMeshList } from "./src/ui/controls/mesh-list";
import { mountProjectionControls } from "./src/ui/controls/projection-controls";
import { mountVertexTable } from "./src/ui/controls/vertex-table";
import { mountViewControls } from "./src/ui/controls/view-controls";
import { mountRenderLoop } from "./src/ui/render-loop";
import { mountStagePanels } from "./src/ui/stage-panel";
import { createInitialState } from "./src/state/scene";
import { createStore } from "./src/state/store";

const store = createStore(createInitialState());

const canvas = document.querySelector<HTMLCanvasElement>("#scene-canvas");
if (!canvas) throw new Error("main: #scene-canvas not found");

const host = mountCanvasHost(canvas, store);
mountRenderLoop(host, store);
mountStagePanels(document, store);
mountVertexTable(document, store);
mountPrimitiveFillToggles(document, store);
mountProjectionControls(document, store);
mountViewControls(document, store);
mountMeshList(document, store);
mountColorControls(document, store);
mountLightingControls(document, store);
