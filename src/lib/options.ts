import { writable, type Readable } from 'svelte/store'

export type Options = {
  mode: 'window' | 'hash'
  basePath: null | string
}

export type OptionsStore = {
  subscribe: Readable<Options>['subscribe']
  set: (changedOptions: Partial<Options>) => void
}

const createOptions = (initialValues: Options): OptionsStore => {
  const { subscribe, update } = writable<Options>(initialValues)

  return {
    subscribe,

    set: (changedOptions = {}) => {
      update((options) => Object.assign(options, changedOptions))
    },
  }
}

export const options = createOptions({
  mode: 'window',
  basePath: null,
})
