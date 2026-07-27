export interface Comment {
    id: number
    text: string
    author_email: string
    created_at: string
}

export interface Task {
    id: number
    title: string
    description: string
    status: string
    due_date: Date
    project: number
    project_name: string
    assignee: number
    assignee_email: string
    comments: Comment[]
    comment_count?: number
    created_at: string
    updated_at: string
}
