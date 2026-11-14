import { create } from 'zustand';
export type Theme = 'light' | 'dark';
function savedTheme(): Theme { try { return localStorage.getItem('ln-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } }
export const useTheme = create<{ theme: Theme; toggle: () => void }>((set) => ({ theme: savedTheme(), toggle: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })) }));
function apply(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f8f4ea' : '#071827');
  try { localStorage.setItem('ln-theme', theme); } catch { /* optional preference storage */ }
}
apply(useTheme.getState().theme);
useTheme.subscribe((s) => apply(s.theme));
