import { formatKobo } from '../domain-ui/money';

type Kobo = Parameters<typeof formatKobo>[0];

/** Drop ".00" when there are no kobo cents. Use for display only — never for input fields. */
export function formatDisplay(kobo: Kobo): string {
  const full = formatKobo(kobo);
  return (kobo as number) % 100 === 0 ? full.slice(0, -3) : full;
}

/** Like formatSignedKobo but drops ".00" from the amount — display only. */
export function formatSignedDisplay(kobo: number): string {
  if (kobo < 0) return 'Loss: ' + formatDisplay(Math.abs(kobo) as Kobo);
  return 'Profit: ' + formatDisplay(kobo as Kobo);
}
