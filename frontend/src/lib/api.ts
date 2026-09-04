/**
 * The client for the DRF API at /pm/api/.
 *
 * Reads return the parsed body and throw an ApiError on an error status.
 * Writes never throw for an error status: they return an ApiResult so the
 * caller can show the validation messages in the body.
 */

import type { Comment, CurrentUser, NewTask, Project, Task, TaskStatus, User } from './types'

const API_ROOT = '/pm/api'

export type ApiResult<T> =
    | { ok: true; status: number; data: T }
    | { ok: false; status: number; data: unknown }

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly data: unknown
    ) {
        super(`The API answered ${status}`)
        this.name = 'ApiError'
    }
}

function getCookie(name: string): string {
    const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'))
    return match ? decodeURIComponent(match[2]) : ''
}

async function parseBody(response: Response): Promise<unknown> {
    return response.json().catch(() => null)
}

async function read<T>(path: string): Promise<T> {
    const response = await fetch(`${API_ROOT}${path}`)
    if (!response.ok) {
        throw new ApiError(response.status, await parseBody(response))
    }
    return (await response.json()) as T
}

/** Django's CSRF check wants the cookie echoed in a header on unsafe methods. */
async function write<T>(
    method: 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown
): Promise<ApiResult<T>> {
    const headers: Record<string, string> = { 'X-CSRFToken': getCookie('csrftoken') }
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${API_ROOT}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = await parseBody(response)

    return response.ok
        ? { ok: true, status: response.status, data: data as T }
        : { ok: false, status: response.status, data }
}

export function getCurrentUser(): Promise<CurrentUser> {
    return read('/me/')
}

/** The active users, for the assignee picker. */
export function getUsers(): Promise<User[]> {
    return read('/users/')
}

export function getProjects(): Promise<Project[]> {
    return read('/projects/')
}

export function getTasks(): Promise<Task[]> {
    return read('/tasks/')
}

export function getTask(id: number): Promise<Task> {
    return read(`/tasks/${id}/`)
}

export function createTask(task: NewTask): Promise<ApiResult<unknown>> {
    return write('POST', '/tasks/', task)
}

export function updateTaskStatus(id: number, status: TaskStatus): Promise<ApiResult<unknown>> {
    return write('PATCH', `/tasks/${id}/`, { status })
}

/** Assigns the task to a user, or to nobody with null. */
export function updateTaskAssignee(
    id: number,
    assignee: number | null
): Promise<ApiResult<unknown>> {
    return write('PATCH', `/tasks/${id}/`, { assignee })
}

/** Posts a comment as the signed-in user. On success `data` is the new comment. */
export function createComment(taskId: number, text: string): Promise<ApiResult<Comment>> {
    return write('POST', `/tasks/${taskId}/comments/`, { text })
}

export function deleteComment(id: number): Promise<ApiResult<null>> {
    return write('DELETE', `/comments/${id}/`)
}

function stringsIn(value: unknown): string[] {
    return [value].flat().filter((item): item is string => typeof item === 'string')
}

/**
 * The messages in a DRF error body, which is one of `{field: [messages]}`,
 * `{non_field_errors: [messages]}` and `{detail: message}`.
 */
export function errorMessages(data: unknown): string[] {
    if (!data || typeof data !== 'object') {
        return []
    }
    return Object.values(data).flatMap(stringsIn)
}

/** The first message in a DRF error body, or `fallback` when there is none. */
export function firstErrorMessage(data: unknown, fallback: string): string {
    return errorMessages(data)[0] ?? fallback
}

/** A DRF error body as `{field: messages}`, for showing errors beside each field. */
export function fieldErrors(data: unknown): Record<string, string[]> {
    if (!data || typeof data !== 'object') {
        return {}
    }
    const errors: Record<string, string[]> = {}
    for (const [field, value] of Object.entries(data)) {
        const messages = stringsIn(value)
        if (messages.length) {
            errors[field] = messages
        }
    }
    return errors
}
