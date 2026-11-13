import raw from './sites.json';
export type SiteGroup = 'apollo' | 'clps' | 'artemis' | 'international' | 'historic' | 'reference';
export type SiteStatus = 'landed' | 'planned' | 'failed' | 'region' | 'reference';
export type Confidence = 'high' | 'medium' | 'approx';
export interface SiteRecord { id: string; name: string; group: SiteGroup; lat: number; lon: number; heightKm?: number; date?: string; status: SiteStatus; confidence: Confidence; source: string; note?: string }
export const SITES = (raw as { sites: SiteRecord[] }).sites;
export const SITE_BY_ID = new Map(SITES.map((s) => [s.id, s]));
export const GROUP_LABEL: Record<SiteGroup, string> = { artemis: 'Artemis III candidates', clps: 'CLPS landers', reference: 'Polar reference points', international: 'International missions', apollo: 'Apollo', historic: 'Robotic pioneers' };
export const GROUP_ORDER: SiteGroup[] = ['artemis', 'clps', 'reference', 'international', 'apollo', 'historic'];
export const fmtLat = (lat: number) => `${Math.abs(lat).toFixed(3)}°${lat < 0 ? 'S' : 'N'}`;
export const fmtLon = (lon: number) => { let l = ((lon + 180) % 360 + 360) % 360 - 180; if (l === -180) l = 180; return `${Math.abs(l).toFixed(3)}°${l < 0 ? 'W' : 'E'}`; };
