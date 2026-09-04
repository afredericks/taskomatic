<script lang="ts">
    /**
     * The Taskomatic mark: a little robot whose smile is a progress bar.
     *
     * The rounded square is the robot's head. Its smile draws itself in like a
     * task filling up and the antenna light flashes "done" when it completes.
     * Colours come from the brand tokens so the mark repaints with the theme
     * variants. src/tinypm/static/favicon.svg is the same robot with the
     * baseline colours baked in, winking with a tick for an eye instead.
     */
    let { size = 32 }: { size?: number | string } = $props()

    // SVG gradients are referenced by id, so each instance needs its own.
    const uid = $props.id()
    const bodyId = `${uid}-body`
    const shineId = `${uid}-shine`
</script>

<svg
    class="logo"
    width={size}
    height={size}
    viewBox="0 0 64 64"
    aria-hidden="true"
    focusable="false"
>
    <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style="stop-color: var(--primary)" />
            <stop offset="1" style="stop-color: var(--accent)" />
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0.38" />
            <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
    </defs>

    <!-- Antenna; the bulb flashes "done" when the smile completes -->
    <g class="antenna">
        <line class="stem" x1="32" y1="8" x2="32" y2="16" />
        <circle class="bulb" cx="32" cy="6.5" r="4.5" />
    </g>

    <!-- Ears -->
    <rect x="1" y="30" width="7" height="16" rx="3.5" fill="url(#{bodyId})" />
    <rect x="56" y="30" width="7" height="16" rx="3.5" fill="url(#{bodyId})" />

    <!-- Head, with a glass shine across the top -->
    <rect x="7" y="15" width="50" height="46" rx="15" fill="url(#{bodyId})" />
    <rect x="9" y="17" width="46" height="24" rx="13" fill="url(#{shineId})" />

    <!-- Eyes -->
    <circle class="eye" cx="23" cy="33" r="4.5" fill="#fff" />
    <circle class="eye" cx="41" cy="33" r="4.5" fill="#fff" />

    <!-- The smile is a progress bar: a faint track and a fill that draws in -->
    <path class="smile-track" d="M21 44 Q32 54 43 44" />
    <path class="smile" d="M21 44 Q32 54 43 44" pathLength="100" />
</svg>

<style>
    .logo {
        display: block;
        flex: none;
        overflow: visible;
        filter: drop-shadow(0 2px 6px color-mix(in oklch, var(--primary) 35%, transparent));
        transform-origin: 50% 90%;
        transition: transform var(--ease);
    }

    .stem {
        stroke: var(--primary);
        stroke-width: 4;
        stroke-linecap: round;
    }

    .bulb {
        fill: var(--accent);
        animation: done-flash 8s ease-in-out infinite;
    }

    .antenna {
        transition: filter var(--ease);
    }

    .eye {
        transform-box: fill-box;
        transform-origin: center;
        animation: blink 5s infinite;
    }

    .smile-track,
    .smile {
        fill: none;
        stroke: #fff;
        stroke-width: 5;
        stroke-linecap: round;
    }

    .smile-track {
        opacity: 0.28;
    }

    .smile {
        /* One dash the length of the path, with a gap long enough that no
           neighbouring dash shows while the offset travels off either end. */
        stroke-dasharray: 100 200;
        stroke-dashoffset: 0;
        animation: fill-smile 8s ease-in-out infinite;
    }

    @keyframes blink {
        0%,
        94%,
        100% {
            transform: scaleY(1);
        }
        97% {
            transform: scaleY(0.1);
        }
    }

    /* Rest empty, draw the smile in from the left, hold it, then let it slide
       off the right end like a finished item scrolling away, and rest again.
       The offsets overshoot the path length by 3 so the round caps stay
       hidden at both ends, and the loop point joins two invisible states. */
    @keyframes fill-smile {
        0%,
        6% {
            stroke-dashoffset: 103;
        }
        40%,
        82% {
            stroke-dashoffset: 0;
        }
        94%,
        100% {
            stroke-dashoffset: -103;
        }
    }

    /* The bulb turns "done" green as the smile completes, then settles. */
    @keyframes done-flash {
        0%,
        38%,
        66%,
        100% {
            fill: var(--accent);
            filter: none;
        }
        44%,
        58% {
            fill: var(--success);
            filter: drop-shadow(0 0 3px var(--success)) drop-shadow(0 0 8px var(--success));
        }
    }

    /* Hover reactions: the mark tilts its head and the antenna lights up.
       They fire when the mark itself or the link wrapping it is hovered. */
    .logo:hover,
    :global(a:hover) > .logo,
    :global(a:focus-visible) > .logo {
        transform: rotate(-8deg);
    }

    .logo:hover .antenna,
    :global(a:hover) > .logo .antenna,
    :global(a:focus-visible) > .logo .antenna {
        filter: drop-shadow(0 0 4px var(--accent)) drop-shadow(0 0 10px var(--accent));
    }

    @media (prefers-reduced-motion: reduce) {
        .eye,
        .bulb,
        .smile {
            animation: none;
        }

        .smile-track {
            opacity: 0;
        }
    }
</style>
