/**
 * Field-level filtering shared by the Grid and the pages that drive it.
 *
 * A filter says "this field <operator> this value":
 *
 *     { field: 'status', filterText: 'done' }
 *     { field: 'due_date', operator: 'lt', valueType: 'date', filterText: 'today' }
 *
 * Filters travel in URLs as Django-style lookups, one query parameter each.
 * The field name may be followed by the operator and the value type,
 * separated by double underscores, in either order. Both are optional and
 * default to an equality test on text:
 *
 *     ?status=done&due_date__lt__date=today&title__contains=login
 *
 * Text comparisons ignore case. Dates compare by calendar day and accept
 * the literal `today`, so links that mean "before today" stay correct
 * however long ago they were made.
 */

export const FILTER_OPERATORS = [
    'eq',
    'neq',
    'contains',
    'startsWith',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'empty',
    'notEmpty',
] as const

export type FilterOperator = (typeof FILTER_OPERATORS)[number]

export const FILTER_VALUE_TYPES = ['text', 'number', 'date', 'boolean'] as const

export type FilterValueType = (typeof FILTER_VALUE_TYPES)[number]

export type Filter = {
    /** Row field (or grid column key) the filter applies to. */
    field: string
    /** The value to compare against, as typed or as found in the URL. */
    filterText: string
    /** Defaults to `eq`. */
    operator?: FilterOperator
    /** Defaults to `text`; a grid column may supply its own default. */
    valueType?: FilterValueType
}

export const DEFAULT_OPERATOR: FilterOperator = 'eq'
export const DEFAULT_VALUE_TYPE: FilterValueType = 'text'

const OPERATOR_LABELS: Record<FilterOperator, string> = {
    eq: '=',
    neq: '≠',
    contains: 'contains',
    startsWith: 'starts with',
    lt: '<',
    lte: '≤',
    gt: '>',
    gte: '≥',
    in: 'is one of',
    empty: 'is empty',
    notEmpty: 'is not empty',
}

const TRUE_WORDS = ['true', '1', 'yes', 'y', 'on']
const FALSE_WORDS = ['false', '0', 'no', 'n', 'off']

type Comparable = string | number | boolean

function todayISO(): string {
    return new Date().toISOString().slice(0, 10)
}

/**
 * Normalises a cell or filter value for comparison as the given type.
 * Returns null for missing values and for values that don't fit the type.
 */
export function coerce(value: unknown, valueType: FilterValueType): Comparable | null {
    if (value == null || value === '') return null

    switch (valueType) {
        case 'number': {
            const number = typeof value === 'number' ? value : Number(String(value).trim())
            return Number.isNaN(number) ? null : number
        }
        case 'date': {
            const text = value instanceof Date ? value.toISOString() : String(value).trim()
            const time = Date.parse(text.toLowerCase() === 'today' ? todayISO() : text)
            return Number.isNaN(time) ? null : new Date(time).toISOString().slice(0, 10)
        }
        case 'boolean': {
            if (typeof value === 'boolean') return value
            const text = String(value).trim().toLowerCase()
            if (TRUE_WORDS.includes(text)) return true
            if (FALSE_WORDS.includes(text)) return false
            return null
        }
        default:
            return String(value).toLowerCase()
    }
}

function compareValues(a: Comparable, b: Comparable): number {
    if (typeof a === 'number' && typeof b === 'number') return a - b
    if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
    const left = String(a)
    const right = String(b)
    return left < right ? -1 : left > right ? 1 : 0
}

function splitList(text: string): string[] {
    return text.split(',').map((part) => part.trim())
}

/** Whether a single value satisfies the filter. */
export function matchesFilter(value: unknown, filter: Filter): boolean {
    const operator = filter.operator ?? DEFAULT_OPERATOR
    const valueType = filter.valueType ?? DEFAULT_VALUE_TYPE
    const actual = coerce(value, valueType)

    switch (operator) {
        case 'empty':
            return actual === null
        case 'notEmpty':
            return actual !== null
        case 'in':
            return (
                actual !== null &&
                splitList(filter.filterText).some((part) => coerce(part, valueType) === actual)
            )
    }

    const expected = coerce(filter.filterText, valueType)

    switch (operator) {
        case 'eq':
            return actual === expected
        case 'neq':
            return actual !== expected
    }

    // The remaining operators need two real values to compare.
    if (actual === null || expected === null) return false

    switch (operator) {
        case 'contains':
            return String(actual).includes(String(expected))
        case 'startsWith':
            return String(actual).startsWith(String(expected))
        case 'lt':
            return compareValues(actual, expected) < 0
        case 'lte':
            return compareValues(actual, expected) <= 0
        case 'gt':
            return compareValues(actual, expected) > 0
        case 'gte':
            return compareValues(actual, expected) >= 0
    }
}

function propertyOf<Row>(row: Row, field: string): unknown {
    return (row as Record<string, unknown>)[field]
}

/** Keeps the rows that satisfy every filter. */
export function applyFilters<Row>(
    rows: Row[],
    filters: Filter[],
    valueOf: (row: Row, field: string) => unknown = propertyOf
): Row[] {
    if (!filters.length) return rows
    return rows.filter((row) =>
        filters.every((filter) => matchesFilter(valueOf(row, filter.field), filter))
    )
}

function findOperator(text: string): FilterOperator | undefined {
    const wanted = text.toLowerCase()
    return FILTER_OPERATORS.find((operator) => operator.toLowerCase() === wanted)
}

function findValueType(text: string): FilterValueType | undefined {
    const wanted = text.toLowerCase()
    return FILTER_VALUE_TYPES.find((valueType) => valueType === wanted)
}

/** Splits `field__operator__type` into its parts; null if a part is not recognised. */
function parseLookup(key: string): Omit<Filter, 'filterText'> | null {
    const [field, ...modifiers] = key.split('__')
    if (!field) return null

    const lookup: Omit<Filter, 'filterText'> = { field }
    for (const modifier of modifiers) {
        const operator = findOperator(modifier)
        const valueType = findValueType(modifier)
        if (operator) {
            lookup.operator = operator
        } else if (valueType) {
            lookup.valueType = valueType
        } else {
            return null
        }
    }
    return lookup
}

/**
 * Reads filters from a query string. Parameters that don't look like a
 * lookup are ignored, as are fields outside `fields` when it is given.
 */
export function parseFilters(
    search: string | URLSearchParams,
    options: { fields?: readonly string[] } = {}
): Filter[] {
    const params = typeof search === 'string' ? new URLSearchParams(search) : search
    const filters: Filter[] = []

    for (const [key, filterText] of params) {
        const lookup = parseLookup(key)
        if (!lookup) continue
        if (options.fields && !options.fields.includes(lookup.field)) continue
        filters.push({ ...lookup, filterText })
    }

    return filters
}

/** Encodes filters as query parameters, leaving out the defaults. */
export function filtersToSearchParams(filters: Filter[]): URLSearchParams {
    const params = new URLSearchParams()
    for (const filter of filters) {
        let key = filter.field
        if (filter.operator && filter.operator !== DEFAULT_OPERATOR) {
            key += `__${filter.operator}`
        }
        if (filter.valueType && filter.valueType !== DEFAULT_VALUE_TYPE) {
            key += `__${filter.valueType}`
        }
        params.append(key, filter.filterText)
    }
    return params
}

/** Builds a link to `path` that applies the filters. */
export function filterUrl(path: string, filters: Filter[]): string {
    const query = filtersToSearchParams(filters).toString()
    return query ? `${path}?${query}` : path
}

/**
 * A human-readable version of the filter, e.g. "Status ≠ Done".
 * `label` names the field and `format` renders each value.
 */
export function describeFilter(
    filter: Filter,
    options: {
        label?: (field: string) => string
        format?: (field: string, value: string) => string
    } = {}
): string {
    const label = options.label ?? ((field) => field)
    const format = options.format ?? ((_field, value) => value)
    const operator = filter.operator ?? DEFAULT_OPERATOR

    const parts = [label(filter.field), OPERATOR_LABELS[operator]]
    if (operator === 'in') {
        parts.push(
            splitList(filter.filterText)
                .map((value) => format(filter.field, value))
                .join(', ')
        )
    } else if (operator !== 'empty' && operator !== 'notEmpty') {
        parts.push(format(filter.field, filter.filterText))
    }
    return parts.join(' ')
}
