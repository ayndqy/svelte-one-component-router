import { readable, derived, type Readable } from 'svelte/store'
import { options } from './options'

export type Path = string
export type Query = string
export type Hash = string

type Location = {
  path: Path
  query: Query
  hash: Hash
}

const parseLocation = (fragment: string): Location => {
  const pathMatch = fragment.match(/^(\/[^?#]*)?/)
  const queryMatch = fragment.match(/\?([^#]*)?/)
  const hashMatch = fragment.match(/#(.*)?/)

  return {
    path: pathMatch?.[1] || '/',
    query: queryMatch?.[1] ? `?${queryMatch?.[1]}` : '',
    hash: hashMatch?.[1] ? `#${hashMatch?.[1]}` : '',
  }
}

const getWindowLocation = (): Location => {
  const { pathname, search, hash } = document.location
  return { path: pathname, query: search, hash: hash }
}

const getHashLocation = (): Location => {
  let hashFragment = document.location.hash.substring(1)
  if (hashFragment[0] !== '/') hashFragment = '/' + hashFragment
  return parseLocation(hashFragment)
}

const windowLocation = readable<Location>(getWindowLocation(), (set) => {
  const handler = () => set(getWindowLocation())
  window.addEventListener('popstate', handler)
  return () => window.removeEventListener('popstate', handler)
})

const hashLocation = readable<Location>(getHashLocation(), (set) => {
  const handler = () => set(getHashLocation())
  window.addEventListener('hashchange', handler)
  return () => window.removeEventListener('hashchange', handler)
})

const selectedLocation: Readable<Location> = derived(
  [options, windowLocation, hashLocation],
  ([$options, $windowLocation, $hashLocation], set) => {
    if ($options.mode === 'window') set($windowLocation)
    if ($options.mode === 'hash') set($hashLocation)
  }
)

export type PathStore = Readable<Path>
export type QueryStore = Readable<Query>
export type HashStore = Readable<Hash>

export const path: PathStore = derived(selectedLocation, ($location) => $location.path)
export const query: QueryStore = derived(selectedLocation, ($location) => $location.query)
export const hash: HashStore = derived(selectedLocation, ($location) => $location.hash)
