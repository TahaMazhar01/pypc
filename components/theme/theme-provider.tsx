'use client'


import { displayContent } from '@/lib/display-content'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  applyTheme,
  readStoredMode,
  resolveTheme,
  systemPrefersDark,
  writeStoredMode,
  type ResolvedTheme,
  type ThemeMode
} from '@/lib/theme'

type ThemeContextValue = {
  /** What the visitor chose: light, dark or system. */
  mode: ThemeMode
  /** What is actually on screen: light or dark. */
  resolved: ResolvedTheme
  /** True when the visitor's OS asks for dark and no explicit choice was made. */
  systemIsDark: boolean
  /** False until the client has read the stored choice (avoids a flicker). */
  ready: boolean
  setMode: (mode: ThemeMode) => void
  /** Flips between light and dark and stores the explicit result. */
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // `null` during the first render: the inline script in <head> has already
  // painted the right colours, and this only drives the control's own state.
  const [mode, setModeState] = useState<ThemeMode | null>(null)
  const [systemIsDark, setSystemIsDark] = useState(false)

  useEffect(() => {
    const stored = readStoredMode()
    setModeState(stored)
    setSystemIsDark(systemPrefersDark())
    applyTheme(resolveTheme(stored, systemPrefersDark()), stored)
  }, [])

  // Follow the OS while the visitor has "system" selected.
  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => {
      setSystemIsDark(event.matches)
      setModeState(current => {
        if (current === 'system') applyTheme(event.matches ? 'dark' : 'light', 'system')
        return current
      })
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    writeStoredMode(next)
    applyTheme(resolveTheme(next, systemPrefersDark()), next)
  }, [])

  const resolved: ResolvedTheme = mode ? resolveTheme(mode, systemIsDark) : 'light'

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved, setMode])

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: mode ?? 'light',
      resolved,
      systemIsDark,
      ready: mode !== null,
      setMode,
      toggle
    }),
    [mode, resolved, systemIsDark, setMode, toggle]
  )

  return <ThemeContext.Provider value={value}>{displayContent(children)}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>')
  }
  return context
}
