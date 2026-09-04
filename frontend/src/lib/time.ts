/**
 * Human-readable dates and times: relative forms for comment threads and due
 * dates, and the full form for the tooltip beside them.
 */

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/** Says "today", "tomorrow" and "yesterday" instead of counting to 0 or 1 day. */
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
/** Always counts, so weeks and months read "in 1 week" rather than "next week". */
const counted = new Intl.RelativeTimeFormat('en', { numeric: 'always' })

/** "just now", "5 minutes ago", "yesterday", or a short date once it's a week old. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
        return ''
    }

    const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
    const elapsed = Math.abs(seconds)

    if (elapsed < MINUTE) {
        return 'just now'
    }
    if (elapsed < HOUR) {
        return relative.format(Math.trunc(seconds / MINUTE), 'minute')
    }
    if (elapsed < DAY) {
        return relative.format(Math.trunc(seconds / HOUR), 'hour')
    }
    if (elapsed < WEEK) {
        return relative.format(Math.trunc(seconds / DAY), 'day')
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    })
}

/**
 * Whole days from today until a date-only value ("2026-09-05"): 0 for today,
 * 1 for tomorrow, -3 for three days ago. Null when there is no usable date.
 *
 * Days are counted on the UTC calendar, which is how the dashboard's `today`
 * is derived, so a task filtered as due today is also labelled "today".
 */
export function daysUntil(
    dateOnly: string | null | undefined,
    now: Date = new Date()
): number | null {
    if (!dateOnly) {
        return null
    }
    // A date-only ISO string parses as midnight UTC.
    const due = new Date(dateOnly)
    if (Number.isNaN(due.getTime())) {
        return null
    }
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    return Math.round((due.getTime() - today) / (DAY * 1000))
}

/**
 * How far off a date-only due date ("2026-09-05") is: "today", "tomorrow",
 * "in 3 days", "in 2 weeks", "in 4 months", "in 2 years". Past dates read
 * "yesterday", "3 days ago" and so on.
 */
export function formatDueIn(dueDate: string, now: Date = new Date()): string {
    const days = daysUntil(dueDate, now)
    if (days === null) {
        return ''
    }
    const away = Math.abs(days)

    if (away < 7) {
        return relative.format(days, 'day')
    }
    if (away < 30) {
        return counted.format(Math.trunc(days / 7), 'week')
    }
    if (away < 365) {
        return counted.format(Math.trunc(days / 30), 'month')
    }
    return counted.format(Math.trunc(days / 365), 'year')
}

/**
 * A date-only value ("2026-09-05") in full: "Sep 5, 2026", or
 * "September 5, 2026" with the `long` style.
 */
export function formatDate(dateOnly: string, style: 'medium' | 'long' = 'medium'): string {
    const date = new Date(dateOnly)
    if (Number.isNaN(date.getTime())) {
        return ''
    }
    // Format in UTC too, or the day shifts back one in western time zones.
    return date.toLocaleDateString('en-US', { dateStyle: style, timeZone: 'UTC' })
}

/** The complete timestamp, e.g. "Sep 3, 2026, 9:30 AM". */
export function formatDateTime(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
        return ''
    }
    return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}
