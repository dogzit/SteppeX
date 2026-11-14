import { useEffect, useRef } from 'react';
export function Methodology({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="absolute inset-0 z-40 bg-ink/70 grid place-items-center p-6" role="dialog" aria-modal="true" aria-labelledby="meth-title" onClick={onClose}>
      <div className="glass rounded-2xl max-w-3xl w-full max-h-full overflow-y-auto p-6 text-sm leading-relaxed" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><div><div className="label">Methodology & limitations</div><h2 id="meth-title" className="text-xl font-semibold">How Lunar Navigator computes what it shows</h2></div><button ref={ref} className="btn" onClick={onClose}>Close ✕</button></div>
        <h3 className="label mt-5 mb-1">Sun and Earth positions</h3>
        <p>Geocentric Sun and Moon vectors come from <b>astronomy-engine</b> (VSOP87-based Earth, analytic Moon series). They are re-expressed in the Moon's body-fixed mean-Earth/polar-axis frame using the <b>IAU/WGCCRE 2009 Moon rotation model</b>, whose trigonometric series carries the physical libration; optical libration follows from the geometry. Each site's local horizontal is the radial direction on the 1737.4 km reference sphere; the Earth's topocentric parallax (up to 0.26°) is included. There is <b>no atmosphere, so no refraction and no twilight</b>: a body is visible exactly when its disc is above the terrain line.</p>
        <p className="mt-1"><b>Validation:</b> 1 208 epochs over 2023–2028 at four sites (equator to 89.9°S) against JPL Horizons differ by at most 0.009° (Sun) and 0.004° (Earth). See VALIDATION.md in the repository.</p>
        <h3 className="label mt-4 mb-1">Terrain horizon</h3>
        <p>Horizons are swept from <b>LRO LOLA</b> digital elevation models: 40 m/px inside 85°S, 240 m/px for 75–85° (both poles), and the 1.9 km/px global grid elsewhere. For each of 360 azimuths a great-circle ray is marched 250 km, keeping the highest elevation angle of the terrain seen from an eye 2 m above the local surface; the sphere's curvature is inherent in the geometry. Library sites are precomputed; custom pins are computed in a Web Worker from downsampled tiles (720 m/px polar, 7.6 km/px global) and are labelled as coarse.</p>
        <p className="mt-1">Cross-check: two years of hourly sampling at the Gläser et al. (2018) reference points reproduces their published average illumination at the south pole to within 1–9 percentage points; at the north pole a 240 m/px grid under-resolves the rim crest (44 % vs 83 %), and moving 720 m along the rim recovers 77 %. <b>Read every profile as "this pixel", not "this region".</b></p>
        <h3 className="label mt-4 mb-1">Events, windows, score</h3>
        <p>Sunrise/sunset and Earthrise/Earthset are found on an hourly grid and refined by bisection to one second. "Sunset" defaults to the disc centre crossing the terrain line (switchable to the last limb); the <b>solar disc fraction</b> above the line is also computed, which is what the power term uses. The <b>viability score</b> is 40 × mean visible disc fraction + 30 × fraction of time the Earth is above the terrain plus your antenna mask + 15 × longest continuous sunlight ÷ window + 15 × min(1, hours to the next loss of sunlight ÷ 72), over a window that starts at the mission clock (default 14 days).</p>
        <h3 className="label mt-4 mb-1">Not modelled</h3>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>Solar penumbra beyond the flat-horizon disc model; DEM errors and anything smaller than a pixel (boulders, local slopes under the lander).</li>
          <li>Panel orientation, tracking, thermal limits, battery sizing, dust; regolith reflectance.</li>
          <li>Ground-station geometry on the Earth side, relay satellites, link budgets: "Earth visible" means geometric line of sight above your mask angle.</li>
          <li>Light-time and aberration (≈0.006°), Moon figure (ellipsoid vs sphere), Earth's axial orientation in the lander view (approximate), star positions (decorative).</li>
          <li>Site coordinates carry a confidence flag; Artemis III points are published candidate sites, not NASA's final selections.</li>
        </ul>
        <h3 className="label mt-4 mb-1">Data & credits</h3>
        <p>NASA/GSFC/ASU LRO LOLA GDR (PDS Geosciences Node) · NASA SVS CGI Moon Kit (LROC WAC colour) · NASA Blue Marble · JPL Horizons · astronomy-engine (MIT) · LROC/Wagner et al. 2017 (Apollo coordinates) · ISRO, CNSA, JAXA, Intuitive Machines, Firefly, NASA LRO (recent landings) · LPSC 2024 #1695 and Gläser et al. 2018 (polar reference points).</p>
      </div>
    </div>
  );
}
