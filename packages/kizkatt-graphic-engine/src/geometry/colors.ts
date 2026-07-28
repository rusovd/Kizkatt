export function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}
