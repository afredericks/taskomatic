import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    applyFilters,
    describeFilter,
    filterUrl,
    filtersToSearchParams,
    matchesFilter,
    parseFilters,
} from './filters'
import type { Filter } from './filters'

describe('matchesFilter', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it('defaults to a case-insensitive equality test on text', () => {
        expect(matchesFilter('Done', { field: 'status', filterText: 'done' })).toBe(true)
        expect(matchesFilter('todo', { field: 'status', filterText: 'done' })).toBe(false)
    })

    it('treats empty filter text as matching missing values', () => {
        expect(matchesFilter(null, { field: 'assignee', filterText: '' })).toBe(true)
        expect(matchesFilter('alice', { field: 'assignee', filterText: '' })).toBe(false)
    })

    it('supports the text operators', () => {
        const contains: Filter = { field: 'title', operator: 'contains', filterText: 'LOG' }
        expect(matchesFilter('Fix the login flow', contains)).toBe(true)
        expect(matchesFilter('Ship the release', contains)).toBe(false)

        const startsWith: Filter = { field: 'title', operator: 'startsWith', filterText: 'fix' }
        expect(matchesFilter('Fix the login flow', startsWith)).toBe(true)
        expect(matchesFilter('Ship the release', startsWith)).toBe(false)

        const neq: Filter = { field: 'status', operator: 'neq', filterText: 'done' }
        expect(matchesFilter('todo', neq)).toBe(true)
        expect(matchesFilter('done', neq)).toBe(false)
        expect(matchesFilter(null, neq)).toBe(true)
    })

    it('compares numbers numerically', () => {
        const filter: Filter = { field: 'count', operator: 'gt', valueType: 'number', filterText: '9' }
        expect(matchesFilter(10, filter)).toBe(true)
        expect(matchesFilter('10', filter)).toBe(true)
        expect(matchesFilter(9, filter)).toBe(false)
        expect(matchesFilter('lots', filter)).toBe(false)

        const asText: Filter = { field: 'count', operator: 'gt', filterText: '9' }
        expect(matchesFilter('10', asText)).toBe(false)
    })

    it('compares dates by calendar day', () => {
        const filter: Filter = { field: 'due', operator: 'lte', valueType: 'date', filterText: '2026-09-04' }
        expect(matchesFilter('2026-09-04', filter)).toBe(true)
        expect(matchesFilter('2026-09-04T18:30:00Z', filter)).toBe(true)
        expect(matchesFilter(new Date('2026-09-05T00:00:00Z'), filter)).toBe(false)
        expect(matchesFilter('not a date', filter)).toBe(false)

        const sameDay: Filter = { field: 'due', valueType: 'date', filterText: '2026-09-04' }
        expect(matchesFilter('2026-09-04T18:30:00Z', sameDay)).toBe(true)
    })

    it('resolves "today" against the current date', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-09-04T12:00:00Z'))

        const before: Filter = { field: 'due', operator: 'lt', valueType: 'date', filterText: 'today' }
        expect(matchesFilter('2026-09-03', before)).toBe(true)
        expect(matchesFilter('2026-09-04', before)).toBe(false)

        const onOrAfter: Filter = { field: 'due', operator: 'gte', valueType: 'date', filterText: 'Today' }
        expect(matchesFilter('2026-09-04', onOrAfter)).toBe(true)
        expect(matchesFilter('2026-09-03', onOrAfter)).toBe(false)
    })

    it('reads booleans from common spellings', () => {
        const filter: Filter = { field: 'archived', valueType: 'boolean', filterText: 'yes' }
        expect(matchesFilter(true, filter)).toBe(true)
        expect(matchesFilter('1', filter)).toBe(true)
        expect(matchesFilter(false, filter)).toBe(false)
        expect(matchesFilter('maybe', filter)).toBe(false)
    })

    it('matches any of a comma-separated list with "in"', () => {
        const filter: Filter = { field: 'status', operator: 'in', filterText: 'todo, in_progress' }
        expect(matchesFilter('todo', filter)).toBe(true)
        expect(matchesFilter('in_progress', filter)).toBe(true)
        expect(matchesFilter('done', filter)).toBe(false)
        expect(matchesFilter(null, filter)).toBe(false)
    })

    it('tests for presence with "empty" and "notEmpty"', () => {
        expect(matchesFilter(null, { field: 'due', operator: 'empty', filterText: '' })).toBe(true)
        expect(matchesFilter('', { field: 'due', operator: 'empty', filterText: '' })).toBe(true)
        expect(matchesFilter('x', { field: 'due', operator: 'empty', filterText: '' })).toBe(false)
        expect(matchesFilter('x', { field: 'due', operator: 'notEmpty', filterText: '' })).toBe(true)
        expect(matchesFilter(null, { field: 'due', operator: 'notEmpty', filterText: '' })).toBe(false)
    })

    it('never orders a missing value', () => {
        const filter: Filter = { field: 'due', operator: 'lt', valueType: 'date', filterText: '2026-01-01' }
        expect(matchesFilter(null, filter)).toBe(false)
        expect(matchesFilter(undefined, filter)).toBe(false)
    })
})

describe('applyFilters', () => {
    const rows = [
        { id: 1, status: 'todo', due: '2026-01-01' },
        { id: 2, status: 'done', due: '2026-02-01' },
        { id: 3, status: 'todo', due: null },
    ]

    it('keeps the rows that satisfy every filter', () => {
        const result = applyFilters(rows, [
            { field: 'status', filterText: 'todo' },
            { field: 'due', operator: 'notEmpty', filterText: '' },
        ])
        expect(result.map((row) => row.id)).toEqual([1])
    })

    it('reads values through the accessor when one is given', () => {
        const result = applyFilters(rows, [{ field: 'year', filterText: '2026' }], (row, field) =>
            field === 'year' ? row.due?.slice(0, 4) : row[field as keyof typeof row]
        )
        expect(result.map((row) => row.id)).toEqual([1, 2])
    })

    it('returns the rows untouched when there are no filters', () => {
        expect(applyFilters(rows, [])).toBe(rows)
    })
})

describe('parseFilters', () => {
    it('reads a bare parameter as an equality test on text', () => {
        expect(parseFilters('?status=done')).toEqual([{ field: 'status', filterText: 'done' }])
    })

    it('reads the operator and value type in either order', () => {
        expect(parseFilters('?due_date__lt__date=today&count__number__gte=2')).toEqual([
            { field: 'due_date', operator: 'lt', valueType: 'date', filterText: 'today' },
            { field: 'count', operator: 'gte', valueType: 'number', filterText: '2' },
        ])
    })

    it('accepts operator names in any case', () => {
        expect(parseFilters('?title__startswith=Fix')).toEqual([
            { field: 'title', operator: 'startsWith', filterText: 'Fix' },
        ])
    })

    it('decodes encoded values', () => {
        expect(parseFilters('?project_name=Website+Redesign&title__contains=a%26b')).toEqual([
            { field: 'project_name', filterText: 'Website Redesign' },
            { field: 'title', operator: 'contains', filterText: 'a&b' },
        ])
    })

    it('ignores parameters with an unknown modifier', () => {
        expect(parseFilters('?status__like=done&page=2')).toEqual([
            { field: 'page', filterText: '2' },
        ])
    })

    it('ignores fields outside the allowed list', () => {
        expect(parseFilters('?status=done&utm_source=mail', { fields: ['status'] })).toEqual([
            { field: 'status', filterText: 'done' },
        ])
    })

    it('accepts URLSearchParams and repeated fields', () => {
        const params = new URLSearchParams([
            ['due_date__gte', '2026-01-01'],
            ['due_date__lt', '2026-02-01'],
        ])
        expect(parseFilters(params)).toEqual([
            { field: 'due_date', operator: 'gte', filterText: '2026-01-01' },
            { field: 'due_date', operator: 'lt', filterText: '2026-02-01' },
        ])
    })

    it('returns nothing for an empty query string', () => {
        expect(parseFilters('')).toEqual([])
    })
})

describe('filtersToSearchParams and filterUrl', () => {
    it('omits the default operator and value type', () => {
        const params = filtersToSearchParams([
            { field: 'status', filterText: 'done' },
            { field: 'status', operator: 'eq', valueType: 'text', filterText: 'todo' },
            { field: 'due_date', operator: 'lt', valueType: 'date', filterText: 'today' },
        ])
        expect(params.toString()).toBe('status=done&status=todo&due_date__lt__date=today')
    })

    it('round-trips through parseFilters', () => {
        const filters: Filter[] = [
            { field: 'project_name', filterText: 'Website Redesign' },
            { field: 'due_date', operator: 'gte', valueType: 'date', filterText: 'today' },
            { field: 'status', operator: 'in', filterText: 'todo,in_progress' },
        ]
        expect(parseFilters(filtersToSearchParams(filters))).toEqual(filters)
    })

    it('appends the query string to the path', () => {
        expect(filterUrl('/pm/app/tasks/', [{ field: 'status', filterText: 'done' }])).toBe(
            '/pm/app/tasks/?status=done'
        )
    })

    it('returns the bare path when there are no filters', () => {
        expect(filterUrl('/pm/app/tasks/', [])).toBe('/pm/app/tasks/')
    })
})

describe('describeFilter', () => {
    it('spells out the field, operator and value', () => {
        expect(describeFilter({ field: 'status', filterText: 'done' })).toBe('status = done')
        expect(describeFilter({ field: 'due', operator: 'lt', filterText: 'today' })).toBe(
            'due < today'
        )
        expect(describeFilter({ field: 'title', operator: 'contains', filterText: 'x' })).toBe(
            'title contains x'
        )
    })

    it('leaves the value out of presence tests', () => {
        expect(describeFilter({ field: 'due', operator: 'empty', filterText: '' })).toBe(
            'due is empty'
        )
    })

    it('uses the label and format callbacks', () => {
        const described = describeFilter(
            { field: 'status', operator: 'in', filterText: 'todo,in_progress' },
            {
                label: (field) => field.toUpperCase(),
                format: (_field, value) => value.replace('_', ' '),
            }
        )
        expect(described).toBe('STATUS is one of todo, in progress')
    })
})
