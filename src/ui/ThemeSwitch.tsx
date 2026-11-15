import { useTheme } from './theme';
export function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  // The accessible name follows what the button will do, so a screen reader and the label agree.
  return <button className="btn" onClick={toggle} aria-pressed={theme === 'dark'} aria-label={theme === 'light' ? 'Dark theme' : 'Light theme'}>{theme === 'light' ? '☾ Dark theme' : '☀ Light theme'}</button>;
}
