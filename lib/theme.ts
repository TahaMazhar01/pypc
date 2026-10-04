/**
 * Colour theme: light, dark, or follow the operating system.
 *
 * Kept free of React and of Node built-ins so the same rules can be used by the
 * server, the no-flash inline script, and the client provider — one definition,
 * three consumers. Nothing here invents a theme: the browser's own
 * `prefers-color-scheme` decides when the visitor chooses "system".
 */

export const THEME_MODES = ['light', 'dark', 'system'] as const

export type ThemeMode = (typeof THEME_MODES)[number]

/** Resolved value actually applied to <html>. */
export type ResolvedTheme = 'light' | 'dark'

/** localStorage key (fast, per browser) and cookie (readable before paint). */
export const THEME_STORAGE_KEY = 'pypc-theme'
export const THEME_COOKIE = 'pypc_theme'
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System'
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value)
}

/** 'system' resolves through the OS preference; the other two are literal. */
export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
  return mode
}

export function readStoredMode(): ThemeMode {
  if (typeof document === 'undefined') return 'light'
  try {
    const fromCookie = document.cookie
      .split(';')
      .map(part => part.trim())
      .find(part => part.startsWith(`${THEME_COOKIE}=`))
    const cookieValue = fromCookie ? decodeURIComponent(fromCookie.split('=')[1] ?? '') : ''
    if (isThemeMode(cookieValue)) return cookieValue
    const fromStorage = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeMode(fromStorage)) return fromStorage
  } catch {
    // Cookies or storage can be blocked; the default is safe.
  }
  return 'light'
}

export function writeStoredMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // Storage unavailable — the cookie below still carries the choice.
  }
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${THEME_COOKIE}=${mode}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax${secure}`
  } catch {
    // Ignore — the choice simply will not persist.
  }
}

export function systemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Applies a resolved theme to <html> without touching React state. */
export function applyTheme(resolved: ResolvedTheme, mode?: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.dataset.theme = resolved
  if (mode) root.dataset.themeMode = mode
  root.style.colorScheme = resolved
}

/**
 * Runs in <head> before the first paint, so the correct theme is on screen from
 * the very first frame — no white flash for dark-mode visitors, no hydration
 * mismatch, and it works even if the rest of the bundle is slow or blocked.
 *
 * Also keeps "system" live: if the visitor changes their OS setting while the
 * tab is open, the page follows without a reload.
 */
export function themeInitScript(): string {
  return `(function(){try{
var KEY='${THEME_STORAGE_KEY}',COOKIE='${THEME_COOKIE}';
var mode=null;
var m=document.cookie.match(new RegExp('(?:^|;\\\\s*)'+COOKIE+'=([^;]*)'));
if(m&&m[1]){var c=decodeURIComponent(m[1]);if(c==='light'||c==='dark'||c==='system')mode=c;}
if(!mode){try{var s=localStorage.getItem(KEY);if(s==='light'||s==='dark'||s==='system')mode=s;}catch(e){}}
if(!mode)mode='light';
var mq=window.matchMedia('(prefers-color-scheme: dark)');
function paint(){
  var r=mode==='system'?(mq.matches?'dark':'light'):mode;
  var el=document.documentElement;
  if(r==='dark'){el.classList.add('dark');}else{el.classList.remove('dark');}
  el.dataset.theme=r;el.dataset.themeMode=mode;el.style.colorScheme=r;
}
paint();
try{mq.addEventListener('change',function(){if(document.documentElement.dataset.themeMode==='system')paint();});}catch(e){}
}catch(e){}})();`
}
