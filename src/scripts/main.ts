import { createStageManager } from "../game/stage-manager";
import { STAGES } from "../game/stages";

const canvas = document.getElementById("game-canvas");
const nav = document.querySelector(".stage-progress");
const hud = document.getElementById("hud");
const nextButton = document.getElementById("next-stage-button");

if (!(canvas instanceof HTMLCanvasElement)) throw new Error("#game-canvas is missing from the page");
if (!(nav instanceof HTMLElement)) throw new Error(".stage-progress nav is missing from the page");
if (!(hud instanceof HTMLElement)) throw new Error("#hud is missing from the page");
if (!(nextButton instanceof HTMLButtonElement)) throw new Error("#next-stage-button is missing from the page");

createStageManager({ canvas, nav, hud, nextButton }, STAGES).start();
