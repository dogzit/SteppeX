import { en } from '@/i18n/en';
export function Glossary() {
  return <section aria-label="Glossary" className="mt-5 space-y-2">
    <h3 className="font-semibold">What do these words mean?</h3>
    <p className="text-sm text-haze">Tap or click a word to see its meaning. You can also use Tab and Enter.</p>
    {en.glossary.map(([term, meaning]) => <details key={term} className="rounded-lg border border-white/10 p-3"><summary className="cursor-pointer font-medium">{term}</summary><p className="mt-2 text-sm text-haze">{meaning}</p></details>)}
  </section>;
}
