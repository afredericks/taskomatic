import { getContext, setContext } from 'svelte'

/**
 * The contract between a PagePanel and the components inside it.
 *
 * Normally the panel scrolls the page. A component that would rather own
 * the scrolling itself (the Grid in `fill` mode) asks the panel to size its
 * body to the viewport instead; the panel then lays the body out as a flex
 * column so the requester can stretch into the remaining height.
 */
export type PagePanelContext = {
    /** Starts a fill request. Call the returned function to withdraw it. */
    requestFill: () => () => void
}

export const PAGE_PANEL = Symbol('page-panel')

/** Called by PagePanel during setup. */
export function setPagePanel(context: PagePanelContext): void {
    setContext(PAGE_PANEL, context)
}

/** The enclosing panel's contract, or undefined outside a PagePanel. */
export function getPagePanel(): PagePanelContext | undefined {
    return getContext<PagePanelContext | undefined>(PAGE_PANEL)
}
