/** Thirteen monthly samples, with day clamping instead of Date's end-of-month rollover. */
export function yearDates(start: number): number[] {
  const d = new Date(start);
  return Array.from({ length: 13 }, (_, i) => {
    const month = d.getUTCMonth() + i, year = d.getUTCFullYear();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return Date.UTC(year, month, Math.min(d.getUTCDate(), lastDay), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
  });
}
export function scoreBand(score: number): 'low' | 'medium' | 'high' { return Math.round(score) >= 70 ? 'high' : Math.round(score) >= 40 ? 'medium' : 'low'; }
