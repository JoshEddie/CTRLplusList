export function chipClasses({ extra }: { extra?: string } = {}): string {
  return ['chip', extra].filter(Boolean).join(' ');
}
