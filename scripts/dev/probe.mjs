import { chromium } from '@playwright/test';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)); });
p.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 500)));
await p.goto('http://localhost:4173/'); await p.waitForTimeout(5000);
const info = await p.evaluate(() => [...document.querySelectorAll('.pin-label')].slice(0, 5).map((el) => { const r = el.getBoundingClientRect(); const par = el.parentElement; return { text: el.textContent, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), parentStyle: par?.getAttribute('style')?.slice(0, 160), z: getComputedStyle(par).zIndex, vis: getComputedStyle(el).visibility, op: getComputedStyle(par).opacity }; }));
console.log(JSON.stringify(info, null, 1));
await p.screenshot({ path: 'docs/screens/probe.png' }); await b.close();
