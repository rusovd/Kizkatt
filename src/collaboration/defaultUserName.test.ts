import { describe, expect, it } from "vitest";

import { DEFAULT_USER_NAME, getDefaultUserName } from "./defaultUserName";

describe("default user name", () => {
  it("uses a stable placeholder name until user profiles are implemented", () => {
    expect(DEFAULT_USER_NAME).toBe("User");
    expect(getDefaultUserName()).toBe("User");
  });
});
