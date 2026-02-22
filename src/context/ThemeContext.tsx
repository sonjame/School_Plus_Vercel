'use client'
import { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextType {
  darkMode: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) return

    try {
      const parsed = JSON.parse(storedUser)
      const raw = localStorage.getItem(`theme_settings_${parsed.id}`)
      if (!raw) return
      const settings = JSON.parse(raw)
      setDarkMode(Boolean(settings.darkMode))
    } catch {}
  }, [])

  const toggleTheme = () => {
    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) return

    const parsed = JSON.parse(storedUser)
    const newValue = !darkMode

    localStorage.setItem(
      `theme_settings_${parsed.id}`,
      JSON.stringify({ darkMode: newValue }),
    )

    setDarkMode(newValue)
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
