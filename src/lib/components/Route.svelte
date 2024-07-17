<svelte:options immutable={true} />

<script lang="ts" context="module">
  import { writable, type Writable, type Readable } from 'svelte/store'
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

  type NestedRoutesStore = {
    subscribe: Readable<Route[]>['subscribe']
    update: (route: Route) => void
    remove: (route: Route) => void
  }

  const createNestedRoutes = (): NestedRoutesStore => {
    const { subscribe, update } = writable<Route[]>([])

    return {
      subscribe,

      update: (route) => {
        update((routes) => [...routes.filter((nestedRoute) => route.id !== nestedRoute.id), route])
      },

      remove: (route) => {
        update((routes) => routes.filter((nestedRoute) => route.id !== nestedRoute.id))
      },
    }
  }

  const isRouteActive = (globalPath: string, route: Route, contextChildren: Route[]): boolean => {
    const isPathActive = (globalPath: string, root: Route['root'], path: Route['path'], depth: Route['depth']): boolean => {
      let globalPathSegments = getPathSegments(globalPath).filter((path) => path !== '/')
      let pathSegments = getPathSegments(path).filter((path) => path !== '/')
      let pathScope = ''

      if (path === '/') return root || globalPathSegments.length === depth

      for (let i = depth - pathSegments.length; i < depth; i++) {
        pathScope = pathScope + globalPathSegments[i]
      }

      return path === pathScope
    }

    const isFallbackActive = (globalPath: string, depth: Route['depth'], contextChildren: Route[]): boolean => {
      let globalPathSegments = getPathSegments(globalPath).filter((path) => path !== '/')
      let hasActiveSiblingRoutes = false

      for (let i = 0; i < contextChildren?.length && !hasActiveSiblingRoutes; i++) {
        if (contextChildren[i]?.fallback) continue

        hasActiveSiblingRoutes = isPathActive(
          globalPath,
          contextChildren[i]?.root ?? false,
          contextChildren[i]?.path ?? '',
          contextChildren[i]?.depth ?? 0,
        )
      }

      return globalPathSegments.length >= depth && !hasActiveSiblingRoutes
    }

    return route.fallback
      ? isFallbackActive(globalPath, route.depth, contextChildren)
      : isPathActive(globalPath, route.root, route.path, route.depth)
  }

  const getId = createIdIssuer()
  const routeContextKey = {}
  const nestedRoutesContextKey = {}
</script>

<script lang="ts">
  import { onDestroy, getContext, setContext, hasContext } from 'svelte'
  import { path as globalPath } from '../location'
  import { options } from '../options'
  import { getPathWithoutBase } from '../utils/getPathWithoutBase'

  const id: Route['id'] = getId()
  const root: Route['root'] = !hasContext(routeContextKey)
  export let fallback: Route['fallback'] = false
  export let path: Route['path'] = '/'

  const route: RouteStore = writable()
  const contextRoute: RouteStore = getContext(routeContextKey)
  const nestedRoutes: NestedRoutesStore = createNestedRoutes()
  const contextNestedRoutes: NestedRoutesStore = getContext(nestedRoutesContextKey)

  $: $route = getRoute(id, root, fallback, path, $contextRoute)

  $: contextNestedRoutes?.update($route)
  onDestroy(() => contextNestedRoutes?.remove($route))

  setContext(routeContextKey, route)
  setContext(nestedRoutesContextKey, nestedRoutes)
</script>

{#if isRouteActive(getPathWithoutBase($globalPath, $options.basePath), $route, $contextNestedRoutes)}
  <slot />
{/if}
