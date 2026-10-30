import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { useUIStore } from './ui.ts'

test('entering platform mobile collapses an expanded sidebar', () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  })
  try {
    setActivePinia(createPinia())
    const ui = useUIStore()
    ui.expandSidebar()
    assert.equal(ui.sidebarCollapsed, false)
    ui.setPlatformMobile(true)
    assert.equal(ui.platformMobile, true)
    assert.equal(ui.sidebarCollapsed, true)
    ui.openMobileSidebar()
    assert.equal(ui.sidebarCollapsed, false)
    ui.closeMobileSidebar()
    assert.equal(ui.sidebarCollapsed, true)
    ui.setPlatformMobile(false)
    assert.equal(ui.sidebarCollapsed, false)
    assert.equal(localStorage.getItem('sidebar_collapsed'), 'false')
    ui.setPlatformMobile(true)
    assert.equal(ui.sidebarCollapsed, true)
    ui.openMobileSidebar()
    ui.setPlatformMobile(false)
    assert.equal(ui.sidebarCollapsed, false)
    assert.equal(localStorage.getItem('sidebar_collapsed'), 'false')
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
