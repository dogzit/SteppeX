/** JPL Horizons helpers: fetch observer tables for a site on the Moon, parse to [jd, az, el] rows. */
export interface HSite { id: string; lat: number; lon: number; alt: number; note: string }
export interface Fixture { site: HSite; target: 'sun' | 'earth'; start: string; stop: string; steps: number; url: string; fetchedAt: string; rows: [number, number, number][] }

export const TARGET_ID = { sun: '10', earth: '399' } as const;

export function horizonsUrl(s: HSite, target: 'sun' | 'earth', start: string, stop: string, steps: number): string {
  const q: Record<string, string> = {
    format: 'text', COMMAND: `'${TARGET_ID[target]}'`, OBJ_DATA: `'NO'`, MAKE_EPHEM: `'YES'`, EPHEM_TYPE: `'OBSERVER'`,
    CENTER: `'coord@301'`, COORD_TYPE: `'GEODETIC'`, SITE_COORD: `'${s.lon},${s.lat},${s.alt}'`,
    START_TIME: `'${start}'`, STOP_TIME: `'${stop}'`, STEP_SIZE: `'${steps}'`, QUANTITIES: `'4'`,
    ANG_FORMAT: `'DEG'`, CAL_FORMAT: `'JD'`, EXTRA_PREC: `'YES'`, APPARENT: `'AIRLESS'`, CSV_FORMAT: `'YES'`,
  };
  return 'https://ssd.jpl.nasa.gov/api/horizons.api?' + Object.entries(q).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

const NUM = /^-?\d+(\.\d+)?$/;
export function parseRows(text: string): [number, number, number][] {
  const a = text.indexOf('$$SOE'), b = text.indexOf('$$EOE');
  if (a < 0 || b < 0) throw new Error('No $$SOE/$$EOE block in Horizons response:\n' + text.slice(0, 1500));
  const rows: [number, number, number][] = [];
  for (const line of text.slice(a + 5, b).split('\n')) {
    const nums = line.split(',').map((f) => f.trim()).filter((f) => NUM.test(f)).map(Number);
    if (nums.length === 3) rows.push([nums[0], nums[1], nums[2]]);
  }
  return rows;
}
