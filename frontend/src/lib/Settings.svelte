<script lang="ts">
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

<h1>Settings</h1>

<section class="card">
    <h2>Appearance</h2>

    <div class="setting">
        <div>
            <strong>Dark mode</strong>
            <p class="text-muted">
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

<style>
    .card {
        max-width: 40rem;
    }

    .card h2 {
        margin-top: 0;
    }

    .setting {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
    }

    .setting p {
        margin: 0.25rem 0 0;
        font-size: 0.875rem;
    }

    /* Track and thumb; overrides the global glass button styling. */
    .switch {
        flex-shrink: 0;
        width: 3.2rem;
        height: 1.8rem;
        padding: 3px;
        border-radius: var(--radius-pill);
        background: var(--glass-bg-strong);
        transition: background var(--ease), border-color var(--ease);
    }

    .switch::before {
        content: '';
        display: block;
        width: 1.3rem;
        height: 1.3rem;
        border-radius: 50%;
        background: var(--text-muted);
        transition: transform var(--ease), background var(--ease);
    }

    .switch[aria-checked='true'] {
        background: var(--gradient-brand);
        border-color: transparent;
    }

    .switch[aria-checked='true']::before {
        background: var(--text-on-brand);
        transform: translateX(1.4rem);
    }

    .themes {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
        gap: 0.75rem;
        margin: 1.5rem 0;
        padding: 0;
        border: 0;
    }

    legend {
        padding: 0;
        margin-bottom: 0.75rem;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-muted);
    }

    .theme-card {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding: 0.9rem 1rem;
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm);
        background: var(--glass-bg);
        cursor: pointer;
        transition: border-color var(--ease), box-shadow var(--ease);
    }

    .theme-card:hover {
        border-color: var(--border-strong);
    }

    .theme-card.selected {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--ring);
    }

    .theme-card input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
    }

    .theme-card:has(input:focus-visible) {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }

    .swatches {
        display: flex;
        gap: 0.3rem;
    }

    .swatch {
        width: 1.1rem;
        height: 1.1rem;
        border-radius: 50%;
        border: 1px solid var(--border-strong);
    }

    .theme-name {
        font-weight: 600;
        color: var(--text);
    }

    .foundation {
        font-size: 0.75rem;
        color: var(--text-faint);
    }
</style>
