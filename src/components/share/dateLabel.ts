const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Short local date such as "Wed, 25 Nov". Gives "Today" if the date cannot be read. */
export function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  if (typeof iso !== "string" || Number.isNaN(d.getTime())) return "Today";
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
