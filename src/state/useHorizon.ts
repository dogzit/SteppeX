import { SPHERE_HORIZON, type HorizonProfile } from '@/astro';
import type { ActiveSite } from './store';
/** Terrain horizon for a site. Slice 4 replaces this with LOLA-derived profiles; until then every site uses the smooth sphere. */
export function useHorizon(_site: ActiveSite): HorizonProfile { return SPHERE_HORIZON; }
