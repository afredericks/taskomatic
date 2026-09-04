import type { CapsuleVariant } from './Capsule.svelte'
import type { TaskStatus } from './types'

type StatusMeta = { label: string; variant: CapsuleVariant }

/** Every task status, in the order the UI lists them. */
export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const satisfies readonly TaskStatus[]

/** Display metadata per status, keyed the way the API spells them. */
export const STATUSES: Record<TaskStatus, StatusMeta> = {
    todo: { label: 'To Do', variant: 'todo' },
    in_progress: { label: 'In Progress', variant: 'in-progress' },
    done: { label: 'Done', variant: 'done' },
}

export function isTaskStatus(value: unknown): value is TaskStatus {
    return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value)
}

/** The label for a status; unknown values (say, from a URL) are shown as they are. */
export function statusLabel(status: string): string {
    return isTaskStatus(status) ? STATUSES[status].label : status
}

export function statusVariant(status: string): CapsuleVariant {
    return isTaskStatus(status) ? STATUSES[status].variant : 'todo'
}
