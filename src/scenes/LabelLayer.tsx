import { useMemo } from 'react';
import { SITES } from '@/data/sites';
import { useStore } from '@/state/store';
import { labelRegistry } from './labels';
import { latLonToThree, kmToUnits } from './convert';
import type { SiteSun } from './useEphemeris';
import type * as THREE from 'three';

interface Item { id: string; text: string; sub?: string; subColor?: string; color?: string; pos: THREE.Vector3; occlude: boolean; strong?: boolean }

/** DOM overlay of site labels; positions are written by updateLabels() from the render loop. */
export function LabelLayer({ siteSun, earthPos }: { siteSun: SiteSun; earthPos: THREE.Vector3 }) {
  const siteId = useStore((s) => s.siteId), hover = useStore((s) => s.hoverSiteId), custom = useStore((s) => s.custom);
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const s of SITES) {
      const selected = s.id === siteId, hovered = s.id === hover;
      if (!(selected || hovered)) continue;
      const sun = siteSun.get(s.id); const lit = (sun?.fraction ?? 0) > 0;
      out.push({ id: s.id, text: s.name.split(' · ')[0], sub: sun ? `${lit ? '☀' : '☾ In shadow'} ${sun.clear.toFixed(2)}° above terrain` : undefined, subColor: lit ? '#ffb547' : '#7fa6d6', pos: latLonToThree(s.lat, s.lon, 1 + kmToUnits(s.heightKm ?? 0) + 0.002), occlude: true, strong: selected });
    }
    if (custom && siteId === 'custom') out.push({ id: 'custom', text: 'Custom pin', pos: latLonToThree(custom.lat, custom.lon, 1.003), occlude: true, strong: true });
    out.push({ id: 'earth', text: 'EARTH · direction only', color: '#5fc3ff', pos: earthPos.clone().addScaledVector(earthPos.clone().normalize(), 0.0).add({ x: 0, y: 0.17, z: 0 } as THREE.Vector3Like), occlude: false });
    return out;
  }, [siteId, hover, custom, siteSun, earthPos]);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {items.map((it) => (
        <div key={it.id} className="absolute top-0 left-0 will-change-transform" style={{ opacity: 0 }} ref={(el) => { if (el) labelRegistry.set(it.id, { pos: it.pos, el, occlude: it.occlude }); else labelRegistry.delete(it.id); }}>
          <div className="pin-label" title={it.sub?.includes('shadow') ? 'Sun is up, but nearby terrain is blocking it.' : undefined} style={{ color: it.color ?? (it.strong ? '#fff' : undefined), borderColor: it.strong ? '#ffffff55' : undefined, fontSize: it.id === 'earth' ? 10 : undefined, letterSpacing: it.id === 'earth' ? '.14em' : undefined }}>
            {it.text}{it.sub && <> <span className="num" style={{ color: it.subColor }}>{it.sub}</span></>}
          </div>
        </div>
      ))}
    </div>
  );
}
