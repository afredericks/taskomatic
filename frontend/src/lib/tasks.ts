/** Rules about tasks that more than one page applies, so they all agree. */

import { daysUntil } from './time'
import type { Task } from './types'

type Due = Pick<Task, 'due_date' | 'status'>

/**
 * Whole days past the due date, counted on the UTC calendar like `daysUntil`;
 * 0 for tasks that are done, undated, or not yet due.
 */
export function daysOverdue(task: Due, now: Date = new Date()): number {
    if (task.status === 'done') {
        return 0
    }
    const days = daysUntil(task.due_date, now)
    return days === null ? 0 : Math.max(0, -days)
}

/** Past its due date and still open. */
export function isOverdue(task: Due, now: Date = new Date()): boolean {
    return daysOverdue(task, now) > 0
}

/** Sorts soonest due first, with undated tasks last. */
export function compareDueDates(a: Pick<Task, 'due_date'>, b: Pick<Task, 'due_date'>): number {
    if (a.due_date === b.due_date) {
        return 0
    }
    if (!a.due_date) {
        return 1
    }
    if (!b.due_date) {
        return -1
    }
    return a.due_date < b.due_date ? -1 : 1
}
