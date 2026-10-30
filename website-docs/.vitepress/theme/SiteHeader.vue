<script setup lang="ts">
import { computed, h, ref, watch, onMounted, onUnmounted } from 'vue'
import { useData, useRoute } from 'vitepress'
import Search from 'vitepress/dist/client/theme-default/components/VPNavBarSearch.vue'
import { repositoryUrl, headerIcons, siteBrand } from '../../shared/header'
const { isDark } = useData()
const route = useRoute()
const isEn = computed(() => route.path === '/en' || route.path.startsWith('/en/'))
const docsNavigation = computed(() => {
  const root = isEn.value ? '/docs/en' : '/docs'
  const sectionRoot = isEn.value ? '/en' : ''
  const t = isEn.value
    ? ['Get started', 'Architecture', 'Features', 'API', 'Clients', 'Development', 'Releases']
    : ['Démarrage', 'Architecture', 'Fonctions', 'API', 'Clients', 'Développement', 'Versions']
  const pages = [
    ['/01-getting-started/03-quickstart', '/01-getting-started/'],
    ['/02-architecture/01-overview', '/02-architecture/'],
    ['/03-features/01-tenant-auth', '/03-features/'],
    ['/04-api/01-api-overview', '/04-api/'],
    ['/05-clients/01-frontend', '/05-clients/'],
    ['/06-development/01-dev-guide', '/06-development/'],
    ['/07-releases/v0.9.0', '/07-releases/'],
  ] as const
  return pages.map(([href, section], index) => ({
    label: t[index],
    href: `${root}${href}`,
    section: `${sectionRoot}${section}`,
  }))
})
const otherLocaleHref = computed(() => {
  const path = route.path === '/' ? '' : route.path
  if (isEn.value) return `/docs${path.replace(/^\/en/, '') || '/'}`
  return `/docs/en${path}`
})
const open = ref(false)
watch(() => route.path, () => open.value = false)
const menu = ref<HTMLButtonElement>()
const label = computed(() => isEn.value
  ? (isDark.value ? 'Switch to light' : 'Switch to dark')
  : (isDark.value ? 'Passer en mode clair' : 'Passer en mode sombre'))
const HeaderIcon = (props: { name: string }) => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, [h('path', { d: headerIcons[props.name] })])
function closeMenu(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) { open.value = false; menu.value?.focus() }
}
onMounted(() => document.addEventListener('keydown', closeMenu))
onUnmounted(() => document.removeEventListener('keydown', closeMenu))
</script>

<template>
  <header class="wk-header wk-docs-header">
    <div class="wk-header-inner">
      <a class="wk-brand" href="/" target="_self" :aria-label="isEn ? 'Global-IT-SS home' : 'Accueil Global-IT-SS'">
        <span class="wk-logo-gis-mark">
          <img class="wk-logo-gis-img" :src="siteBrand.logoSrc" :alt="`${siteBrand.name} — ${siteBrand.tagline}`" width="300" height="149">
        </span>
        <span class="wk-brand-lockup">
          <span class="wk-brand-name">{{ siteBrand.name }}</span>
          <span class="wk-brand-tagline">{{ siteBrand.tagline }}</span>
        </span>
      </a>
      <nav id="main-navigation" class="wk-navigation" :class="{ 'is-open': open }" :aria-label="isEn ? 'Documentation' : 'Navigation de la documentation'">
        <a v-for="item in docsNavigation" :key="item.href" :href="item.href" :aria-current="route.path.startsWith(item.section) ? 'page' : undefined" @click="open = false">{{ item.label }}</a>
        <a class="wk-locale" :href="otherLocaleHref">{{ isEn ? 'FR' : 'EN' }}</a>
        <div class="wk-header-search"><Search /></div>
        <a class="wk-mobile-github" :href="repositoryUrl" target="_blank" rel="noreferrer">GitHub <HeaderIcon name="external" /></a>
      </nav>
      <button class="wk-theme-toggle" type="button" role="switch" :aria-checked="isDark" :aria-label="label" :title="label" @click="isDark = !isDark"><HeaderIcon :name="isDark ? 'moon' : 'sun'" /></button>
      <a class="wk-header-github" :href="repositoryUrl" target="_blank" rel="noreferrer"><HeaderIcon name="github" /><span>GitHub</span></a>
      <button ref="menu" class="wk-menu-toggle" type="button" :aria-label="open ? (isEn ? 'Close menu' : 'Fermer le menu') : (isEn ? 'Open menu' : 'Ouvrir le menu')" :aria-expanded="open" aria-controls="main-navigation" @click="open = !open"><HeaderIcon :name="open ? 'close' : 'menu'" /></button>
    </div>
  </header>
</template>
