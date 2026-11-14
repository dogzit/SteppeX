import { describe, expect, it } from 'vitest';
import { formatCompare, parseCompare, type CompareUrlState } from '../src/state/compareLink';

const lib = (siteId: string, offsetDays = 0) => ({ siteId, custom: null, offsetDays });

describe('compare scenarios in a shared link', () => {
  it('round-trips library sites with their date offsets', () => {
    const c: CompareUrlState = { slipDays: 7, scenarios: [lib('artemis-cr'), lib('chandrayaan3', -3), lib('im1', 12)] };
    const text = formatCompare(c);
    expect(text).toBe('artemis-cr:0,chandrayaan3:-3,im1:12');
    expect(parseCompare(text, '7')).toEqual(c);
  });

  it('round-trips a custom pin without colliding with site ids', () => {
    const c: CompareUrlState = { slipDays: 0, scenarios: [{ siteId: 'custom', custom: { lat: -65.9851, lon: 42.2412 }, offsetDays: 2 }] };
    const text = formatCompare(c);
    expect(text).toBe('c-65.9851_42.2412:2');
    expect(parseCompare(text, null)).toEqual(c);
  });

  it('is absent, not empty, when there is nothing to share', () => {
    expect(parseCompare(null, null)).toBeUndefined();
    expect(parseCompare('', '3')).toBeUndefined();
  });

  it('drops malformed items rather than failing the whole link', () => {
    const got = parseCompare('artemis-cr:0,nonsense,:5,bad:notanumber,im1:3', null);
    expect(got?.scenarios).toEqual([lib('artemis-cr'), lib('im1', 3)]);
  });

  it('keeps at most the four scenarios the panel can show', () => {
    const got = parseCompare('a:0,b:0,c:0,d:0,e:0,f:0', null);
    expect(got?.scenarios).toHaveLength(4);
  });

  it('clamps the launch slip to the slider range and ignores junk', () => {
    expect(parseCompare('im1:0', '999')?.slipDays).toBe(28);
    expect(parseCompare('im1:0', '-999')?.slipDays).toBe(-14);
    expect(parseCompare('im1:0', 'abc')?.slipDays).toBe(0);
  });

  it('rejects out-of-range coordinates and offsets', () => {
    expect(parseCompare('c999_0:0', null)).toBeUndefined();
    expect(parseCompare('im1:4000', null)).toBeUndefined();
  });
});
