export function normalizeCnpj(v: string): string {
  return v.replace(/\D/g, '');
}
