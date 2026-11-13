import { EphemTable, setEphemTable, type EphemMeta } from '@/astro';
import { useStore } from './store';
/** Loads the precomputed hourly body-fixed Sun/Earth table (1.1 MB). The app works without it (exact ephemeris fallback, slower). */
export async function loadEphemTable() {
  try {
    const base = import.meta.env.BASE_URL;
    const [meta, bin] = await Promise.all([fetch(`${base}data/ephem.json`).then((r) => r.json() as Promise<EphemMeta>), fetch(`${base}data/ephem.bin`).then((r) => r.arrayBuffer())]);
    setEphemTable(EphemTable.fromBuffer(meta, bin));
    useStore.setState({ ephemReady: true });
  } catch (e) { console.warn('ephemeris table unavailable, using exact ephemeris', e); }
}
