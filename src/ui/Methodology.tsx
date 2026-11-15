import { useEffect } from 'react';
import { Glossary } from './Glossary';
import { useDialogFocus } from './useDialogFocus';
export function Methodology({ onClose }: { onClose: () => void }) {
  const ref = useDialogFocus();
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [onClose]);
  return <div className="absolute inset-0 z-50 scrim grid place-items-center p-4" onClick={onClose}>
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
      <p className="mt-2">The score helps compare polar sites. A near-side site may receive all the radio points because Earth stays in view. Sunlight here is geometry only: no solar-panel orientation or tracking, no temperature, dust or power modelling. Battery checks compare hours of darkness with the hours you enter; they do not model heaters, power draw or battery aging.</p>
      <p className="mt-2">Radio visibility is line of sight only: Earth above the terrain plus your clearance angle. Ground stations, relay satellites, antenna direction and signal strength are not checked, so Earth in view does not guarantee a working link. The Artemis entries are published candidate points inside two of NASA’s 2022 candidate regions, not NASA’s final sites; other entries carry their own confidence flag and source.</p>
      <h3 className="font-semibold mt-5">How precise is a pin?</h3>
      <p>A horizon profile describes one pixel of the elevation map, so a pin is a neighbourhood rather than a landing ellipse. Along the Whipple crater rim, moving 720 m changes the yearly share of sunlight from 44% to 77%. Results for the north pole and for custom pins use coarser maps and are labelled accordingly.</p>
      <h3 className="font-semibold mt-5">How we check this</h3>
      <p>Two independent checks, both repeatable from the project's source.</p>
      <p className="mt-2"><b>Positions.</b> Sun and Earth direction from the lunar surface, compared with NASA’s JPL Horizons at 1,208 epochs and four sites including 89.9°S. Largest difference: 0.0045° for the Sun, 0.0036° for Earth, against a 0.1° tolerance. The check runs offline in the test suite with <span className="num">npm test</span>.</p>
      <p className="mt-2"><b>Terrain illumination.</b> Compared with the Gläser et al. 2018 south-pole study, which used a finer 20 m/pixel map over 20 years. Average share of sunlight at their three south-pole points:</p>
      <table className="mt-2 w-full text-sm border-collapse">
        <thead><tr><th scope="col" className="text-left py-1 border-b border-white/15">Site</th><th scope="col" className="text-right py-1 border-b border-white/15">Ours</th><th scope="col" className="text-right py-1 border-b border-white/15">Published</th></tr></thead>
        <tbody>
          <tr><td className="py-1">Shackleton rim S</td><td className="num text-right">83.4%</td><td className="num text-right">81%</td></tr>
          <tr><td className="py-1">Connecting Ridge C1</td><td className="num text-right">76.8%</td><td className="num text-right">76%</td></tr>
          <tr><td className="py-1">Connecting Ridge C2</td><td className="num text-right">66.2%</td><td className="num text-right">75.6%</td></tr>
        </tbody>
      </table>
      <p className="mt-2">That is agreement within 1 to 9 percentage points. At their north-pole point the gap is much larger, because our coarser map there misses the crater rim crest: the best pixel within 720 m gives 77%, the point itself 44%. Rerun these comparisons with <span className="num">npm run validate</span> and <span className="num">npm run validate:horizon</span>; full tables are in VALIDATION.md.</p>
      <Glossary />
      <details className="mt-5 border-t border-white/10 pt-3"><summary className="cursor-pointer font-semibold">Technical details and data credits</summary>
        <p className="mt-2">Positions: astronomy-engine and the IAU/WGCCRE 2009 Moon rotation model, including libration and Earth parallax. Checked at 1,208 epochs against JPL Horizons: maximum differences of 0.0045° for the Sun and 0.0036° for Earth.</p>
        <p className="mt-2">Terrain: NASA LRO LOLA / PDS elevation maps; 40 m/pixel in the far south, 240 m/pixel near the poles, and 1.9 km/pixel elsewhere. Horizon profiles look up to 250 km from a height of 2 m. Custom pins use downsampled tiles at 720 m/pixel near the poles and 7.6 km/pixel globally. Small rocks and nearby slopes can be missed.</p>
        <p className="mt-2">Mission durations come from refined terrain crossings, clipped to the exact mission start and end. Crossings are refined to about one second. The average visible fraction of the Sun is integrated with 10-minute samples. Event searches stop at 400 days; planet searches at 60 days. Positions come from a precomputed hourly table for 2023–2031; dates outside it fall back to the exact ephemeris path.</p>
        <p className="mt-2">Credits: NASA SVS CGI Moon Kit / LROC WAC, NASA Blue Marble, NASA LRO LOLA, JPL Horizons, LROC/Wagner et al. 2017, ISRO, CNSA, JAXA, NASA NSSDCA, LPSC 2024 #1695 and Gläser et al. 2018. Individual site notes list their sources. The polar relief map uses fixed display lighting; the star field is decorative.</p>
      </details>
    </div>
  </div>;
}
