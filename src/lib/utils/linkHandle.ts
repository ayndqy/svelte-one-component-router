import type { Action } from 'svelte/action'
import { router } from '../router'

export const linkClickHandler = (event: MouseEvent): boolean | void => {
  const target = (event.target as HTMLElement)?.closest('a[href]') as HTMLAnchorElement
  const href = target?.href

  if (target === null || href === null) return true

  const isIgnored = ['', 'true'].includes(target.getAttribute('data-handle-ignore') ?? 'false')
  const isTargetNonSelf = (target.getAttribute('target') ?? '_self') !== '_self'
  const isKeyPressed = event.metaKey || event.ctrlKey || event.altKey || event.shiftKey
  const isExternalOrigin = new URL(href).origin !== document.location.origin

  if (isIgnored || isTargetNonSelf || isKeyPressed || isExternalOrigin) return true

  href === document.location.href ? router.replace(href) : router.push(href)
  event.preventDefault()
}

export type LinkHandle = Action<HTMLElement>

export const linkHandle: LinkHandle = (node) => {
  node.addEventListener('click', linkClickHandler)

  return {
    destroy: () => {
      node.removeEventListener('click', linkClickHandler)
    },
  }
}
