<template>
  <div class="meetings-panel">
    <t-alert
      v-if="status && !status.encryption_active"
      theme="warning"
      :message="$t('integrations.meetings.encryptionWarning')"
      class="mt-alert"
    />

    <div class="channels-header">
      <span class="channels-title">{{ $t('integrations.meetings.connectionsTitle') }}</span>
      <span class="channels-count">{{ addedProviders.length }}</span>
    </div>

    <t-loading :loading="loading" size="small" class="channels-loading-wrap">
      <div v-if="!loading" class="channel-grid">
        <button
          v-for="p in addedProviders"
          :key="p.provider"
          type="button"
          class="channel-card channel-card--clickable"
          @click="openEdit(p)"
        >
          <div class="channel-card__badge" :class="`meeting-badge--${p.provider}`">
            <span class="meeting-badge__text">{{ providerInitials[p.provider] }}</span>
          </div>
          <div class="channel-card__body">
            <div class="channel-card__header">
              <h3 class="channel-card__title">{{ providerName(p.provider) }}</h3>
              <t-tag v-if="p.last_sync_error" size="small" variant="light" theme="danger">
                {{ $t('integrations.meetings.tagError') }}
              </t-tag>
              <t-tag v-else-if="!p.connected" size="small" variant="light" theme="warning">
                {{ $t('integrations.meetings.tagNotConnected') }}
              </t-tag>
              <t-tag v-else-if="p.auto_sync" size="small" variant="light" theme="success">
                {{ $t('integrations.meetings.tagAuto') }}
              </t-tag>
            </div>
            <span class="channel-card__agent-name">
              {{ p.connected ? p.account_label : $t('integrations.meetings.notConnected') }}
            </span>
          </div>
          <div v-if="isAdmin" class="channel-card__actions" @click.stop>
            <t-popconfirm
              :content="$t('integrations.meetings.deleteConfirm')"
              :confirm-btn="{ content: $t('common.delete'), theme: 'danger' }"
              :cancel-btn="{ content: $t('common.cancel') }"
              placement="bottom-right"
              @confirm="() => remove(p.provider)"
            >
              <t-button
                theme="danger"
                shape="square"
                variant="text"
                size="small"
                class="channel-card__action-btn channel-card__delete"
                @click.stop
              >
                <template #icon><t-icon name="delete" /></template>
              </t-button>
            </t-popconfirm>
          </div>
        </button>

        <button
          v-if="isAdmin && availableProviders.length > 0"
          type="button"
          class="channel-card channel-card--add"
          @click="openCreate"
        >
          <span class="channel-card__badge" aria-hidden="true"><t-icon name="add" /></span>
          <div class="channel-card__body">
            <div class="channel-card__header">
              <span class="channel-card__title">{{ $t('integrations.meetings.addConnection') }}</span>
            </div>
          </div>
          <span class="channel-card__actions channel-card__actions--spacer" aria-hidden="true" />
        </button>
      </div>
      <t-empty
        v-if="!loading && addedProviders.length === 0 && !isAdmin"
        :description="$t('integrations.meetings.empty')"
      />
    </t-loading>

    <SettingDrawer
      v-model:visible="drawerVisible"
      :title="editing ? providerName(form.provider) : $t('integrations.meetings.addConnection')"
      :description="stepTitles[step]"
      storage-key="setting-drawer:meetings"
      width="600px"
      :hide-footer="!isAdmin"
      :confirm-loading="saving"
      :confirm-text="step === lastStep ? $t('integrations.meetings.finish') : $t('integrations.meetings.next')"
      :confirm-disabled="!canGoNext"
      @confirm="next"
      @cancel="closeDrawer"
    >
      <template #headerIcon><t-icon name="video" /></template>
      <template v-if="step > 0" #footer-left>
        <t-button variant="outline" @click="step--">{{ $t('integrations.meetings.back') }}</t-button>
      </template>

      <div class="meeting-steps">
        <div v-for="(title, i) in stepTitles" :key="i" :class="['meeting-step', { active: step === i, done: step > i }]">
          <span class="meeting-step-num">
            <t-icon v-if="step > i" name="check" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="meeting-step-title">{{ title }}</span>
        </div>
      </div>

      <!-- Step 1: platform -->
      <section v-if="step === 0" class="setting-drawer__section">
        <h4 class="setting-drawer__section-title">{{ $t('integrations.meetings.choosePlatform') }}</h4>
        <div class="platform-choices">
          <button
            v-for="p in editing ? [form.provider] : availableProviders.map((x) => x.provider)"
            :key="p"
            type="button"
            :class="['platform-choice', { selected: form.provider === p }]"
            :disabled="editing"
            @click="form.provider = p"
          >
            <span class="channel-card__badge" :class="`meeting-badge--${p}`">
              <span class="meeting-badge__text">{{ providerInitials[p] }}</span>
            </span>
            <span class="platform-choice__body">
              <strong>{{ providerName(p) }}</strong>
              <span class="form-desc">{{ $t(`integrations.meetings.requirements.${p}`) }}</span>
            </span>
          </button>
        </div>
      </section>

      <!-- Step 2: application -->
      <section v-else-if="step === 1" class="setting-drawer__section">
        <h4 class="setting-drawer__section-title">{{ $t('integrations.meetings.appTitle') }}</h4>
        <t-alert theme="info" class="mt-alert">
          <template #message>
            <ol class="guide-steps">
              <li v-for="(line, i) in guideLines(form.provider)" :key="i">{{ line }}</li>
            </ol>
          </template>
        </t-alert>

        <div class="form-item">
          <label class="form-label">{{ $t('integrations.meetings.redirectUrl') }}</label>
          <div class="copy-control">
            <t-input :model-value="status?.redirect_url" readonly class="mono-input" />
            <t-button size="small" variant="text" :title="$t('common.copy')" @click="copyRedirect">
              <t-icon name="file-copy" />
            </t-button>
          </div>
          <p class="form-desc">{{ $t('integrations.meetings.redirectUrlDesc') }}</p>
        </div>

        <div class="form-item">
          <label class="form-label required">{{ $t('integrations.meetings.clientId') }}</label>
          <t-input v-model="form.client_id" :placeholder="$t('integrations.meetings.clientIdPlaceholder')" />
        </div>

        <div class="form-item">
          <label class="form-label required">{{ $t('integrations.meetings.clientSecret') }}</label>
          <t-input
            v-model="form.client_secret"
            type="password"
            autocomplete="new-password"
            :placeholder="current?.secret_configured
              ? $t('integrations.meetings.secretKept')
              : $t('integrations.meetings.clientSecretPlaceholder')"
          />
        </div>

        <div v-if="form.provider === 'teams'" class="form-item">
          <label class="form-label">{{ $t('integrations.meetings.teamsTenant') }}</label>
          <t-input v-model="form.app_tenant" placeholder="organizations" />
          <p class="form-desc">{{ $t('integrations.meetings.teamsTenantDesc') }}</p>
        </div>
      </section>

      <!-- Step 3: account -->
      <section v-else-if="step === 2" class="setting-drawer__section">
        <h4 class="setting-drawer__section-title">{{ $t('integrations.meetings.accountTitle') }}</h4>
        <div v-if="current?.connected" class="account-ok">
          <t-icon name="check-circle-filled" class="account-ok__icon" />
          <div>
            <strong>{{ $t('integrations.meetings.connectedAs', { account: current.account_label || '—' }) }}</strong>
            <p class="form-desc">{{ $t('integrations.meetings.reconnectHint') }}</p>
          </div>
        </div>
        <p v-else class="form-desc form-desc--block">
          {{ $t('integrations.meetings.signInHint', { provider: providerName(form.provider) }) }}
        </p>
        <div>
          <t-button
            :theme="current?.connected ? 'default' : 'primary'"
            :variant="current?.connected ? 'outline' : 'base'"
            :loading="waitingSignIn"
            @click="signIn"
          >
            {{ current?.connected
              ? $t('integrations.meetings.reconnect')
              : $t('integrations.meetings.signInWith', { provider: providerName(form.provider) }) }}
          </t-button>
        </div>
        <p v-if="waitingSignIn" class="form-desc">{{ $t('integrations.meetings.waitingSignIn') }}</p>
      </section>

      <!-- Step 4: import -->
      <section v-else class="setting-drawer__section">
        <h4 class="setting-drawer__section-title">{{ $t('integrations.meetings.importTitle') }}</h4>
        <t-alert v-if="current?.last_sync_error" theme="error" :message="current.last_sync_error" class="mt-alert" />
        <div class="form-item">
          <label class="form-label required">{{ $t('integrations.meetings.knowledgeBase') }}</label>
          <t-select
            v-model="form.knowledge_base_id"
            :options="kbOptions"
            :placeholder="$t('integrations.meetings.chooseKnowledgeBase')"
            filterable
          />
          <p class="form-desc">{{ $t('integrations.meetings.knowledgeBaseDesc') }}</p>
        </div>
        <div class="form-item form-item--switch">
          <div>
            <label class="form-label">{{ $t('integrations.meetings.autoSync') }}</label>
            <p class="form-desc">{{ $t('integrations.meetings.autoSyncDesc') }}</p>
          </div>
          <t-switch v-model="form.auto_sync" :disabled="!form.knowledge_base_id" />
        </div>
        <div class="form-item form-item--switch">
          <div>
            <label class="form-label">{{ $t('integrations.meetings.publish') }}</label>
            <p class="form-desc">{{ $t('integrations.meetings.publishDesc') }}</p>
          </div>
          <t-switch v-model="form.publish" />
        </div>
        <div class="form-item form-item--switch">
          <div>
            <label class="form-label">{{ $t('integrations.meetings.importNow') }}</label>
            <p class="form-desc">
              {{ $t('integrations.meetings.importedCount', { count: current?.imported_count || 0 }) }}
              <template v-if="current?.last_synced_at">
                · {{ $t('integrations.meetings.lastSync', { date: formatDate(current.last_synced_at) }) }}
              </template>
            </p>
          </div>
          <t-button variant="outline" :loading="pulling" :disabled="!form.knowledge_base_id" @click="pullNow">
            {{ $t('integrations.meetings.importNowButton') }}
          </t-button>
        </div>
      </section>
    </SettingDrawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessagePlugin } from 'tdesign-vue-next'
import SettingDrawer from '@/components/settings/SettingDrawer.vue'
import {
  disconnectMeetingProvider,
  getMeetingsStatus,
  pullMeetingsNow,
  saveMeetingApp,
  startMeetingAuth,
  updateMeetingSettings,
  type MeetingProvider,
  type MeetingProviderStatus,
  type MeetingsStatus,
} from '@/api/meetings'
import { listKnowledgeBases } from '@/api/knowledge-base'
import { useAuthStore } from '@/stores/auth'
import { copyWithToast } from '@/utils/clipboard'

// Sign-in popup: same timeout as other OAuth flows; status is polled in case the
// vendor page severs window.opener and the postMessage never arrives.
const SIGN_IN_POLL_MS = 3000
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000

const { t, tm, rt, locale } = useI18n()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.hasRole('admin'))

const providerInitials: Record<MeetingProvider, string> = { teams: 'T', zoom: 'Z', google_meet: 'M' }

const status = ref<MeetingsStatus | null>(null)
const loading = ref(true)
const knowledgeBases = ref<Array<{ id: string; name: string }>>([])

const drawerVisible = ref(false)
const editing = ref(false)
const step = ref(0)
const lastStep = 3
const saving = ref(false)
const pulling = ref(false)
const waitingSignIn = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null
let pollDeadline = 0
let popup: Window | null = null
let signInStart = { connected: false, label: '' }

const form = reactive({
  provider: 'teams' as MeetingProvider,
  client_id: '',
  client_secret: '',
  app_tenant: '',
  knowledge_base_id: '',
  auto_sync: false,
  publish: false,
})

const stepTitles = computed(() => [
  t('integrations.meetings.stepPlatform'),
  t('integrations.meetings.stepApp'),
  t('integrations.meetings.stepAccount'),
  t('integrations.meetings.stepImport'),
])

const providers = computed(() => status.value?.providers || [])
const addedProviders = computed(() => providers.value.filter((p) => p.added))
const availableProviders = computed(() => providers.value.filter((p) => !p.added))
const current = computed(() => providers.value.find((p) => p.provider === form.provider))
const kbOptions = computed(() => knowledgeBases.value.map((kb) => ({ label: kb.name, value: kb.id })))

const canGoNext = computed(() => {
  if (step.value === 1) return !!form.client_id.trim() && (!!form.client_secret || !!current.value?.secret_configured)
  if (step.value === 2) return !!current.value?.connected
  if (step.value === 3) return !!form.knowledge_base_id
  return true
})

function providerName(p: string) {
  return t(`integrations.meetings.providers.${p}`)
}

function guideLines(p: MeetingProvider): string[] {
  const lines = tm(`integrations.meetings.guides.${p}`)
  return Array.isArray(lines) ? lines.map((l: any) => (typeof l === 'string' ? l : rt(l))) : []
}

function errorMessage(err: any): string {
  return err?.message || err?.error?.message || t('integrations.meetings.genericError')
}

async function loadStatus() {
  try {
    const res = await getMeetingsStatus()
    status.value = res.data
  } catch (err) {
    MessagePlugin.error(errorMessage(err))
  } finally {
    loading.value = false
  }
}

async function loadKnowledgeBases() {
  try {
    const res: any = await listKnowledgeBases()
    knowledgeBases.value = Array.isArray(res?.data) ? res.data : []
  } catch {
    knowledgeBases.value = []
  }
}

function fillForm(p: MeetingProviderStatus) {
  form.provider = p.provider
  form.client_id = p.client_id || ''
  form.client_secret = ''
  form.app_tenant = p.app_tenant || ''
  form.knowledge_base_id = p.knowledge_base_id || ''
  form.auto_sync = p.auto_sync
  form.publish = p.publish
}

function openCreate() {
  editing.value = false
  const first = availableProviders.value[0]
  if (first) fillForm(first)
  step.value = 0
  drawerVisible.value = true
}

function openEdit(p: MeetingProviderStatus) {
  editing.value = true
  fillForm(p)
  step.value = p.connected ? 3 : 1
  drawerVisible.value = true
  if (p.connected) loadKnowledgeBases()
}

function closeDrawer() {
  stopSignInWait()
  drawerVisible.value = false
}

async function next() {
  if (!isAdmin.value) return
  saving.value = true
  try {
    if (step.value === 1) {
      await saveMeetingApp(form.provider, {
        client_id: form.client_id.trim(),
        client_secret: form.client_secret,
        app_tenant: form.app_tenant.trim(),
      })
      form.client_secret = ''
      await loadStatus()
    } else if (step.value === 2) {
      await loadKnowledgeBases()
    } else if (step.value === lastStep) {
      await updateMeetingSettings(form.provider, {
        knowledge_base_id: form.knowledge_base_id,
        auto_sync: form.auto_sync && !!form.knowledge_base_id,
        publish: form.publish,
      })
      MessagePlugin.success(t('integrations.meetings.saved'))
      await loadStatus()
      closeDrawer()
      return
    }
    step.value++
  } catch (err) {
    MessagePlugin.error(errorMessage(err))
  } finally {
    saving.value = false
  }
}

function stopSignInWait() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  waitingSignIn.value = false
}

async function checkSignIn() {
  await loadStatus()
  const p = current.value
  const signedIn = !!p?.connected && (!signInStart.connected || p.account_label !== signInStart.label)
  if (signedIn || (popup?.closed && p?.connected)) {
    finishSignIn(true)
  } else if (popup?.closed) {
    stopSignInWait()
  } else if (Date.now() > pollDeadline) {
    stopSignInWait()
    MessagePlugin.warning(t('integrations.meetings.signInTimeout'))
  }
}

function finishSignIn(ok: boolean) {
  if (!waitingSignIn.value) return
  stopSignInWait()
  if (ok) {
    MessagePlugin.success(t('integrations.meetings.connectedToast', { provider: providerName(form.provider) }))
  } else {
    MessagePlugin.error(t('integrations.meetings.connectFailed', { provider: providerName(form.provider) }))
  }
}

async function signIn() {
  waitingSignIn.value = true
  signInStart = { connected: !!current.value?.connected, label: current.value?.account_label || '' }
  // Open the popup synchronously so the browser does not block it, then point it at the vendor page.
  popup = window.open('about:blank', 'weknora-meetings-oauth', 'width=560,height=720')
  try {
    const res = await startMeetingAuth(form.provider)
    if (popup && !popup.closed) {
      popup.location.href = res.data.auth_url
    } else {
      window.location.href = res.data.auth_url
      return
    }
    pollDeadline = Date.now() + SIGN_IN_TIMEOUT_MS
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = setInterval(checkSignIn, SIGN_IN_POLL_MS)
  } catch (err) {
    popup?.close()
    stopSignInWait()
    MessagePlugin.error(errorMessage(err))
  }
}

async function onOAuthMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin || event.data?.type !== 'weknora:meetings-oauth') return
  await loadStatus()
  finishSignIn(event.data.status === 'success')
}

/** Fallback when the sign-in ran in this tab: the callback redirects here with #meetings_oauth=… */
function handleOAuthReturn() {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash.includes('meetings_oauth=')) return
  const params = new URLSearchParams(hash)
  const name = providerName(params.get('provider') || '')
  if (params.get('meetings_oauth') === 'success') {
    MessagePlugin.success(t('integrations.meetings.connectedToast', { provider: name }))
  } else {
    MessagePlugin.error(t('integrations.meetings.connectFailed', { provider: name }))
  }
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

async function remove(provider: MeetingProvider) {
  try {
    await disconnectMeetingProvider(provider)
    await loadStatus()
  } catch (err) {
    MessagePlugin.error(errorMessage(err))
  }
}

async function pullNow() {
  pulling.value = true
  try {
    await updateMeetingSettings(form.provider, {
      knowledge_base_id: form.knowledge_base_id,
      auto_sync: form.auto_sync && !!form.knowledge_base_id,
      publish: form.publish,
    })
    await pullMeetingsNow(form.provider)
    MessagePlugin.success(t('integrations.meetings.importQueued'))
  } catch (err) {
    MessagePlugin.error(errorMessage(err))
  } finally {
    pulling.value = false
  }
}

function copyRedirect() {
  copyWithToast(status.value?.redirect_url, 'common.copySuccess')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(locale.value)
}

onMounted(async () => {
  window.addEventListener('message', onOAuthMessage)
  handleOAuthReturn()
  await loadStatus()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onOAuthMessage)
  stopSignInWait()
})
</script>

<style scoped lang="less">
@import '@/components/css/channel-panel-list.less';

.meetings-panel {
  display: flex;
  flex-direction: column;
}

.mt-alert {
  margin-bottom: 12px;
}

.meeting-badge--teams {
  background: #5b5fc7;
}

.meeting-badge--zoom {
  background: #0b5cff;
}

.meeting-badge--google_meet {
  background: #00897b;
}

.meeting-badge__text {
  color: #fff;
  font-weight: 700;
  font-size: var(--app-text-md);
}

.meeting-steps {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--td-component-stroke);
  padding-bottom: 12px;
}

.meeting-step {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  font-size: var(--app-text-sm);
  color: var(--td-text-color-placeholder);

  &.active {
    color: var(--td-brand-color);
    font-weight: 500;
  }

  &.done {
    color: var(--td-text-color-secondary);
    font-weight: 500;
  }
}

.meeting-step-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meeting-step-num {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--app-text-xs);
  font-weight: 600;
  border: 1px solid var(--td-component-stroke);

  .meeting-step.active & {
    background: var(--td-brand-color);
    color: #fff;
    border-color: var(--td-brand-color);
  }

  .meeting-step.done & {
    background: var(--td-bg-color-secondarycontainer);
    color: var(--td-brand-color);
  }
}

.platform-choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.platform-choice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--app-radius-lg);
  background: var(--td-bg-color-container);
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;

  &.selected {
    border-color: var(--td-brand-color);
    box-shadow: 0 0 0 1px var(--td-brand-color);
  }

  &:disabled {
    cursor: default;
  }
}

.platform-choice__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.guide-steps {
  margin: 0;
  padding-left: 18px;

  li + li {
    margin-top: 4px;
  }
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: var(--app-text-md);
  font-weight: 500;
  color: var(--td-text-color-primary);

  &.required::after {
    content: ' *';
    color: var(--td-error-color);
  }
}

.form-desc {
  margin: 4px 0 0;
  font-size: var(--app-text-sm);
  line-height: 1.45;
  color: var(--td-text-color-placeholder);

  &--block {
    color: var(--td-text-color-secondary);
  }
}

.form-item--switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.copy-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mono-input :deep(input) {
  font-family: var(--app-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: var(--app-text-sm);
}

.account-ok {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.account-ok__icon {
  color: var(--td-success-color);
  font-size: 20px;
  margin-top: 2px;
}
</style>
