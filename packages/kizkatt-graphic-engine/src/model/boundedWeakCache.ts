export type BoundedWeakCache<Key extends object, Value> = {
  get: (key: Key) => Value | undefined;
  set: (key: Key, value: Value) => void;
};

export function createBoundedWeakCache<Key extends object, Value>(
  maximumSize: number
): BoundedWeakCache<Key, Value> {
  const capacity = Math.max(1, Math.floor(maximumSize));
  const values = new WeakMap<Key, Value>();
  const recentKeys: Key[] = [];

  const touch = (key: Key) => {
    const existingIndex = recentKeys.indexOf(key);

    if (existingIndex >= 0) {
      recentKeys.splice(existingIndex, 1);
    }

    recentKeys.push(key);
    while (recentKeys.length > capacity) {
      const expiredKey = recentKeys.shift();

      if (expiredKey) {
        values.delete(expiredKey);
      }
    }
  };

  return {
    get: (key) => {
      const value = values.get(key);

      if (value !== undefined) {
        touch(key);
      }

      return value;
    },
    set: (key, value) => {
      values.set(key, value);
      touch(key);
    }
  };
}
