import { onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { platformMobileMediaQuery } from '@/utils/responsive'

export function usePlatformMobile() {
  const uiStore = useUIStore()
  let mql: MediaQueryList | null = null
  let sync: (() => void) | null = null

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia(platformMobileMediaQuery())
    sync = () => uiStore.setPlatformMobile(mql!.matches)
    sync()
    mql.addEventListener('change', sync)
  })

  onUnmounted(() => {
    if (mql && sync) {
      mql.removeEventListener('change', sync)
    }
  })
}
