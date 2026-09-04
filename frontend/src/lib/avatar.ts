/** Helpers behind the initials avatars (see Avatar.svelte). */

/** Up to two letters: the first and last word of a name, or the first two of a single word. */
export function initials(name: string): string {
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean)
    if (parts.length === 0) {
        return '?'
    }
    const letters =
        parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
    return letters.toUpperCase()
}

/** A stable hue (0 to 359) per seed, so the same person always gets the same colour. */
export function hueFor(seed: string): number {
    let hash = 0
    for (const char of seed) {
        hash = (hash * 31 + (char.codePointAt(0) ?? 0)) | 0
    }
    return Math.abs(hash) % 360
}
