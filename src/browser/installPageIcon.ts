import { getKizkattEngineIconUrl } from "kizkatt-graphic-engine";

export function installPageIcon(documentRef: Document = document) {
  const existingIcon = documentRef.head.querySelector<HTMLLinkElement>(
    'link[rel~="icon"]'
  );
  const icon = existingIcon ?? documentRef.createElement("link");

  icon.href = getKizkattEngineIconUrl();
  icon.rel = "icon";
  icon.sizes = "512x512";
  icon.type = "image/png";

  if (!existingIcon) {
    documentRef.head.append(icon);
  }

  return icon;
}
