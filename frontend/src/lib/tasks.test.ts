import { describe, expect, it } from 'vitest'

import { compareDueDates, daysOverdue, isOverdue } from './tasks'

const NOW = new Date('2026-09-05T15:00:00Z')

describe('daysOverdue', () => {
    it('counts the days past the due date', () => {
        expect(daysOverdue({ due_date: '2026-09-02', status: 'todo' }, NOW)).toBe(3)
        expect(daysOverdue({ due_date: '2026-09-04', status: 'in_progress' }, NOW)).toBe(1)
    })

    it('is 0 for tasks due today or later', () => {
        expect(daysOverdue({ due_date: '2026-09-05', status: 'todo' }, NOW)).toBe(0)
        expect(daysOverdue({ due_date: '2026-09-09', status: 'todo' }, NOW)).toBe(0)
    })

    it('is 0 for done or undated tasks however old they are', () => {
        expect(daysOverdue({ due_date: '2020-01-01', status: 'done' }, NOW)).toBe(0)
        expect(daysOverdue({ due_date: null, status: 'todo' }, NOW)).toBe(0)
    })
})

describe('isOverdue', () => {
    it('is true only for open tasks past their due date', () => {
        expect(isOverdue({ due_date: '2026-09-04', status: 'todo' }, NOW)).toBe(true)
        expect(isOverdue({ due_date: '2026-09-05', status: 'todo' }, NOW)).toBe(false)
        expect(isOverdue({ due_date: '2026-09-04', status: 'done' }, NOW)).toBe(false)
        expect(isOverdue({ due_date: null, status: 'todo' }, NOW)).toBe(false)
    })
})

describe('compareDueDates', () => {
    it('orders soonest first and undated last', () => {
        const tasks = [
            { due_date: null },
            { due_date: '2026-09-09' },
            { due_date: '2026-09-02' },
            { due_date: null },
        ]

        expect([...tasks].sort(compareDueDates).map((task) => task.due_date)).toEqual([
            '2026-09-02',
            '2026-09-09',
            null,
            null,
        ])
    })
})
