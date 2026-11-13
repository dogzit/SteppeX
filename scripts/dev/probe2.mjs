import { chromium } from '@playwright/test';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text().slice(0, 200)); });
p.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)));
await p.goto('http://localhost:4173/'); await p.waitForTimeout(5000);
console.log(await p.evaluate(() => { const outer = document.querySelector('canvas').parentElement.parentElement; return { outerClass: outer.className, children: outer.children.length, items: [...outer.children].map((c) => ({ tag: c.tagName, text: c.textContent.slice(0, 40), style: c.getAttribute('style')?.slice(0, 90), display: getComputedStyle(c).display })).slice(0, 8), translated: document.querySelectorAll('[style*="translate3d"]').length }; }));
await b.close();
