export const PERIODS = ['1h', '3h', '12h', '1d', '7d', '30d'] as const;
export type Period = (typeof PERIODS)[number];

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

export function formatHistoryTick(iso: string, period: Period): string {
  if (period === '7d' || period === '30d') {
    return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
  }
  return hhmm(iso);
}
