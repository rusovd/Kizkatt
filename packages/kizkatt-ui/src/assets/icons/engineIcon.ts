export const KIZKATT_ENGINE_ICON_URL = new URL(
  "./kizkatt-engine-icon.png",
  import.meta.url
).href;

export function getKizkattEngineIconUrl() {
  return KIZKATT_ENGINE_ICON_URL;
}
