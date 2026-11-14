import { useStore } from '@/state/store';
import { en } from '@/i18n/en';
/** Both audiences share one scenario; changing presentation never changes site, time or physics. */
export function AudienceSwitch({ compact = false }: { compact?: boolean }) {
  const mode = useStore((s) => s.mode), setMode = useStore((s) => s.setMode);
  if (compact) return <button className="btn" aria-label={mode === 'explorer' ? 'Switch to Expert mode' : 'Switch to Simple mode'} title={mode === 'explorer' ? 'Expert: advanced planning tools' : 'Simple: everyday exploration'} onClick={() => setMode(mode === 'explorer' ? 'planner' : 'explorer')}>{mode === 'explorer' ? en.nav.expert : en.nav.simple}</button>;
  return <div className="flex rounded-md overflow-hidden border border-white/10" role="group" aria-label="Choose Simple or Expert mode">
    <button className={`btn ${mode === 'explorer' ? 'btn-on' : ''}`} aria-pressed={mode === 'explorer'} onClick={() => setMode('explorer')} title="Simple: for everyday exploration">{en.nav.simple}</button>
    <button className={`btn ${mode === 'planner' ? 'btn-on' : ''}`} aria-pressed={mode === 'planner'} onClick={() => setMode('planner')} title="Expert: advanced planning tools and full measurements">{en.nav.expert}</button>
  </div>;
}
