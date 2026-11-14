import { useCallback, useMemo, useState } from 'react';
import { findWindow, type FindWindowOutcome, type WindowCandidate } from '@/astro/findWindow';
import { useActiveSite, useStore } from '@/state/store';
import { useHorizon } from '@/state/useHorizon';
import { useOptions } from '@/state/useMetrics';
import { writeUrlState } from '@/state/url';
import { fmtDateTime, fmtDuration } from './format';
import { announce } from './notice';
import { terrainSummary } from './terrainCopy';
import { downloadMissionIcs } from './ics';

const SEARCH_DAYS = 90;
const HOUR = 3600_000;
const DAY = 86400_000;

/** "Find a sunny time": next 3 opportunities in the site's dashboard with ≥N h sunlight and ≥M h continuous Earth visibility. */
export function FindWindowPanel() {
  const [open, setOpen] = useState(() => useStore.getState().fwSelStart !== null);
  const site = useActiveSite();
  const hz = useHorizon(site);
  const opts = useOptions();
  const timeMs = useStore((s) => s.timeMs);
  const fwSunHours = useStore((s) => s.fwSunHours);
  const fwEarthHours = useStore((s) => s.fwEarthHours);
  const fwSelStart = useStore((s) => s.fwSelStart);
  const fwSelEnd = useStore((s) => s.fwSelEnd);
  const { setFwSunHours, setFwEarthHours, setFwSelection, setTime, setView } = useStore();

  // Bucketed to the hour, matching useMetrics, so scrubbing/playback doesn't re-run the 90-day search every frame.
  const bucket = timeMs;
  const requiredSunMs = Math.max(0, fwSunHours) * HOUR;
  const requiredEarthMs = Math.max(0, fwEarthHours) * HOUR;

  const outcome = useMemo<FindWindowOutcome | null>(() => {
    if (!open || requiredSunMs <= 0) return null;
    return findWindow({
      site: { lat: site.lat, lon: site.lon, heightKm: site.heightKm },
      horizon: hz,
      searchStart: bucket,
      searchEnd: bucket + SEARCH_DAYS * DAY,
      requiredSunMs,
      requiredEarthMs,
      options: opts,
    });
  }, [open, site, hz, opts, bucket, requiredSunMs, requiredEarthMs]);

  const select = useCallback((c: WindowCandidate) => {
    setFwSelection(c.start, c.end);
    setTime(c.start);
    setView('horizon');
  }, [setFwSelection, setTime, setView]);

  const copyLink = useCallback(async (c: WindowCandidate) => {
    setFwSelection(c.start, c.end);
    setTime(c.start);
    setView('horizon');
    // The store's own URL sync debounces ~400 ms; flush synchronously so the clipboard gets this exact state.
    writeUrlState(useStore.getState());
    try { await navigator.clipboard.writeText(window.location.href); announce('Link copied. It opens this site at the chosen time.'); } catch { announce('The link could not be copied. You can copy it from your browser’s address bar instead.'); }
  }, [setFwSelection, setTime, setView]);

  return (
    <section className="border-t border-white/10 pt-3" aria-label="Find a sunny time">
      <button className="w-full flex items-center justify-between text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="label">Find a sunny time</span>
        <span className="text-white/50 text-xs">{open ? '▴ hide' : '▾ show'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          <p className="text-xs text-haze">Choose how long you need sunlight and a clear view of Earth. Open a result to move to its start time and see the view from the surface.</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col">
              <span className="label">Hours of unbroken sunlight</span>
              <input aria-label="Required continuous sunlight, hours" type="number" min={1} max={2000} className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={fwSunHours} onChange={(e) => setFwSunHours(Math.max(0, +e.target.value || 0))} />
            </label>
            <label className="flex flex-col">
              <span className="label">Hours with Earth in view</span>
              <input aria-label="Required continuous Earth visibility, hours" type="number" min={0} max={500} className="num bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm" value={fwEarthHours} onChange={(e) => setFwEarthHours(Math.max(0, +e.target.value || 0))} />
            </label>
          </div>
          <p className="label normal-case tracking-normal text-white/45">Looking ahead {SEARCH_DAYS} days from your selected date ({fmtDateTime(bucket)}). Set Earth hours to 0 if you do not need Earth in view. {terrainSummary(hz)}</p>
          {!outcome ? (
            <p className="text-xs text-white/50">Set a sunlight duration of at least 1 hour to search.</p>
          ) : outcome.candidates.length === 0 ? (
            <div className="rounded-lg bg-white/4 border border-white/8 p-3 text-xs text-white/75 leading-snug">
              {!outcome.sunlightSufficient ? (
                <>No matching time yet. The longest stretch of sunlight in the next {SEARCH_DAYS} days was <b className="text-solar">{fmtDuration(outcome.longestSunlitMs)}{outcome.longestSunlitIsLowerBound ? '+' : ''}</b>; you asked for {fmtDuration(requiredSunMs)}. Try fewer sunlight hours, a different date, or another site.</>
              ) : (
                <>No matching time yet. There is enough sunlight, but the longest unbroken Earth view during that sunlight was <b className="text-earth">{fmtDuration(outcome.bestEarthOverlapMs)}</b>; you asked for {fmtDuration(requiredEarthMs)}. Try fewer Earth hours or another site.</>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {outcome.candidates.map((c) => (
                <CandidateRow key={c.start} c={c} siteName={site.name} selected={fwSelStart === c.start && fwSelEnd === c.end} onSelect={() => select(c)} onCopyLink={() => void copyLink(c)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function CandidateRow({ c, siteName, selected, onSelect, onCopyLink }: { c: WindowCandidate; siteName: string; selected: boolean; onSelect: () => void; onCopyLink: () => void }) {
  return (
    <li className={`rounded-lg bg-white/4 border p-3 ${selected ? 'border-white/40' : 'border-white/8'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button className="text-left min-w-0" onClick={onSelect} title="Move to this start time and see the view from the surface">
          <span className="label block text-solar mb-1">{selected ? 'Selected time · open view' : 'Open this time →'}</span><div className="num text-xs text-white/85">{fmtDateTime(c.start)} → {fmtDateTime(c.end)} UTC</div>
        </button>
        <div className="flex gap-1 shrink-0">
          <button className="btn" onClick={onCopyLink}>Copy this time</button>
          <button className="btn" onClick={() => downloadMissionIcs(siteName, c)}>Add to calendar</button>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-[11px] num mt-1.5">
        <dt className="text-white/50">Earth visible</dt>
        <dd>{c.earthInterval ? <>{fmtDateTime(c.earthInterval.start)} → {fmtDateTime(c.earthInterval.end)} ({fmtDuration(c.earthInterval.end - c.earthInterval.start)})</> : 'not required'}</dd>
        <dt className="text-white/50">Sunlight left after this visit</dt>
        <dd>{c.remainingIsLowerBound ? '≥ ' : ''}{fmtDuration(c.remainingSunlightMs)}</dd>
      </dl>
    </li>
  );
}
