// 运行时配置（本地开发默认值，Docker 环境会被 entrypoint 脚本覆盖）
window.__RUNTIME_CONFIG__ = {
  MAX_FILE_SIZE_MB: 50,
  MAX_SKILL_BUNDLE_SIZE_MB: 256,
  // Optional: serve embed on a dedicated origin, e.g. 'https://embed.example.com'
  EMBED_BASE_URL: '',
  // Optional: default UI locale for first-time visitors (fr-FR | en-US)
  DEFAULT_LOCALE: '',
  // Optional: public site (homepage) linked from auth, e.g. 'https://www.global-it-ss.com'
  PUBLIC_SITE_URL: '',
  // Optional: product docs base, e.g. 'https://www.global-it-ss.com/docs/'
  DOCS_BASE_URL: '',
};
