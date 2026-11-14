import { useEffect } from 'react';
import { Glossary } from './Glossary';
import { useDialogFocus } from './useDialogFocus';
export function Methodology({ onClose }: { onClose: () => void }) {
  const ref = useDialogFocus();
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [onClose]);
  return <div className="absolute inset-0 z-50 bg-ink/70 grid place-items-center p-4" onClick={onClose}>
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="help-title" className="glass rounded-2xl max-w-3xl w-full max-h-full overflow-y-auto p-5 text-base leading-relaxed" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3"><h2 id="help-title" className="text-xl font-semibold">Help with Lunar Navigator</h2><button className="btn" onClick={onClose}>Close help</button></div>
      <ol className="list-decimal pl-5 space-y-2 mt-4">
        <li>Open <b>Sites</b> to choose a location, or tap the Moon to add your own pin.</li>
        <li>Open <b>Details</b> to check sunlight, Earth visibility and the score at your selected date.</li>
        <li>Use <b>Find a sunny time</b> for a visit with enough sunlight and Earth view. Opening a result changes the date and shows the surface view.</li>
        <li>Use <b>Compare</b> to put sites and dates side by side. Use <b>Expert</b> for extra settings and measurements.</li>
      </ol>
      <h3 className="font-semibold mt-5">What the results can tell you</h3>
      <p>We use NASA elevation maps to estimate when mountains block the Sun or Earth. The position calculations are checked against NASA’s JPL Horizons reference data. The Moon has no atmosphere to bend or scatter sunlight.</p>
      <p className="mt-2">The score helps compare polar sites. A near-side site may receive all the radio points because Earth stays in view. Battery checks compare hours of darkness with the hours you enter; they do not model temperature, heaters, dust, power use or battery aging.</p>
      <p className="mt-2">Earth in view does not guarantee a working radio connection. Ground stations, relay satellites, antenna direction and signal strength are not checked. Published candidate sites are not confirmed landing locations.</p>
      <Glossary />
      <details className="mt-5 border-t border-white/10 pt-3"><summary className="cursor-pointer font-semibold">Technical details and data credits</summary>
        <p className="mt-2">Positions: astronomy-engine and the IAU/WGCCRE 2009 Moon rotation model, including libration and Earth parallax. Checked at 1,208 epochs against JPL Horizons: maximum differences of 0.009° for the Sun and 0.004° for Earth.</p>
        <p className="mt-2">Terrain: NASA LRO LOLA / PDS elevation maps; 40 m/pixel in the far south, 240 m/pixel near the poles, and 1.9 km/pixel elsewhere. Horizon profiles look up to 250 km from a height of 2 m. Custom pins use coarser maps. Small rocks and nearby slopes can be missed.</p>
        <p className="mt-2">Mission durations come from refined terrain crossings, clipped to the exact mission start and end. Crossings are refined to about one second. The average visible fraction of the Sun is integrated with 10-minute samples. Event searches stop at 400 days; planet searches at 60 days.</p>
        <p className="mt-2">Credits: NASA SVS CGI Moon Kit / LROC WAC, NASA Blue Marble, NASA LRO LOLA, JPL Horizons, LROC/Wagner et al. 2017, ISRO, CNSA, JAXA, NASA NSSDCA, LPSC 2024 #1695 and Gläser et al. 2018. Individual site notes list their sources. The polar relief map uses fixed display lighting; the star field is decorative.</p>
      </details>
    </div>
  </div>;
}
