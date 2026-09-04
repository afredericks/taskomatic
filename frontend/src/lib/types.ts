/** Shapes of the JSON the API at /pm/api/ returns. Dates are ISO strings. */

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Project {
    id: number
    name: string
    description: string
    created_at: string
    task_count: number
}

export interface Comment {
    id: number
    text: string
    author: number
    author_email: string
    /** Full name, falling back to the username. */
    author_name: string
    created_at: string
}

export interface Task {
    id: number
    title: string
    description: string
    status: TaskStatus
    /** A date only, e.g. "2026-09-05"; null when no due date is set. */
    due_date: string | null
    project: number
    project_name: string
    assignee: number | null
    assignee_email: string | null
    /** Full name, falling back to the username; null when unassigned. */
    assignee_name: string | null
    comments: Comment[]
    comment_count: number
    created_at: string
    updated_at: string
}

/** The fields accepted when creating a task. */
export interface NewTask {
    title: string
    description?: string
    status?: TaskStatus
    due_date?: string | null
    project: number
    assignee?: number | null
}

/** A user as listed by /pm/api/users/, for picking an assignee. */
export interface User {
    id: number
    username: string
    email: string
    /** Full name, falling back to the username. */
    name: string
}

/** Who the browser is signed in as, from /pm/api/me/. */
export type CurrentUser =
    | { authenticated: false }
    | {
          authenticated: true
          id: number
          username: string
          email: string
          name: string
          is_staff: boolean
      }
