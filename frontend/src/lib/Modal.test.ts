import { fireEvent, render, screen } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { describe, expect, it } from 'vitest'

import Modal from './Modal.svelte'

function renderModal(open = true) {
    return render(Modal, {
        props: {
            open,
            title: 'Comments',
            children: createRawSnippet(() => ({ render: () => '<p>Modal body</p>' })),
        },
    })
}

describe('Modal', () => {
    it('shows the title and children when open', () => {
        renderModal()

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveTextContent('Comments')
        expect(dialog).toHaveTextContent('Modal body')
    })

    it('stays closed when open is false', () => {
        const { container } = renderModal(false)

        expect(container.querySelector('dialog')!.open).toBe(false)
    })

    it('closes on the close button', async () => {
        const { container } = renderModal()

        await fireEvent.click(screen.getByRole('button', { name: 'Close' }))

        expect(container.querySelector('dialog')!.open).toBe(false)
    })

    it('closes on a backdrop click', async () => {
        const { container } = renderModal()
        const dialog = container.querySelector('dialog')!

        await fireEvent.click(dialog)

        expect(dialog.open).toBe(false)
    })

    it('does not close on a click inside the content', async () => {
        const { container } = renderModal()

        await fireEvent.click(screen.getByText('Modal body'))

        expect(container.querySelector('dialog')!.open).toBe(true)
    })
})
