/**
 * The frontend's pages. Django serves the same shell for every path under
 * /pm/app/ (see task/urls.py) and App.svelte picks the page from the path,
 * so this is the one place that knows which URL is which.
 */

const APP_ROOT = '/pm/app'

export const ROUTES = {
    home: `${APP_ROOT}/`,
    tasks: `${APP_ROOT}/tasks/`,
    newTask: `${APP_ROOT}/tasks/new/`,
    settings: `${APP_ROOT}/settings/`,
} as const

export function taskUrl(id: number): string {
    return `${ROUTES.tasks}${id}/`
}

/** The admin sign-in page, returning to `next` afterwards. */
export function signInUrl(next: string): string {
    return `/admin/login/?next=${encodeURIComponent(next)}`
}

export type Route =
    | { page: 'home' }
    | { page: 'tasks' }
    | { page: 'new-task' }
    | { page: 'task'; id: number }
    | { page: 'settings' }

const TASK_PATH = new RegExp(`^${APP_ROOT}/tasks/(\\d+)$`)

function withoutTrailingSlash(path: string): string {
    return path.replace(/\/+$/, '')
}

/**
 * The page a path shows, or null for paths outside the app. Trailing slashes
 * are optional.
 */
export function matchRoute(pathname: string): Route | null {
    const path = withoutTrailingSlash(pathname)

    switch (path) {
        case withoutTrailingSlash(ROUTES.home):
            return { page: 'home' }
        case withoutTrailingSlash(ROUTES.tasks):
            return { page: 'tasks' }
        case withoutTrailingSlash(ROUTES.newTask):
            return { page: 'new-task' }
        case withoutTrailingSlash(ROUTES.settings):
            return { page: 'settings' }
    }

    const task = path.match(TASK_PATH)
    return task ? { page: 'task', id: Number(task[1]) } : null
}
