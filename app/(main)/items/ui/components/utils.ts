export function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0];
}
