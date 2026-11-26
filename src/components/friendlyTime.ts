/** Formats an ISO timestamp into a short, human-readable string. Display only. */
export function friendlyTime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  if (sameDay(d, now)) return `Today ${timeStr}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(d, yesterday)) return `Yesterday ${timeStr}`;
  const dateStr = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  return `${dateStr} ${timeStr}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
