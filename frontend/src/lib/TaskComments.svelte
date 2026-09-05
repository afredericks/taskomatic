<script lang="ts">
    import './TaskComments.css'

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
            <p class="text-muted text-light">
                {me?.authenticated
                    ? 'Be the first to weigh in.'
                    : 'Sign in to start the conversation.'}
            </p>
        </div>
    {/if}
</section>
