import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
function luminance(hex: string) { const rgb = hex.match(/\w\w/g)!.map((s) => parseInt(s, 16) / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; }
function contrast(a: string, b: string) { const v = [luminance(a), luminance(b)].sort((x, y) => y - x); return (v[0] + .05) / (v[1] + .05); }
it('normal text and semantic colors meet AA on both UI surfaces', () => {
  const css = readFileSync('src/index.css', 'utf8');
  for (const theme of ['light', 'dark']) {
    const block = css.split(`:root[data-theme="${theme}"] {`).at(-1)!.split('}')[0];
    const value = (key: string) => block.match(new RegExp(`--${key}: #([a-f0-9]+)`))![1];
    for (const token of ['ui-text', 'ui-muted', 'color-solar', 'color-earth', 'ui-turquoise', 'ui-red']) {
      expect(contrast(value(token), value('ui-surface'))).toBeGreaterThanOrEqual(4.5);
    }
  }
});
