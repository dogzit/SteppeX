import { useMetrics } from '@/state/useMetrics';
import { useActiveSite, useStore } from '@/state/store';
import { fmtDuration } from './format';

/** Plain-language "why is this hard?" callouts driven by the live numbers. Shown in Explorer mode. */
export function ExplorerCallouts() {
  const site = useActiveSite(); const { stats, live, horizon } = useMetrics(); const windowDays = useStore((s) => s.windowDays);
  const polar = Math.abs(site.lat) > 80;
  const maxSun = polar ? '≈1.5°' : `${(90 - Math.abs(site.lat) + 1.5).toFixed(0)}°`;
  const items: { icon: string; title: string; body: string }[] = [];
  items.push(polar
    ? { icon: '☀', title: 'The Sun never climbs here', body: `At ${Math.abs(site.lat).toFixed(1)}°S the Sun stays within about ${maxSun} of the horizon and circles it once per lunar day (29.5 Earth days). Any ridge in its path turns day into night: right now the terrain in the Sun's direction stands ${live.sunHorizon.toFixed(1)}° high and the Sun is at ${live.sun.el.toFixed(1)}°.` }
    : { icon: '☀', title: 'A day is two weeks long', body: `Here the Sun rises to about ${maxSun} and a full day–night cycle takes 29.5 Earth days: roughly ${fmtDuration(stats.window.longestSunlitMs)} of sunlight, then a night just as long at −170 °C. Landers without heaters rarely survive it.` });
  items.push(live.earthUp
    ? { icon: '⊕', title: 'Earth is up, so radios work', body: `Earth sits ${live.earth.el.toFixed(1)}° above the horizon. From the Moon it hangs almost still, but it drifts ±7° over the month (libration). Over the next ${windowDays} days it is visible ${(100 * stats.window.earthFrac).toFixed(0)}% of the time.` }
    : { icon: '⊕', title: 'No Earth, no direct radio link', body: `Earth is ${Math.abs(live.earth.el).toFixed(1)}° below the horizon, so this site cannot talk to Earth directly right now${stats.next.earthrise ? `; it rises in ${fmtDuration(stats.next.earthrise - useStore.getState().timeMs)}` : ''}. Near the poles the Earth wobbles in and out of view every month; on the far side it never appears.` });
  items.push({ icon: '◐', title: 'No air changes everything', body: `There is no atmosphere: no twilight, no scattered light, no refraction lifting the Sun. Shadows are pitch black and a ${(2 * live.sun.radiusDeg).toFixed(2)}° solar disc sets in about an hour at the pole. The horizon used here comes from LRO laser altimetry (${horizon.label.split(';')[0]}).` });
  return (
    <section className="space-y-2" aria-label="Why is this hard?">
      <div className="label">Why is this hard?</div>
      {items.map((it) => <div key={it.title} className="rounded-lg bg-white/4 border border-white/8 p-3"><div className="text-sm font-semibold"><span className="text-solar mr-2">{it.icon}</span>{it.title}</div><p className="text-[12px] text-white/75 leading-snug mt-1">{it.body}</p></div>)}
    </section>
  );
}

export interface TourStep { title: string; body: string; apply: () => void }
export function tourSteps(): TourStep[] {
  const s = useStore.getState();
  return [
    { title: 'The Moon, lit as it really is', body: 'Pins are landing sites; amber rings are in sunlight, blue ones in darkness. The line between day and night moves 15° per Earth day. Drag to orbit, scroll to zoom.', apply: () => { s.setView('globe'); s.selectSite('apollo11'); } },
    { title: 'The south pole is a different world', body: 'Near the pole the Sun only skims the horizon, so mountains cast shadows hundreds of kilometres long and some crater floors have been dark for two billion years. Artemis III targets the ridges that catch the most light.', apply: () => { s.setView('polar'); s.selectSite('artemis-cr'); } },
    { title: 'Stand on the ridge', body: 'This is what the lander sees: the real LOLA terrain silhouette, the Sun at its true 0.5° size and the Earth at 2°. The dotted tracks show where both will travel over the next lunar day.', apply: () => { s.setView('horizon'); } },
    { title: 'When is the next sunset?', body: 'The timeline stacks sunlight, Earth visibility and the overlap. Click anywhere to jump in time, press Play to watch the shadows move, or switch to a year to see the seasons.', apply: () => { s.setView('globe'); s.setSpan('month'); } },
    { title: 'What if the launch slips?', body: 'Compare mode puts sites and dates side by side. Drag the slip slider and the deltas light up instantly: a week can turn a 90 into a 30.', apply: () => { s.setView('globe'); } },
  ];
}
