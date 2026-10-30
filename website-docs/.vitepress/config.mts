import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { defineConfig, type DefaultTheme } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import './theme-config.d.ts'
import { repoVersionLabel } from './version'
import { readScreenshotSizes } from './screenshot-sizes.mjs'

const root = resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)

/** 当前安装能解析到该模块时返回 true。缺失的包不能写进 optimizeDeps.include。 */
function installedDep(id: string): boolean {
  try {
    require.resolve(id)
    return true
  } catch {
    return false
  }
}

const sections: { dir: string; label: string; labelEn: string; newestFirst?: boolean }[] = [
  { dir: '01-getting-started', label: 'Démarrage', labelEn: 'Getting started' },
  { dir: '02-architecture', label: 'Architecture', labelEn: 'Architecture' },
  { dir: '03-features', label: 'Fonctions', labelEn: 'Features' },
  { dir: '04-api', label: 'Référence API', labelEn: 'API reference' },
  { dir: '05-clients', label: 'Clients', labelEn: 'Clients' },
  { dir: '06-development', label: 'Développement', labelEn: 'Development' },
  { dir: '07-releases', label: 'Versions', labelEn: 'Releases', newestFirst: true },
]

/** 侧边栏条目文字：取正文一级标题，去掉冗余前后缀 */
function itemText(dir: string, file: string): string {
  const raw = readFileSync(resolve(root, dir, file), 'utf-8')
  const heading = raw.match(/^#\s+(.+)$/m)?.[1] ?? file.replace(/\.md$/, '')
  return heading
    .replace(/^API 参考[:：]\s*/, 'API : ')
    .replace(/^API Reference[:：]\s*/i, 'API: ')
    .replace(/\s*[（(][^（()）]*[)）]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** 版本号按数字比较，v0.10.0 排在 v0.9.0 之后 */
function compareVersions(a: string, b: string): number {
  const parts = (f: string) => f.replace(/^v|\.md$/g, '').split('.').map(Number)
  const [x, y] = [parts(a), parts(b)]
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0)
  }
  return 0
}

function itemsOf(dir: string, newestFirst = false, contentDir = ''): DefaultTheme.SidebarItem[] {
  const folder = contentDir ? `${contentDir}/${dir}` : dir
  const files = readdirSync(resolve(root, folder)).filter(
    (f) => f.endsWith('.md') && !f.includes('-zh-backup'),
  )
  const linkPrefix = contentDir ? `/${contentDir}` : ''
  return (newestFirst ? files.sort(compareVersions).reverse() : files.sort())
    .map((f) => ({
      text: itemText(folder, f),
      link: `${linkPrefix}/${dir}/${f.replace(/\.md$/, '')}`,
    }))
}

function sidebarFor(contentDir: string, labelKey: 'label' | 'labelEn'): DefaultTheme.SidebarItem[] {
  return sections.map((s) => ({
    text: s[labelKey],
    collapsed: false,
    items: itemsOf(s.dir, s.newestFirst, contentDir),
  }))
}

const sidebar = sidebarFor('', 'label')
const sidebarEn = sidebarFor('en', 'labelEn')

/** 本地搜索默认按空白分词，中文整段会被当作一个词，这里退化为字粒度切分 */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  for (const part of text.split(/[\s\n\r#%*,=/:;?[\]{}()&+\-!'"$·、，。：；？！（）【】《》…—]+/)) {
    if (!part) continue
    if (/[\u4e00-\u9fa5]/.test(part)) {
      tokens.push(part, ...part.split(''))
    } else {
      tokens.push(part)
    }
  }
  return tokens
}

const repo = 'https://github.com/Tencent/WeKnora'

export default withMermaid(
  defineConfig({
    title: 'WeKnora',
    titleTemplate: ':title · Documentation WeKnora',
    description: 'Documentation WeKnora : déploiement, configuration, fonctions, référence API et développement.',
    lang: 'fr',
    locales: {
      root: { label: 'Français', lang: 'fr' },
      en: {
        label: 'English',
        lang: 'en',
        title: 'WeKnora',
        titleTemplate: ':title · WeKnora docs',
        description: 'WeKnora documentation: deploy, configure, features, API reference, and development.',
        themeConfig: {
          sidebar: sidebarEn,
          outline: { level: [2, 3], label: 'On this page' },
          docFooter: { prev: 'Previous', next: 'Next' },
          returnToTopLabel: 'Back to top',
          sidebarMenuLabel: 'Menu',
          darkModeSwitchLabel: 'Appearance',
          lightModeSwitchTitle: 'Switch to light',
          darkModeSwitchTitle: 'Switch to dark',
          lastUpdated: { text: 'Last updated', formatOptions: { dateStyle: 'medium', timeStyle: undefined } },
          editLink: { pattern: `${repo}/edit/main/website-docs/:path`, text: 'Edit this page on GitHub' },
          search: {
            provider: 'local',
            options: {
              translations: {
                button: { buttonText: 'Search docs', buttonAriaLabel: 'Search docs' },
                modal: {
                  displayDetails: 'Show details',
                  resetButtonTitle: 'Clear',
                  backButtonTitle: 'Back',
                  noResultsText: 'No results',
                  footer: { selectText: 'Select', navigateText: 'Navigate', closeText: 'Close' },
                },
              },
            },
          },
          footer: {
            message: `Built from WeKnora ${repoVersionLabel} · MIT License`,
            copyright: '© Tencent WeKnora',
          },
        },
      },
    },
    base: '/docs/',
    cleanUrls: true,
    appearance: { storageKey: 'vitepress-theme-appearance' },
    lastUpdated: true,
    srcExclude: [
      'README.md',
      'MIGRATION.md',
      'homepage/**',
      'shared/**',
      'scripts/**',
      'deploy/**',
      'static-site/**',
      'releases/**',
      '**/*-zh-backup.md',
    ],
    metaChunk: true,
    transformPageData(pageData) {
      // The shared masthead replaces the default documentation navbar.
      pageData.frontmatter.navbar = false
    },

    head: [
      ['link', { rel: 'icon', href: '/docs/favicon.ico', type: 'image/x-icon' }],
      ['meta', { name: 'theme-color', content: '#101f38' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:title', content: 'Documentation WeKnora' }],
      [
        'meta',
        {
          property: 'og:description',
          content: 'Centralisez PDF, Word, pages web et bases d’équipe dans une base de connaissances, avec des réponses sourcées.',
        },
      ],
    ],

    markdown: {
      theme: { light: 'github-light', dark: 'github-dark' },
      lineNumbers: false,
      toc: { level: [2, 3] },
      config(md) {
        // 表格外面包一层滚动容器。默认主题把 <table> 本身设成 display:block 来做
        // 横向滚动，副作用是表格按内容收缩——列少的表比正文列窄一截，页面里宽窄不一。
        // 把滚动交给包裹层后，表格可以恢复 display:table + width:100%，统一撑满正文列。
        md.renderer.rules.table_open = () => '<div class="wk-table">\n<table>\n'
        md.renderer.rules.table_close = () => '</table>\n</div>\n'
      },
    },

    themeConfig: {
      logoLink: { link: '/', target: '_self' },
      siteTitle: 'WeKnora',

      nav: [],

      weknoraVersion: repoVersionLabel,
      weknoraScreenshotSizes: readScreenshotSizes(resolve(root, 'public/screenshots')),

      sidebar,

      socialLinks: [{ icon: 'github', link: repo }],

      outline: { level: [2, 3], label: 'Sur cette page' },

      docFooter: { prev: 'Précédent', next: 'Suivant' },
      returnToTopLabel: 'Haut de page',
      sidebarMenuLabel: 'Menu',
      darkModeSwitchLabel: 'Apparence',
      lightModeSwitchTitle: 'Passer en clair',
      darkModeSwitchTitle: 'Passer en sombre',

      lastUpdated: {
        text: 'Dernière mise à jour',
        formatOptions: { dateStyle: 'medium', timeStyle: undefined },
      },

      editLink: {
        pattern: `${repo}/edit/main/website-docs/:path`,
        text: 'Modifier cette page sur GitHub',
      },

      search: {
        provider: 'local',
        options: {
          translations: {
            button: { buttonText: 'Rechercher', buttonAriaLabel: 'Rechercher dans la documentation' },
            modal: {
              displayDetails: 'Afficher le détail',
              resetButtonTitle: 'Effacer',
              backButtonTitle: 'Retour',
              noResultsText: 'Aucun résultat',
              footer: {
                selectText: 'Choisir',
                navigateText: 'Naviguer',
                closeText: 'Fermer',
              },
            },
          },
          miniSearch: {
            options: { tokenize },
            searchOptions: {
              fuzzy: 0.2,
              prefix: true,
              boost: { title: 4, text: 2, titles: 1 },
            },
          },
        },
      },

      footer: {
        message: `Documentation issue de WeKnora ${repoVersionLabel} · MIT License`,
        copyright: '© Tencent WeKnora',
      },
    },

    // mermaid >= 11.17 会动态 import UMD 包 fastdom。Vite 启动时扫不到这次导入，
    // 浏览器直接加载原始 fastdom.js，报 does not provide an export named 'default'
    //（vitepress-plugin-mermaid#98）。只在能解析到这两个包时才预构建：lockfile 里的
    // mermaid 11.16.0 没有 fastdom，无条件 include 会报 Failed to resolve dependency。
    vite: {
      optimizeDeps: {
        include: ['fastdom', 'fastdom/extensions/fastdom-promised.js'].filter(installedDep),
      },
    },

    mermaid: {
      theme: 'base',
      fontFamily:
        '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", ui-sans-serif, sans-serif',
      themeVariables: {
        primaryColor: '#eef1f6',
        primaryTextColor: '#101f38',
        primaryBorderColor: '#9aa8bd',
        lineColor: '#7d8ba1',
        secondaryColor: '#faf7ef',
        tertiaryColor: '#f6f7f9',
        fontSize: '14px',
      },
    },
  }),
)
