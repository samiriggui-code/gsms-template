<template>
    <div
        class="main"
        ref="dropzone"
        :class="{
            'main--platform-mobile': uiStore.platformMobile,
            'main--mobile-sidebar-open': uiStore.platformMobile && !uiStore.sidebarCollapsed,
        }"
        :style="{ '--sidebar-width': `${uiStore.sidebarDisplayWidth}px` }"
    >
        <button
            v-if="uiStore.platformMobile && uiStore.sidebarCollapsed"
            ref="mobileNavOpenBtn"
            type="button"
            class="platform-mobile-nav-open"
            :aria-label="t('menu.expandSidebar')"
            @click="uiStore.openMobileSidebar()"
        >
            <svg viewBox="0 0 20 20" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="1.5" y="1.5" width="17" height="17" rx="3" stroke="currentColor" stroke-width="1.5" />
                <line x1="7.5" y1="1.5" x2="7.5" y2="18.5" stroke="currentColor" stroke-width="1.5" />
                <line x1="5" y1="10" x2="3" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <line x1="5" y1="10" x2="3" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
        </button>
        <div
            v-if="uiStore.platformMobile && !uiStore.sidebarCollapsed"
            class="platform-mobile-sidebar-backdrop"
            aria-hidden="true"
            @click="onMobileSidebarBackdropClick"
        />
        <Menu></Menu>
        <div v-if="isRouterAlive" class="platform-route-outlet">
            <RouterView />
        </div>
        <!-- WeKnora 助手：停靠时作为布局右栏挤压页面，悬浮时浮在页面上；都不加遮罩，
             跨页面保留会话，从侧栏、右侧边缘按钮或命令面板唤出（设置里可选） -->
        <AssistantPanel />
        <AssistantLauncher />
        <AssistantPageBridge />
        <div class="upload-mask" v-show="ismask">
            <UploadMask></UploadMask>
        </div>
        <!-- 全局设置模态框，供所有 platform 子路由使用 -->
        <Settings />
        <!-- 全局命令面板 (⌘K)，随 platform 路由存活 -->
        <GlobalCommandPalette />
        <!-- 知识库文件上传进度浮层：上传队列放在 store 里，切换页面不中断 -->
        <UploadTasksPanel />
        <!-- 带遮罩层的新手引导：首次进入自动开启，可从用户菜单顶部昵称旁帮助按钮重新打开 -->
        <NewUserGuide />
    </div>
</template>
<script setup lang="ts">
import Menu from '@/components/menu.vue'
import { ref, onMounted, onUnmounted, nextTick, provide, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router'
import UploadMask from '@/components/upload-mask.vue'
import Settings from '@/views/settings/Settings.vue'
import GlobalCommandPalette from '@/components/GlobalCommandPalette.vue'
import AssistantPanel from '@/components/assistant/AssistantPanel.vue'
import AssistantLauncher from '@/components/assistant/AssistantLauncher.vue'
import AssistantPageBridge from '@/components/assistant/AssistantPageBridge.vue'
import UploadTasksPanel from '@/components/upload-tasks/UploadTasksPanel.vue'
import NewUserGuide from '@/components/NewUserGuide.vue'
import { useCommandPaletteStore } from '@/stores/commandPalette'
import { useChatResourcesStore } from '@/stores/chatResources'
import { useUIStore } from '@/stores/ui'
import { getKnowledgeBaseById } from '@/api/knowledge-base/index'
import { MessagePlugin } from 'tdesign-vue-next'
import { useI18n } from 'vue-i18n'
import { collectDroppedFiles } from './collectDroppedFiles'
import { usePlatformMobile } from '@/composables/usePlatformMobile'

usePlatformMobile()

const route = useRoute();
const router = useRouter();
const commandPaletteStore = useCommandPaletteStore();
const uiStore = useUIStore();
const mobileNavOpenBtn = ref<HTMLButtonElement | null>(null)
let ismask = ref(false)
const { t } = useI18n();

const isRouterAlive = ref(true)
const reloadApp = () => {
    isRouterAlive.value = false
    nextTick(() => {
        isRouterAlive.value = true
    })
}
provide('app:reload', reloadApp)

// 仅在 Wails 桌面端运行时拦截 Cmd/Ctrl+R：
// 桌面端没有浏览器地址栏，整页重载会白屏，所以用前端软刷新替代。
// 浏览器（含 Web 版 / 非 Lite 部署）里不拦截，交给浏览器做真正的整页刷新，
// 否则会出现左侧菜单、全局设置、Pinia store 等不随"刷新"一起重置的问题。
// @ts-ignore
const isWailsDesktop = typeof window !== 'undefined' && !!(window as any).runtime?.EventsOn

const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (!isWailsDesktop) return
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        reloadApp()
    }
}

const focusMobileNavOpen = () => {
    nextTick(() => mobileNavOpenBtn.value?.focus())
}

const onMobileSidebarBackdropClick = () => {
    uiStore.closeMobileSidebar()
    focusMobileNavOpen()
}

watch(
    () => uiStore.sidebarCollapsed,
    (collapsed, wasCollapsed) => {
        if (uiStore.platformMobile && collapsed && wasCollapsed === false) {
            focusMobileNavOpen()
        }
    },
)

const handleMobileSidebarKeyDown = (e: KeyboardEvent) => {
    if (!uiStore.platformMobile || uiStore.sidebarCollapsed) return
    if (e.key !== 'Escape') return
    e.preventDefault()
    uiStore.closeMobileSidebar()
    focusMobileNavOpen()
}

watch(
    () => uiStore.platformMobile && !uiStore.sidebarCollapsed,
    (open) => {
        if (open) {
            document.addEventListener('keydown', handleMobileSidebarKeyDown)
        } else {
            document.removeEventListener('keydown', handleMobileSidebarKeyDown)
        }
    },
    { flush: 'post' },
)

// 用于跟踪拖拽进入/离开的计数器，解决子元素触发 dragleave 的问题
let dragCounter = 0;

// 获取当前知识库ID
const getCurrentKbId = (): string | null => {
    return (route.params as any)?.kbId as string || null
}

const CHAT_DROP_ROUTE_NAMES = new Set(['chat', 'globalCreatChat', 'kbCreatChat']);

const isChatDropRoute = () => {
    return CHAT_DROP_ROUTE_NAMES.has(String(route.name || ''));
}

// 检查知识库初始化状态
const checkKnowledgeBaseInitialization = async (): Promise<boolean> => {
    const currentKbId = getCurrentKbId();
    
    if (!currentKbId) {
        MessagePlugin.error(t('knowledgeBase.missingId'));
        return false;
    }
    
    try {
        const kbResponse = await getKnowledgeBaseById(currentKbId);
        const kb = kbResponse.data;
        
        if (!kb.summary_model_id) {
            MessagePlugin.warning(t('knowledgeBase.notInitialized'));
            return false;
        }
        const strategy = kb.indexing_strategy;
        const needsEmbedding = !strategy || strategy.vector_enabled || strategy.keyword_enabled;
        if (needsEmbedding && !kb.embedding_model_id) {
            MessagePlugin.warning(t('knowledgeBase.notInitialized'));
            return false;
        }
        return true;
    } catch (error) {
        MessagePlugin.error(t('knowledgeBase.getInfoFailed'));
        return false;
    }
}


// isFileDrag distinguishes an OS file drag (the only thing the global upload
// drop zone cares about) from an in-app element drag such as the wiki
// folder/page drag-and-drop. Element drags carry only "text/*" types, never
// "Files", so we bail out and let the originating component handle the drop.
const isFileDrag = (event: DragEvent): boolean => {
    const types = event.dataTransfer?.types
    if (!types) return false
    return Array.from(types).includes('Files')
}

const shouldHandleGlobalFileDrag = (event: DragEvent): boolean => {
    if (!isFileDrag(event)) return false;
    // Keep the browser from opening dropped files, even outside upload pages.
    event.preventDefault();
    // Settings and its teleported skill drawers own their uploads. This runs
    // in document capture, before a local drop handler can stop propagation.
    const enabled = !uiStore.showSettingsModal && (
        isChatDropRoute() || (route.name === 'knowledgeBaseDetail' && !!getCurrentKbId())
    );
    if (!enabled) {
        dragCounter = 0;
        ismask.value = false;
    }
    return enabled;
}

// 全局拖拽事件处理
const handleGlobalDragEnter = (event: DragEvent) => {
    if (!shouldHandleGlobalFileDrag(event)) return;
    dragCounter++;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'all';
    }
    ismask.value = true;
}

const handleGlobalDragOver = (event: DragEvent) => {
    if (!shouldHandleGlobalFileDrag(event)) return;
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
    }
}

const handleGlobalDragLeave = (event: DragEvent) => {
    if (!shouldHandleGlobalFileDrag(event)) return;
    dragCounter--;
    if (dragCounter === 0) {
        ismask.value = false;
    }
}

const handleGlobalDrop = async (event: DragEvent) => {
    if (!shouldHandleGlobalFileDrag(event)) return;
    dragCounter = 0;
    ismask.value = false;

    const droppedFiles = await collectDroppedFiles(event);
    if (droppedFiles.length === 0) {
        MessagePlugin.warning(t('knowledgeBase.dragFileNotText'));
        return;
    }

    if (isChatDropRoute()) {
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent('weknora:chat-file-drop', {
            detail: { files: droppedFiles }
        }));
        return;
    }
    
    const isInitialized = await checkKnowledgeBaseInitialization();
    if (!isInitialized) {
        return;
    }

    window.dispatchEvent(new CustomEvent('weknora:knowledge-file-drop', {
        detail: { kbId: getCurrentKbId(), files: droppedFiles }
    }));
}

// 组件挂载时添加全局事件监听器
onMounted(() => {
    document.addEventListener('dragenter', handleGlobalDragEnter, true);
    document.addEventListener('dragover', handleGlobalDragOver, true);
    document.addEventListener('dragleave', handleGlobalDragLeave, true);
    document.addEventListener('drop', handleGlobalDrop, true);
    if (isWailsDesktop) {
        window.addEventListener('keydown', handleGlobalKeyDown);
        // @ts-ignore
        window.runtime.EventsOn('app:reload', () => {
            reloadApp()
        })
    }
    // 支持通过 URL 查询参数打开全局命令面板，例如旧路径
    // /platform/knowledge-search?q=foo 重定向后携带 ?cmdk=foo
    maybeOpenCmdkFromRoute()
    // 后台预取对话输入栏资源，进入 creatChat / chat 时复用缓存
    void useChatResourcesStore().prefetchChatInput()
});

// 监听路由变化，兼容 SPA 内部跳转时的 ?cmdk= 参数
watch(() => route.query.cmdk, () => {
    maybeOpenCmdkFromRoute()
})

function maybeOpenCmdkFromRoute() {
    if (!('cmdk' in route.query)) return
    const q = String(route.query.cmdk ?? '')
    commandPaletteStore.openPalette(q)
    // 清除 query，避免回退/刷新时反复触发
    const newQuery = { ...route.query }
    delete (newQuery as any).cmdk
    router.replace({ path: route.path, query: newQuery, hash: route.hash })
}

// 组件卸载时移除全局事件监听器
onUnmounted(() => {
    document.removeEventListener('keydown', handleMobileSidebarKeyDown);
    document.removeEventListener('dragenter', handleGlobalDragEnter, true);
    document.removeEventListener('dragover', handleGlobalDragOver, true);
    document.removeEventListener('dragleave', handleGlobalDragLeave, true);
    document.removeEventListener('drop', handleGlobalDrop, true);
    if (isWailsDesktop) {
        window.removeEventListener('keydown', handleGlobalKeyDown);
        // @ts-ignore
        if (window.runtime?.EventsOff) {
            // @ts-ignore
            window.runtime.EventsOff('app:reload')
        }
    }
    dragCounter = 0;
});
</script>
<style lang="less">
.main {
    display: flex;
    align-items: stretch;
    width: 100%;
    height: 100%;
    min-width: 600px;
    min-height: 0;
    position: relative;
    /* 统一整页背景，让左侧菜单与右侧内容区视觉连贯 */
    background: var(--td-bg-color-container);
}

@media (max-width: 768px) {
    .main {
        min-width: 0;
    }

    .main--mobile-sidebar-open .platform-route-outlet {
        overflow: hidden;
    }
}

.platform-mobile-nav-open {
    position: fixed;
    z-index: 1005;
    top: max(12px, env(safe-area-inset-top));
    left: max(12px, env(safe-area-inset-left));
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid var(--td-component-stroke);
    border-radius: var(--app-radius-md);
    background: var(--td-bg-color-container);
    color: var(--td-text-color-primary);
    box-shadow: var(--td-shadow-1);
    cursor: pointer;
}

.platform-mobile-sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1090;
    background: rgba(0, 0, 0, 0.45);
}

/* 右侧路由区：占满剩余宽度与整列高度，并把 min-height:0 传给子页面以便内部 flex 滚动 */
.platform-route-outlet {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.upload-mask {
    background-color: rgba(255, 255, 255, 0.8);
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 999;
    display: flex;
    justify-content: center;
    align-items: center;
}

img {
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
    user-drag: none;
}
</style>
