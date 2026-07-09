export const colors = {
  bg: '#071510',
  bgMid: '#0C241C',
  bgTop: '#12352A',
  surface: 'rgba(18, 42, 34, 0.88)',
  surfaceSolid: '#122A22',
  surfaceAlt: '#16352B',
  border: 'rgba(105, 240, 174, 0.14)',
  borderStrong: 'rgba(105, 240, 174, 0.28)',
  text: '#F2FBF5',
  textMuted: '#9BB5A8',
  textDim: '#6F8A7C',
  accent: '#6EF0B0',
  accentSoft: '#B8F5D0',
  accentDeep: '#1B5E40',
  warning: '#F0C978',
  danger: '#FF8F7A',
  glow: 'rgba(110, 240, 176, 0.18)',
};

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
};

export const EMOJI_PRESETS = [
  '⚡',
  '🎬',
  '🎮',
  '📱',
  '🏠',
  '🍔',
  '🚗',
  '💊',
  '📚',
  '🎵',
  '💳',
  '🎯',
] as const;

export function formatRp(n: number): string {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

export function formatRpCompact(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `Rp ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}jt`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `Rp ${k % 1 === 0 ? k.toFixed(0) : k.toFixed(0)}rb`;
  }
  return formatRp(n);
}

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function dueLabel(dueDay: number | null): string {
  if (!dueDay) return 'Tanpa jatuh tempo';
  return `Jatuh tempo tgl ${dueDay}`;
}

export function remainderLabel(current: number, target: number): string {
  if (target <= 0) return 'Target belum diset';
  const left = target - current;
  if (left <= 0) return 'Target terpenuhi — siap dikeluarkan';
  return `Kurang ${formatRp(left)} lagi`;
}

export function progressPct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}
