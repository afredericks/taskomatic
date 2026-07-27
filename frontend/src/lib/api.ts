import type { Task } from './types'

const API_ROOT = '/pm/api'

function getCookie(name: string) {
    const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'))
    return match ? decodeURIComponent(match[2]) : ''
}

export async function getTasks(): Promise<any> {
    const response = await fetch(`${API_ROOT}/tasks/`)
    return await response.json()
}

export async function getTask(id: number): Promise<Task> {
    const response = await fetch(`${API_ROOT}/tasks/${id}/`)
    const data = await response.json()
    return data as Task
}

export async function updateTaskStatus(id: number, status: string): Promise<any> {
    const response = await fetch(`${API_ROOT}/tasks/${id}/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ status: status }),
    })
    return await response.json()
}
