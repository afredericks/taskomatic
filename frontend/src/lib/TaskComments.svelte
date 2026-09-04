<script lang="ts">
    import { onMount } from 'svelte'

    import { createComment, deleteComment, errorMessages, getCurrentUser } from './api'
    import Avatar from './Avatar.svelte'
    import Capsule from './Capsule.svelte'
    import { signInUrl } from './routes'
    import { formatDateTime, formatRelativeTime } from './time'
    import type { Comment, CurrentUser } from './types'

    /**
     * The comment thread for a task: a composer for signed-in users, the
     * comments themselves (newest first by default), and delete for a
     * comment's author or staff. `comments` is bindable so the parent's copy
     * of the task stays in step with what is posted or removed here.
     */
    let {
        taskId,
        comments = $bindable([]),
    }: {
        taskId: number
        comments?: Comment[]
    } = $props()

    const MIN_LENGTH = 5
    const SIGN_IN_URL = signInUrl(window.location.pathname)
    const MODIFIER = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'

    type Order = 'newest' | 'oldest'

    /** Null until the current user has been looked up. */
    let me = $state<CurrentUser | null>(null)
    let order = $state<Order>('newest')
    let draft = $state('')
    let posting = $state(false)
    let postError = $state('')
    let confirmingId = $state<number | null>(null)
    let deletingId = $state<number | null>(null)
    let deleteError = $state('')
    let justPostedId = $state<number | null>(null)
    let now = $state(new Date())

    onMount(async () => {
        try {
            me = await getCurrentUser()
        } catch {
            // Treat an unreachable sign-in check like being signed out.
            me = { authenticated: false }
        }
    })

    // Tick once a minute so "just now" ages into "3 minutes ago".
    $effect(() => {
        const timer = setInterval(() => (now = new Date()), 60_000)
        return () => clearInterval(timer)
    })

    const sorted = $derived(
        [...comments].sort((a, b) => {
            const byDate = Date.parse(a.created_at) - Date.parse(b.created_at) || a.id - b.id
            return order === 'newest' ? -byDate : byDate
        })
    )

    const trimmed = $derived(draft.trim())
    const remaining = $derived(MIN_LENGTH - trimmed.length)
    const canPost = $derived(remaining <= 0 && !posting)
    const hint = $derived(
        trimmed.length > 0 && remaining > 0
            ? `${remaining} more character${remaining === 1 ? '' : 's'} needed`
            : `${MODIFIER} + Enter to post`
    )

    function isMine(comment: Comment): boolean {
        return me?.authenticated === true && comment.author === me.id
    }

    function canDelete(comment: Comment): boolean {
        return me?.authenticated === true && (me.is_staff || comment.author === me.id)
    }

    function displayName(comment: Comment): string {
        return comment.author_name || comment.author_email.split('@')[0]
    }

    async function submit(event?: SubmitEvent) {
        event?.preventDefault()
        if (!canPost) {
            return
        }

        posting = true
        postError = ''
        const result = await createComment(taskId, trimmed)
        posting = false

        if (result.ok) {
            comments = [result.data, ...comments]
            justPostedId = result.data.id
            draft = ''
        } else if (result.status === 403) {
            // The session ended under us; swap the composer for the sign-in prompt.
            me = { authenticated: false }
        } else {
            postError =
                errorMessages(result.data).join(' ') ||
                'Your comment could not be posted. Try again.'
        }
    }

    function onKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            submit()
        }
    }

    function askToDelete(comment: Comment) {
        confirmingId = comment.id
        deleteError = ''
    }

    async function remove(comment: Comment) {
        deletingId = comment.id
        deleteError = ''
        const { ok, status } = await deleteComment(comment.id)
        deletingId = null

        if (ok) {
            confirmingId = null
            comments = comments.filter((c) => c.id !== comment.id)
        } else {
            deleteError =
                status === 403
                    ? 'You can only delete your own comments.'
                    : 'The comment could not be deleted. Try again.'
        }
    }
</script>

<section class="card comments" aria-labelledby="comments-heading">
    <header class="comments-header">
        <h2 id="comments-heading">
            Comments
            <Capsule variant="primary" dot={false} compact>{comments.length}</Capsule>
        </h2>

        {#if comments.length > 1}
            <div class="segmented" role="group" aria-label="Sort comments">
                <button
                    type="button"
                    aria-pressed={order === 'newest'}
                    onclick={() => (order = 'newest')}
                >
                    Newest
                </button>
                <button
                    type="button"
                    aria-pressed={order === 'oldest'}
                    onclick={() => (order = 'oldest')}
                >
                    Oldest
                </button>
            </div>
        {/if}
    </header>

    {#if me?.authenticated}
        <form class="compose" onsubmit={submit}>
            <Avatar name={me.name} seed={me.email} />
            <div class="compose-body">
                <label class="visually-hidden" for="comment-draft">Add a comment</label>
                <textarea
                    id="comment-draft"
                    placeholder="Write a comment…"
                    bind:value={draft}
                    onkeydown={onKeydown}
                    disabled={posting}
                ></textarea>
                <div class="compose-footer">
                    <span class="hint text-faint">{hint}</span>
                    <button class="btn-primary" type="submit" disabled={!canPost}>
                        {posting ? 'Posting…' : 'Post comment'}
                    </button>
                </div>
                {#if postError}
                    <p class="text-danger error" role="alert">{postError}</p>
                {/if}
            </div>
        </form>
    {:else if me}
        <p class="signin"><a href={SIGN_IN_URL}>Sign in</a> to join the conversation.</p>
    {/if}

    {#if sorted.length}
        <ol class="thread">
            {#each sorted as comment (comment.id)}
                <li
                    class="comment"
                    class:comment--mine={isMine(comment)}
                    class:comment--new={comment.id === justPostedId}
                >
                    <Avatar name={displayName(comment)} seed={comment.author_email} />
                    <article class="bubble">
                        <header class="meta">
                            <strong class="author">{displayName(comment)}</strong>
                            {#if isMine(comment)}
                                <span class="you">You</span>
                            {/if}
                            <time
                                class="text-faint"
                                datetime={comment.created_at}
                                title={formatDateTime(comment.created_at)}
                            >
                                {formatRelativeTime(comment.created_at, now)}
                            </time>
                            {#if canDelete(comment)}
                                <button
                                    type="button"
                                    class="delete"
                                    aria-label="Delete comment"
                                    onclick={() => askToDelete(comment)}
                                >
                                    Delete
                                </button>
                            {/if}
                        </header>
                        <p class="text">{comment.text}</p>
                        {#if confirmingId === comment.id}
                            <div class="confirm" role="group" aria-label="Confirm deletion">
                                <span>Delete this comment?</span>
                                <button
                                    type="button"
                                    class="danger"
                                    disabled={deletingId === comment.id}
                                    onclick={() => remove(comment)}
                                >
                                    Yes, delete
                                </button>
                                <button
                                    type="button"
                                    disabled={deletingId === comment.id}
                                    onclick={() => (confirmingId = null)}
                                >
                                    Cancel
                                </button>
                                {#if deleteError}
                                    <p class="text-danger error" role="alert">{deleteError}</p>
                                {/if}
                            </div>
                        {/if}
                    </article>
                </li>
            {/each}
        </ol>
    {:else}
        <div class="empty">
            <span class="empty-icon" aria-hidden="true">💬</span>
            <p>No comments yet.</p>
            <p class="text-muted">
                {me?.authenticated
                    ? 'Be the first to weigh in.'
                    : 'Sign in to start the conversation.'}
            </p>
        </div>
    {/if}
</section>

<style>
    .comments {
        --avatar-size: 2.25rem;

        margin-top: 2rem;
    }

    .comments-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.75rem 1rem;
        margin-bottom: 1.25rem;
    }

    .comments-header h2 {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin: 0;
    }

    /* Newest / Oldest switch: one glass capsule with the active half filled. */
    .segmented {
        display: inline-flex;
        padding: 0.2rem;
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-pill);
        background: var(--glass-bg);
        box-shadow: inset 0 1px 0 var(--glass-highlight);
    }

    .segmented button {
        padding: 0.25rem 0.85rem;
        border: 0;
        border-radius: var(--radius-pill);
        font-size: 0.8rem;
        color: var(--text-muted);
        background: transparent;
        box-shadow: none;
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
        transition:
            color var(--ease),
            background-color var(--ease),
            box-shadow var(--ease);
    }

    .segmented button:not([aria-pressed='true']):hover {
        color: var(--text);
        background: var(--surface-hover);
    }

    .segmented button[aria-pressed='true'] {
        color: var(--text-on-brand);
        background: var(--gradient-brand);
        box-shadow: 0 4px 12px color-mix(in oklch, var(--primary) 35%, transparent);
    }

    .compose {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.75rem;
        align-items: start;
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border);
    }

    .compose-body {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        min-width: 0;
    }

    /* Grows with its content up to a cap, then scrolls. */
    .compose textarea {
        width: 100%;
        min-height: 3.4rem;
        max-height: 16rem;
        resize: vertical;
        field-sizing: content;
        line-height: 1.5;
    }

    .compose-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.5rem 1rem;
    }

    .hint {
        font-size: 0.8rem;
    }

    .error {
        margin: 0;
        font-size: 0.875rem;
    }

    .signin {
        margin: 0 0 1.5rem;
        padding: 0.75rem 1rem;
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius-sm);
        color: var(--text-muted);
        background: var(--surface-hover);
    }

    .thread {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    /* A rail behind the avatars ties the thread together. */
    .thread::before {
        content: '';
        position: absolute;
        top: 1.5rem;
        bottom: 1.5rem;
        left: calc(var(--avatar-size) / 2 - 1px);
        width: 2px;
        border-radius: 1px;
        background: var(--border-strong);
    }

    .comment {
        position: relative;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.75rem;
        align-items: start;
    }

    .comment--new {
        animation: comment-in 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }

    @keyframes comment-in {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
    }

    .bubble {
        min-width: 0;
        padding: 0.7rem 1rem 0.85rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        border-top-left-radius: var(--radius-sm);
        background: var(--surface-hover);
        transition:
            border-color var(--ease),
            background-color var(--ease);
    }

    .comment:hover .bubble {
        border-color: var(--border-strong);
    }

    .comment--mine .bubble {
        border-color: color-mix(in oklch, var(--primary) 30%, transparent);
        background: color-mix(in oklch, var(--primary) 7%, transparent);
    }

    .meta {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0.35rem 0.6rem;
        margin-bottom: 0.3rem;
        font-size: 0.85rem;
    }

    .author {
        color: var(--text);
    }

    .you {
        padding: 0.05em 0.5em;
        border-radius: var(--radius-pill);
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--primary-text);
        background: var(--primary-soft);
    }

    .meta time {
        font-size: 0.8rem;
    }

    /* Quiet until hovered, then tinted with the danger colour. */
    .delete {
        margin-left: auto;
        padding: 0.1rem 0.5rem;
        border-color: transparent;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-faint);
        background: transparent;
        box-shadow: none;
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
    }

    .delete:hover {
        color: var(--danger-text);
        border-color: color-mix(in oklch, var(--danger) 35%, transparent);
        background: var(--danger-soft);
        box-shadow: none;
    }

    .text {
        margin: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .confirm {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.7rem;
        padding-top: 0.7rem;
        border-top: 1px solid var(--border);
        font-size: 0.85rem;
    }

    .confirm span {
        margin-right: auto;
    }

    .confirm button {
        padding: 0.25rem 0.75rem;
        font-size: 0.8rem;
    }

    .confirm .danger {
        color: var(--text-on-brand);
        background: var(--danger);
        border-color: transparent;
    }

    .confirm .danger:hover {
        filter: brightness(1.08);
    }

    .confirm .error {
        flex-basis: 100%;
    }

    .empty {
        padding: 1.25rem 1rem 0.5rem;
        text-align: center;
    }

    .empty-icon {
        display: block;
        margin-bottom: 0.35rem;
        font-size: 1.75rem;
    }

    .empty p {
        margin: 0;
    }

    @media (max-width: 30rem) {
        .compose {
            grid-template-columns: 1fr;
        }

        .compose :global(.avatar) {
            display: none;
        }
    }
</style>
