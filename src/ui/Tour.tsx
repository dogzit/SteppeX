import { useEffect, useMemo } from 'react';
import { tourSteps } from './Explorer';
export function Tour({ step, setStep }: { step: number; setStep: (s: number | null) => void }) {
  const steps = useMemo(tourSteps, []);
  const cur = steps[step];
  useEffect(() => { cur?.apply(); }, [cur]);
  if (!cur) return null;
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-40 z-40 glass rounded-xl p-4 w-[34rem] max-w-[92vw]" role="dialog" aria-label="Guided tour">
      <div className="label">Guided tour · {step + 1} / {steps.length}</div>
      <h3 className="text-base font-semibold mt-0.5">{cur.title}</h3>
      <p className="text-[13px] text-white/80 leading-snug mt-1">{cur.body}</p>
      <div className="flex items-center gap-2 mt-3">
        <button className="btn" onClick={() => setStep(step > 0 ? step - 1 : null)}>{step > 0 ? '← Back' : 'Skip'}</button>
        <button className="btn btn-on" onClick={() => setStep(step + 1 < steps.length ? step + 1 : null)} autoFocus>{step + 1 < steps.length ? 'Next →' : 'Finish'}</button>
        <span className="ml-auto flex gap-1" aria-hidden>{steps.map((_, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-solar' : 'bg-white/20'}`} />)}</span>
      </div>
    </div>
  );
}
