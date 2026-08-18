import { describe, expect, it } from "vitest";

import {
  getKizkattEngineIconUrl,
  KIZKATT_ENGINE_ICON_URL
} from "kizkatt-graphic-engine";
import { installPageIcon } from "./installPageIcon";

describe("installPageIcon", () => {
  it("uses the icon exposed by the graphic engine", () => {
    const page = document.implementation.createHTMLDocument("Kizkatt");
    const icon = installPageIcon(page);

    expect(getKizkattEngineIconUrl()).toBe(KIZKATT_ENGINE_ICON_URL);
    expect(icon.href).toBe(KIZKATT_ENGINE_ICON_URL);
    expect(icon.rel).toBe("icon");
    expect(icon.sizes).toBe("512x512");
    expect(icon.type).toBe("image/png");
    expect(page.head.querySelectorAll('link[rel~="icon"]')).toHaveLength(1);
  });

  it("updates an existing favicon instead of adding a duplicate", () => {
    const page = document.implementation.createHTMLDocument("Kizkatt");
    const existingIcon = page.createElement("link");
    existingIcon.rel = "icon";
    existingIcon.href = "/old-icon.png";
    page.head.append(existingIcon);

    expect(installPageIcon(page)).toBe(existingIcon);
    expect(page.head.querySelectorAll('link[rel~="icon"]')).toHaveLength(1);
    expect(existingIcon.href).toBe(KIZKATT_ENGINE_ICON_URL);
  });
});
