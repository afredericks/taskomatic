/**
 * Appearance settings: colour scheme (light/dark) and brand theme variant.
 *
 * The choices are persisted in localStorage and applied as data attributes
 * on <html>, which brand.css picks up (`data-theme` forces a scheme,
 * `data-brand` selects a palette variant).
 */

export type Mode = 'light' | 'dark'
export type ThemeId = 'midnight' | 'red-alert' | 'chrome' | 'daybreak'

export type Theme = {
    id: ThemeId
    label: string
    /** The scheme the theme is designed on; applied when it is selected. */
    foundation: Mode
}

export const THEMES: Theme[] = [
    { id: 'midnight', label: 'Midnight', foundation: 'dark' },
    { id: 'red-alert', label: 'Red Alert', foundation: 'dark' },
    { id: 'chrome', label: 'Chrome', foundation: 'light' },
    { id: 'daybreak', label: 'Daybreak', foundation: 'light' },
]

export type Appearance = {
    /** null follows the operating-system preference. */
    mode: Mode | null
    /** null keeps the baseline brand palette. */
    theme: ThemeId | null
}

const STORAGE_KEY = 'tinypm.appearance'

export function loadAppearance(): Appearance {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
        return {
            mode: stored.mode === 'light' || stored.mode === 'dark' ? stored.mode : null,
            theme: THEMES.some((theme) => theme.id === stored.theme) ? stored.theme : null,
        }
    } catch {
        return { mode: null, theme: null }
    }
}

export function saveAppearance(appearance: Appearance) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance))
}

export function applyAppearance(appearance: Appearance) {
    const root = document.documentElement
    if (appearance.mode) {
        root.dataset.theme = appearance.mode
    } else {
        delete root.dataset.theme
    }
    if (appearance.theme) {
        root.dataset.brand = appearance.theme
    } else {
        delete root.dataset.brand
    }
}

/** The scheme in effect: explicit mode, then theme foundation, then the OS. */
export function resolvedMode(appearance: Appearance): Mode {
    if (appearance.mode) {
        return appearance.mode
    }
    const theme = THEMES.find((t) => t.id === appearance.theme)
    if (theme) {
        return theme.foundation
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
