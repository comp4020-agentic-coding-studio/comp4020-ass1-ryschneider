import { init as initModel } from "./stages/model";
import { init as initProjection } from "./stages/projection-stage";
import { init as initRasterize } from "./stages/rasterize-stage";
import { init as initShading } from "./stages/shading";
import { init as initView } from "./stages/view";
import { init as initWorld } from "./stages/world";
import { initScrollController } from "./scroll-controller";

const stages = [initModel(), initWorld(), initView(), initProjection(), initRasterize(), initShading()].filter(
  (stage) => stage !== null,
);

initScrollController(stages);
