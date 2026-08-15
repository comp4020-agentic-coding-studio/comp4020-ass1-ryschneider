import { setLightParam, setLightingRate, setMaterialParam } from "../../state/actions";
import type { LightingRate } from "../../state/scene";
import type { Store } from "../../state/store";
import { mountButtonGroup } from "./button-group";
import { bindRangeField } from "./range-field";

/** Wires stage 6 (ambient/diffuse, light position, per-vertex/per-pixel rate) and stage 7 (specular/shininess). */
export function mountLightingControls(root: ParentNode, store: Store): void {
  const ambientInput = root.querySelector<HTMLInputElement>('[data-field="ambient"]');
  const diffuseInput = root.querySelector<HTMLInputElement>('[data-field="diffuse"]');
  const lightAzimuthInput = root.querySelector<HTMLInputElement>('[data-field="lightAzimuthDeg"]');
  const lightElevationInput = root.querySelector<HTMLInputElement>('[data-field="lightElevationDeg"]');
  const lightDistanceInput = root.querySelector<HTMLInputElement>('[data-field="lightDistance"]');
  const rateGroup = mountButtonGroup<LightingRate>(root, '[data-group="lighting-rate"]', (value) =>
    setLightingRate(store, value),
  );
  const engageIndicator = root.querySelector<HTMLElement>('[data-testid="material-engage-indicator"]');
  const specularInput = root.querySelector<HTMLInputElement>('[data-field="specular"]');
  const shininessInput = root.querySelector<HTMLInputElement>('[data-field="shininess"]');

  if (!ambientInput || !diffuseInput || !lightAzimuthInput || !lightElevationInput || !lightDistanceInput || !engageIndicator) {
    throw new Error("lighting-controls: expected stage-6 markup not found");
  }
  if (!specularInput || !shininessInput) {
    throw new Error("lighting-controls: expected stage-7 markup not found");
  }
  const ambient: HTMLInputElement = ambientInput;
  const diffuse: HTMLInputElement = diffuseInput;
  const lightAzimuth: HTMLInputElement = lightAzimuthInput;
  const lightElevation: HTMLInputElement = lightElevationInput;
  const lightDistance: HTMLInputElement = lightDistanceInput;
  const indicator: HTMLElement = engageIndicator;
  const specular: HTMLInputElement = specularInput;
  const shininess: HTMLInputElement = shininessInput;

  const ambientField = bindRangeField(ambient, { hint: "Ambient light contribution", formatValue: (v) => v.toFixed(2) });
  const diffuseField = bindRangeField(diffuse, { hint: "Diffuse light contribution", formatValue: (v) => v.toFixed(2) });
  const lightAzimuthField = bindRangeField(lightAzimuth, { hint: "Light azimuth", formatValue: (v) => `${v}°` });
  const lightElevationField = bindRangeField(lightElevation, { hint: "Light elevation", formatValue: (v) => `${v}°` });
  const lightDistanceField = bindRangeField(lightDistance, {
    hint: "Distance of the light from the origin",
    formatValue: (v) => v.toFixed(0),
  });
  const specularField = bindRangeField(specular, { hint: "Specular light contribution", formatValue: (v) => v.toFixed(2) });
  const shininessField = bindRangeField(shininess, { hint: "Specular highlight tightness", formatValue: (v) => v.toFixed(0) });

  ambient.addEventListener("input", () => setMaterialParam(store, { ambient: Number(ambient.value) }));
  diffuse.addEventListener("input", () => setMaterialParam(store, { diffuse: Number(diffuse.value) }));
  lightAzimuth.addEventListener("input", () => setLightParam(store, { azimuthDeg: Number(lightAzimuth.value) }));
  lightElevation.addEventListener("input", () => setLightParam(store, { elevationDeg: Number(lightElevation.value) }));
  lightDistance.addEventListener("input", () => setLightParam(store, { distance: Number(lightDistance.value) }));
  specular.addEventListener("input", () => setMaterialParam(store, { specular: Number(specular.value) }));
  shininess.addEventListener("input", () => setMaterialParam(store, { shininess: Number(shininess.value) }));

  function render(): void {
    const { material, light, lightingRate } = store.get();
    if (document.activeElement !== ambient) ambient.value = String(material.ambient);
    ambientField.sync(material.ambient);
    if (document.activeElement !== diffuse) diffuse.value = String(material.diffuse);
    diffuseField.sync(material.diffuse);
    if (document.activeElement !== lightAzimuth) lightAzimuth.value = String(light.azimuthDeg);
    lightAzimuthField.sync(light.azimuthDeg);
    if (document.activeElement !== lightElevation) lightElevation.value = String(light.elevationDeg);
    lightElevationField.sync(light.elevationDeg);
    if (document.activeElement !== lightDistance) lightDistance.value = String(light.distance);
    lightDistanceField.sync(light.distance);
    if (document.activeElement !== specular) specular.value = String(material.specular);
    specularField.sync(material.specular);
    if (document.activeElement !== shininess) shininess.value = String(material.shininess);
    shininessField.sync(material.shininess);
    rateGroup.sync(lightingRate);
    indicator.textContent = material.enabled
      ? "Lighting: on (ambient + diffuse" + (material.specular > 0 ? " + specular" : "") + ")"
      : "Lighting: off (raw vertex colors)";
  }

  store.subscribe(render);
  render();
}
