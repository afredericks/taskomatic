<script lang="ts">
    import './Avatar.css'

    import { hueFor, initials } from './avatar'

    /**
     * Initials in a circle, tinted by a hue derived from `seed` (an email,
     * say) so the same person always gets the same colour. Only the hue is
     * set inline; lightness and chroma stay here so it sits with the palette.
     * Sized by the `--avatar-size` custom property of whatever it sits in.
     */
    let { name, seed = name }: { name: string; seed?: string } = $props()
</script>

<span class="avatar" style="--avatar-hue: {hueFor(seed)}" aria-hidden="true">{initials(name)}</span>
