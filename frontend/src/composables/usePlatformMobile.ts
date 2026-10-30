import { onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { platformMobileMediaQuery } from '@/utils/responsive'

export function usePlatformMobile() {
  const uiStore = useUIStore()
  let mql: MediaQueryList | null = null
  let sync: (() => void) | null = null

  if (typeof window !== 'undefined' && window.matchMedia) {
    mql = window.matchMedia(platformMobileMediaQuery())
    sync = () => uiStore.setPlatformMobile(mql!.matches)
    sync()
  }

  onMounted(() => {
    if (!mql || !sync) return
    mql.addEventListener('change', sync)
  })

  onUnmounted(() => {
    if (mql && sync) {
      mql.removeEventListener('change', sync)
    }
  })
}
