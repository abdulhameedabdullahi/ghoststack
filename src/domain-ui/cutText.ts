/** Cuts text to at most `max` UTF-16 units and never ends on the first half of a surrogate pair. */
export function cutText(text: string, max: number): string {
  if (max <= 0) return "";
  if (text.length <= max) return text;
  const lastKept = text.charCodeAt(max - 1);
  const end = lastKept >= 0xd800 && lastKept <= 0xdbff ? max - 1 : max;
  return text.slice(0, end);
}
