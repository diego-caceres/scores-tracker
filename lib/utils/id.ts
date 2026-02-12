export function createId(prefix = 'id'): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${randomPart}`;
}
