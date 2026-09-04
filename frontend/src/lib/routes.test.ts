import { describe, expect, it } from 'vitest'

import { ROUTES, matchRoute, signInUrl, taskUrl } from './routes'

describe('routes', () => {
    it('builds task and sign-in links', () => {
        expect(taskUrl(12)).toBe('/pm/app/tasks/12/')
        expect(signInUrl('/pm/app/tasks/12/')).toBe('/admin/login/?next=%2Fpm%2Fapp%2Ftasks%2F12%2F')
    })

    it('matches each page, with or without the trailing slash', () => {
        expect(matchRoute(ROUTES.home)).toEqual({ page: 'home' })
        expect(matchRoute('/pm/app')).toEqual({ page: 'home' })
        expect(matchRoute(ROUTES.tasks)).toEqual({ page: 'tasks' })
        expect(matchRoute('/pm/app/tasks')).toEqual({ page: 'tasks' })
        expect(matchRoute(ROUTES.newTask)).toEqual({ page: 'new-task' })
        expect(matchRoute(ROUTES.settings)).toEqual({ page: 'settings' })
        expect(matchRoute('/pm/app/tasks/12/')).toEqual({ page: 'task', id: 12 })
        expect(matchRoute('/pm/app/tasks/12')).toEqual({ page: 'task', id: 12 })
    })

    it('does not match paths outside the app', () => {
        expect(matchRoute('/')).toBeNull()
        expect(matchRoute('/somewhere/else/')).toBeNull()
        expect(matchRoute('/pm/app/tasks/abc/')).toBeNull()
        expect(matchRoute('/pm/app/tasks/12/extra/')).toBeNull()
    })
})
