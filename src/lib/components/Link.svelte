<svelte:options immutable={true} />

<script lang="ts" context="module">
  import type { Options } from '../options'

  const getFormatedHref = (mode: Options['mode'], basePath: Options['basePath'], href: string): string => {
    const prefix = mode === 'hash' ? '#' : ''
    return prefix + (basePath ?? '') + href
  }
</script>

<script lang="ts">
  import { options } from '../options'
  import { linkHandle } from '../utils/linkHandle'

  export let href: string
  interface $$restProps {}

  $: formatedHref = getFormatedHref($options.mode, $options.basePath, href)
</script>

<a href={formatedHref} use:linkHandle on:click {...$$restProps}>
  <slot />
</a>
