import { mount } from 'svelte'

import './brand.css'
import App from './App.svelte'
import { applyAppearance, loadAppearance } from './lib/theme'

// Apply the saved appearance before mounting so the page doesn't flash
// the default scheme.
applyAppearance(loadAppearance())

const app = mount(App, {
    target: document.getElementById('app')!,
})

export default app
