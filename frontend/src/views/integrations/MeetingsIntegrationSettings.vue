<template>
  <div class="meetings-settings">
    <t-alert
      v-if="status && !status.encryption_active"
      theme="warning"
      :message="$t('integrations.meetings.encryptionWarning')"
      class="mt-alert"
    />

    <div v-for="p in status?.providers || []" :key="p.provider" class="provider-card">
      <div class="provider-head">
        <div>
          <h3>{{ $t(`integrations.meetings.providers.${p.provider}`) }}</h3>
          <p class="desc">
            <template v-if="!p.configured">{{ $t('integrations.meetings.notConfigured') }}</template>
            <template v-else-if="p.connected">
              {{ $t('integrations.meetings.connectedAs', { account: p.account_label || '—' }) }}
            </template>
            <template v-else>{{ $t('integrations.meetings.notConnected') }}</template>
          </p>
        </div>
        <t-button
          v-if="p.configured && !p.connected"
          theme="primary"
          :loading="connecting === p.provider"
          :disabled="!isAdmin"
          @click="connect(p.provider)"
        >
          {{ $t('integrations.meetings.connect') }}
        </t-button>
        <t-popconfirm
          v-else-if="p.connected"
          :content="$t('integrations.meetings.disconnectConfirm')"
          @confirm="disconnect(p.provider)"
        >
          <t-button variant="outline" theme="danger" :disabled="!isAdmin">
            {{ $t('integrations.meetings.disconnect') }}
          </t-button>
        </t-popconfirm>
      </div>

      <t-alert v-if="p.last_sync_error" theme="error" :message="p.last_sync_error" class="mt-alert" />

      <div v-if="p.connected" class="settings-group">
        <div class="setting-row">
          <div class="setting-info">
            <label>{{ $t('integrations.meetings.knowledgeBase') }}</label>
            <p class="desc">{{ $t('integrations.meetings.knowledgeBaseDesc') }}</p>
          </div>
          <div class="setting-control">
            <t-select
              v-model="forms[p.provider].knowledge_base_id"
              :options="kbOptions"
              :placeholder="$t('integrations.meetings.chooseKnowledgeBase')"
              :disabled="!isAdmin"
              clearable
              filterable
              style="width: 280px;"
              @change="save(p.provider)"
            />
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <label>{{ $t('integrations.meetings.autoSync') }}</label>
            <p class="desc">{{ $t('integrations.meetings.autoSyncDesc') }}</p>
          </div>
          <div class="setting-control">
            <t-switch
              v-model="forms[p.provider].auto_sync"
              :disabled="!isAdmin || !forms[p.provider].knowledge_base_id"
              @change="save(p.provider)"
            />
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <label>{{ $t('integrations.meetings.publish') }}</label>
            <p class="desc">{{ $t('integrations.meetings.publishDesc') }}</p>
          </div>
          <div class="setting-control">
            <t-switch v-model="forms[p.provider].publish" :disabled="!isAdmin" @change="save(p.provider)" />
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <label>{{ $t('integrations.meetings.importNow') }}</label>
            <p class="desc">
              {{ $t('integrations.meetings.importedCount', { count: p.imported_count }) }}
              <template v-if="p.last_synced_at">
                · {{ $t('integrations.meetings.lastSync', { date: formatDate(p.last_synced_at) }) }}
              </template>
            </p>
          </div>
          <div class="setting-control">
            <t-button
              variant="outline"
              :loading="pulling === p.provider"
              :disabled="!isAdmin || !forms[p.provider].knowledge_base_id"
              @click="pullNow(p.provider)"
            >
              {{ $t('integrations.meetings.importNowButton') }}
            </t-button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="status" class="redirect-hint">
      {{ $t('integrations.meetings.redirectHint') }}
      <code>{{ status.redirect_url }}</code>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  disconnectMeetingProvider,
  getMeetingsStatus,
  pullMeetingsNow,
  startMeetingAuth,
  updateMeetingSettings,
  type MeetingProvider,
  type MeetingSettings,
  type MeetingsStatus,
} from '@/api/meetings'
import { listKnowledgeBases } from '@/api/knowledge-base'
import { useAuthStore } from '@/stores/auth'

const { t, locale } = useI18n()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.hasRole('admin'))

const status = ref<MeetingsStatus | null>(null)
const knowledgeBases = ref<Array<{ id: string; name: string }>>([])
const forms = reactive<Record<MeetingProvider, MeetingSettings>>({
  teams: { knowledge_base_id: '', auto_sync: false, publish: false },
  zoom: { knowledge_base_id: '', auto_sync: false, publish: false },
  google_meet: { knowledge_base_id: '', auto_sync: false, publish: false },
})
const connecting = ref<MeetingProvider | ''>('')
const pulling = ref<MeetingProvider | ''>('')

const kbOptions = computed(() => knowledgeBases.value.map((kb) => ({ label: kb.name, value: kb.id })))

function errorMessage(err: any): string {
  return err?.message || err?.error?.message || t('integrations.meetings.genericError')
}

async function loadStatus() {
  try {
    const res = await getMeetingsStatus()
    status.value = res.data
    for (const p of res.data.providers) {
      forms[p.provider] = {
        knowledge_base_id: p.knowledge_base_id || '',
        auto_sync: p.auto_sync,
        publish: p.publish,
      }
    }
  } catch (err) {
    MessagePlugin.error(errorMessage(err))
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

/** The OAuth callback redirects here with #meetings_oauth=success|error&provider=… */
function handleOAuthReturn() {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash.includes('meetings_oauth=')) return
  const params = new URLSearchParams(hash)
  const provider = params.get('provider') || ''
  const name = provider ? t(`integrations.meetings.providers.${provider}`) : ''
  if (params.get('meetings_oauth') === 'success') {
    MessagePlugin.success(t('integrations.meetings.connectedToast', { provider: name }))
  } else {
    MessagePlugin.error(t('integrations.meetings.connectFailed', { provider: name }))
  }
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

async function connect(provider: MeetingProvider) {
  connecting.value = provider
  try {
    const res = await startMeetingAuth(provider)
    window.location.href = res.data.auth_url
  } catch (err) {
    MessagePlugin.error(errorMessage(err))
    connecting.value = ''
  }
}

async function disconnect(provider: MeetingProvider) {
  try {
    await disconnectMeetingProvider(provider)
    await loadStatus()
  } catch (err) {
    MessagePlugin.error(errorMessage(err))
  }
}

async function save(provider: MeetingProvider) {
  const form = forms[provider]
  if (!form.knowledge_base_id) form.auto_sync = false
  try {
    await updateMeetingSettings(provider, { ...form })
    MessagePlugin.success(t('integrations.meetings.saved'))
    await loadStatus()
  } catch (err) {
    MessagePlugin.error(errorMessage(err))
    await loadStatus()
  }
}

async function pullNow(provider: MeetingProvider) {
  pulling.value = provider
  try {
    await pullMeetingsNow(provider)
    MessagePlugin.success(t('integrations.meetings.importQueued'))
  } catch (err) {
    MessagePlugin.error(errorMessage(err))
  } finally {
    pulling.value = ''
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(locale.value)
}

onMounted(async () => {
  handleOAuthReturn()
  await loadStatus()
  if (status.value?.providers.some((p) => p.connected)) await loadKnowledgeBases()
})
</script>

<style scoped lang="less">
@import (reference) '@/components/css/settings-section.less';

.provider-card {
  border: 1px solid var(--td-component-stroke);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.provider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h3 {
    margin: 0 0 4px;
    font-size: var(--app-text-lg);
  }
}

.desc {
  margin: 0;
  color: var(--td-text-color-secondary);
}

.settings-group {
  display: flex;
  flex-direction: column;
  margin-top: 8px;
}

.setting-row {
  .setting-row();
}

.setting-info {
  .setting-info();
}

.setting-control {
  .setting-control();
}

.mt-alert {
  margin: 8px 0;
}

.redirect-hint {
  color: var(--td-text-color-secondary);
  font-size: var(--app-text-sm);

  code {
    user-select: all;
    word-break: break-all;
  }
}

@media (max-width: 640px) {
  .provider-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
