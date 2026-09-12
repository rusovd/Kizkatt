import { describe, expect, it } from "vitest";

import { createBoundedWeakCache } from "./boundedWeakCache";

describe("bounded weak cache", () => {
  it("retains only the most recently used entries", () => {
    const cache = createBoundedWeakCache<object, string>(2);
    const first = {};
    const second = {};
    const third = {};

    cache.set(first, "first");
    cache.set(second, "second");
    expect(cache.get(first)).toBe("first");

    cache.set(third, "third");

    expect(cache.get(first)).toBe("first");
    expect(cache.get(second)).toBeUndefined();
    expect(cache.get(third)).toBe("third");
  });
});
