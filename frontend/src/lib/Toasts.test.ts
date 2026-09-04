import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it } from 'vitest'

import { clearToasts, showToast } from './toast.svelte'
import Toasts from './Toasts.svelte'

describe('Toasts', () => {
    beforeEach(() => {
        clearToasts()
    })

    it('shows a toast when one is raised', async () => {
        render(Toasts)

        showToast('Task saved')

        await waitFor(() => {
            expect(screen.getByText('Task saved')).toBeInTheDocument()
        })
        expect(screen.getByRole('status')).toHaveTextContent('Task saved')
    })

    it('marks danger toasts', async () => {
        const { container } = render(Toasts)

        showToast('It broke', 'danger')

        await waitFor(() => {
            expect(container.querySelector('.toast--danger')).toHaveTextContent('It broke')
        })
    })

    it('can be dismissed', async () => {
        render(Toasts)

        showToast('Going away')
        await waitFor(() => {
            expect(screen.getByText('Going away')).toBeInTheDocument()
        })

        await fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))

        expect(screen.queryByText('Going away')).toBeNull()
    })
})
