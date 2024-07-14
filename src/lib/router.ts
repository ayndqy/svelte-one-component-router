import { get } from 'svelte/store'
import { options, type Options } from './options'

const dispatchLocationChange = (mode: Options['mode'] = get(options).mode): void => {
  let type: string = 'popstate'

  if (mode === 'window') type = 'popstate'
  if (mode === 'hash') type = 'hashchange'

  window.dispatchEvent(new Event(type))
}

export type Router = {
  go: (delta?: number) => void
  push: (url?: string | URL | null, state?: any) => void
  replace: (url?: string | URL | null, state?: any) => void
}

export const router: Router = {
  go: (delta: number = 0) => {
    history.go(delta)
    dispatchLocationChange()
  },

  push: (url, state = null) => {
    history.pushState(state, '', url)
    dispatchLocationChange()
  },

  replace: (url, state = null) => {
    history.replaceState(state, '', url)
    dispatchLocationChange()
  },
}
