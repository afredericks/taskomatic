<script lang="ts">
    import './Settings.css'

    import {
        THEMES,
        applyAppearance,
        loadAppearance,
        resolvedMode,
        saveAppearance,
        type Appearance,
        type ThemeId,
    } from './theme'

    /* Preview dots per theme: brand colour, accent colour, foundation backdrop. */
    const SWATCHES: Record<ThemeId, string[]> = {
        midnight: ['oklch(72% 0.2 265)', 'oklch(74% 0.2 210)', 'oklch(13% 0.03 265)'],
        'red-alert': ['oklch(72% 0.19 20)', 'oklch(74% 0.2 50)', 'oklch(13% 0.03 20)'],
        chrome: ['oklch(48% 0.06 240)', 'oklch(60% 0.07 255)', 'oklch(97% 0.005 240)'],
        daybreak: ['oklch(58% 0.25 45)', 'oklch(62% 0.26 355)', 'oklch(97% 0.012 45)'],
    }

    let appearance = $state<Appearance>(loadAppearance())
    const darkMode = $derived(resolvedMode(appearance) === 'dark')

    function update(next: Appearance) {
        appearance = next
        applyAppearance(next)
        saveAppearance(next)
    }

    function toggleMode() {
        update({ ...appearance, mode: darkMode ? 'light' : 'dark' })
    }

    function selectTheme(id: ThemeId) {
        const foundation = THEMES.find((theme) => theme.id === id)?.foundation ?? null
        update({ theme: id, mode: foundation })
    }

    function reset() {
        update({ mode: null, theme: null })
    }
</script>

<div class="settings">
    <h1>Settings</h1>

    <section class="card">
        <h2>Appearance</h2>

        <div class="setting">
            <div>
                <strong>Dark mode</strong>
                <p class="text-muted text-light">
                    Switch between the light and dark foundation. Until you choose, Taskomatic
                    follows your operating system.
                </p>
            </div>
            <button
                type="button"
                role="switch"
                class="switch"
                aria-checked={darkMode}
                aria-label="Dark mode"
                onclick={toggleMode}
            ></button>
        </div>

        <fieldset class="themes">
            <legend>Theme</legend>
            {#each THEMES as theme (theme.id)}
                <label class="theme-card" class:selected={appearance.theme === theme.id}>
                    <input
                        type="radio"
                        name="theme"
                        value={theme.id}
                        checked={appearance.theme === theme.id}
                        onchange={() => selectTheme(theme.id)}
                    />
                    <span class="swatches">
                        {#each SWATCHES[theme.id] as color (color)}
                            <span class="swatch" style="background: {color}"></span>
                        {/each}
                    </span>
                    <span class="theme-name">{theme.label}</span>
                    <span class="foundation">{theme.foundation} foundation</span>
                </label>
            {/each}
        </fieldset>

        <button type="button" onclick={reset}>Reset to defaults</button>
    </section>
</div>
