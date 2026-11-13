import { useMemo } from 'react';
import { computeMetrics, skyAt, horizonAt, discFraction, SUN_RADIUS_DEG_MEAN, type HorizonProfile, type Options } from '@/astro';
import { useStore, useActiveSite, type ActiveSite } from './store';
import { useHorizon } from './useHorizon';

const HOUR = 3600_000;
export function useOptions(): Options {
  const sunsetDef = useStore((s) => s.sunsetDef), earthMarginDeg = useStore((s) => s.earthMarginDeg);
  return useMemo(() => ({ sunsetDef, earthMarginDeg }), [sunsetDef, earthMarginDeg]);
}
/** Window statistics + next events, recomputed per simulated hour (or when an event passes); live values every frame. */
export function useMetrics() {
  const site = useActiveSite(), timeMs = useStore((s) => s.timeMs), windowDays = useStore((s) => s.windowDays), ready = useStore((s) => s.ephemReady);
  const opts = useOptions(); const hz = useHorizon(site);
  const bucket = Math.floor(timeMs / HOUR) * HOUR;
  const stats = useMemo(() => computeMetrics({ lat: site.lat, lon: site.lon, heightKm: site.heightKm }, hz, bucket, windowDays, opts), [site, hz, bucket, windowDays, opts, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const passed = [stats.next.sunset, stats.next.sunrise, stats.next.earthset, stats.next.earthrise].some((t) => t !== null && t < timeMs);
  const fresh = useMemo(() => (passed ? computeMetrics({ lat: site.lat, lon: site.lon, heightKm: site.heightKm }, hz, timeMs, windowDays, opts) : null), [passed, site, hz, timeMs, windowDays, opts]);
  const live = useMemo(() => liveValues(site, hz, timeMs, opts), [site, hz, timeMs, opts]);
  return { stats: fresh ?? stats, live, horizon: hz };
}
export function liveValues(site: ActiveSite, hz: HorizonProfile, timeMs: number, opts: Options) {
  const sky = skyAt({ lat: site.lat, lon: site.lon, heightKm: site.heightKm }, new Date(timeMs));
  const sunClear = sky.sun.el - horizonAt(hz, sky.sun.az), earthClear = sky.earth.el - horizonAt(hz, sky.earth.az) - opts.earthMarginDeg;
  const sunUp = sunClear + (opts.sunsetDef === 'limb' ? SUN_RADIUS_DEG_MEAN : 0) > 0;
  return { sun: sky.sun, earth: sky.earth, sunClear, earthClear, sunUp, earthUp: earthClear > 0, sunFrac: discFraction(sunClear, SUN_RADIUS_DEG_MEAN), sunHorizon: horizonAt(hz, sky.sun.az), earthHorizon: horizonAt(hz, sky.earth.az) };
}
