export type ToastTone = 'success' | 'danger'

export type Toast = { id: number; message: string; tone: ToastTone }

let nextId = 0

/** The queue rendered by Toasts.svelte; mounted once in App.svelte. */
export const toasts = $state<Toast[]>([])

export function showToast(message: string, tone: ToastTone = 'success', duration = 3500) {
    const id = ++nextId
    toasts.push({ id, message, tone })
    setTimeout(() => dismissToast(id), duration)
}

export function dismissToast(id: number) {
    const index = toasts.findIndex((toast) => toast.id === id)
    if (index !== -1) {
        toasts.splice(index, 1)
    }
}

export function clearToasts() {
    toasts.length = 0
}
