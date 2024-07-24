<svelte:options immutable={true} />

<script lang="ts" context="module">
  import { writable, type Writable, type Readable } from 'svelte/store'
  import type { Path } from '../location'
  import { getPathSegments } from '../utils/getPathSegments'
  import { createIdIssuer } from '../utils/createIdIssuer'

  type Route = {
    id: number
    root: boolean
    fallback: boolean
    path: string
    depth: number
  }

  type RouteStore = Writable<Route>

  const getRoute = (
    id: Route['id'],
    root: Route['root'],
    fallback: Route['fallback'],
    path: Route['path'],
    contextRoute: Route | null,
  ): Route => {
    const getDepth = (fallback: Route['fallback'], path: Route['path'], contextDepth?: Route['depth']) => {
      const routeDepth = fallback ? 1 : getPathSegments(path).filter((path) => path !== '/').length
      return (contextDepth ?? 0) + routeDepth
    }

    const validateRoute = (route: Route, contextRoute: Route | null) => {
      const messages = {
        invalidPath: `<Route path="${route?.path}" /> has invalid path. Path must start with '/'`,
        fallbackOutsideRoot: `<Route fallback /> cannot be outside root <Route />`,
        pathOutsideRoot: `<Route path="${route?.path}" /> cannot be outside root <Route />`,
        fallbackInsideFallback: `<Route fallback /> cannot be inside <Route fallback>`,
        pathInsideFallback: `<Route path="${route?.path}" /> cannot be inside <Route fallback>`,
      }

      if (route.path[0] !== '/') throw new Error(messages.invalidPath)
      if (route.root && route.fallback) throw new Error(messages.fallbackOutsideRoot)
      if (route.root && route.path !== '/') throw new Error(messages.pathOutsideRoot)
      if (contextRoute?.fallback && route.fallback) throw new Error(messages.fallbackInsideFallback)
      if (contextRoute?.fallback && !route.fallback) throw new Error(messages.pathInsideFallback)
    }

    const depth = getDepth(fallback, path, contextRoute?.depth)
    const route = { id, root, fallback, path, depth }

    validateRoute(route, contextRoute)

    return route
  }

  type RoutesStore = {
    subscribe: Readable<Route[]>['subscribe']
    update: (route: Route) => void
    remove: (route: Route) => void
  }

  const createRoutes = (): RoutesStore => {
    const { subscribe, update } = writable<Route[]>([])

    return {
      subscribe,

      update: (route) => {
        update((routes) => [...routes.filter(({ id }) => id !== route.id), route])
      },

      remove: (route) => {
        update((routes) => routes.filter(({ id }) => id !== route.id))
      },
    }
  }

  const isRouteActive = (globalPath: Path, route: Route, contextNestedRoutes: Route[]): boolean => {
    const isPathActive = (globalPath: Path, root: Route['root'], path: Route['path'], depth: Route['depth']): boolean => {
      const globalPathSegments = getPathSegments(globalPath).filter((path) => path !== '/')
      if (path === '/') return root || globalPathSegments.length === depth
      const pathSegments = getPathSegments(path).filter((path) => path !== '/')
      return pathSegments.every((segment, i) => segment === globalPathSegments[depth - pathSegments.length + i])
    }

    const isFallbackActive = (globalPath: Path, depth: Route['depth'], siblingRoutes: Route[]): boolean => {
      const globalPathSegments = getPathSegments(globalPath).filter((path) => path !== '/')
      if (depth > globalPathSegments.length) return false
      return siblingRoutes.every(({ root, fallback, path, depth }) => fallback || !isPathActive(globalPath, root, path, depth))
    }

    return route.fallback
      ? isFallbackActive(globalPath, route.depth, contextNestedRoutes)
      : isPathActive(globalPath, route.root, route.path, route.depth)
  }

  const getId = createIdIssuer()
</script>

<script lang="ts">
  import { onDestroy, getContext, setContext, hasContext } from 'svelte'
  import { path as globalPath } from '../location'
  import { options } from '../options'
  import { getPathWithoutBase } from '../utils/getPathWithoutBase'

  const id: Route['id'] = getId()
  const root: Route['root'] = !hasContext('_route')
  export let fallback: Route['fallback'] = false
  export let path: Route['path'] = '/'

  const route: RouteStore = writable()
  const nestedRoutes: RoutesStore = createRoutes()
  const contextRoute: RouteStore = getContext('_route')
  const contextNestedRoutes: RoutesStore = getContext('_nestedRoutes')

  $: $route = getRoute(id, root, fallback, path, $contextRoute)
  $: contextNestedRoutes?.update($route)
  onDestroy(() => contextNestedRoutes?.remove($route))

  setContext('_route', route)
  setContext('_nestedRoutes', nestedRoutes)
</script>

{#if isRouteActive(getPathWithoutBase($globalPath, $options.basePath), $route, $contextNestedRoutes)}
  <slot />
{/if}
