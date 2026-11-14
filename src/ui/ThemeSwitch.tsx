import { useTheme } from './theme';
export function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  return <button className="btn" onClick={toggle} aria-pressed={theme === 'dark'} aria-label="Dark theme">{theme === 'light' ? '☾ Dark theme' : '☀ Light theme'}</button>;
}
