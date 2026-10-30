# Chrome extension (knowledge management assistant)
The Chrome extension “Knowledge Management Assistant” lets you query a knowledge base from a web page sidebar, capture the current page, and save Markdown notes.

Install it from the [Chrome Web Store](https://chromewebstore.google.com/detail/jpemjbopikggjlmikmclgbmkhhopjdgd). It requires an existing WeKnora instance. Imported content is stored on the connected instance.

<Screenshot
  src="/screenshots/chrome-extension.png"
  caption="Chrome extension: Q&A in the sidebar and content capture"
  hint="Sidebar open on a web page (Q&A panel and knowledge base selector), plus area selection during capture." />

## Main features {#main-features}
| Capability | Description |
| --- | --- |
| Knowledge base Q&A | Conversation panel in the sidebar, switch between knowledge bases; quick / deep / precise modes to ask without leaving browsing |
| Web capture | Saves the URL, extracts body via AI or manual selection, writes to a chosen knowledge base |
| Markdown notes | Built-in editor to save content to a knowledge base |
| Shortcuts | Customizable shortcuts to ask a question, open the sidebar, etc. |

## Install and connect {#install-and-connect}
See **Settings → Publish integrations → Chrome extension** for the guide and copy your instance API URL. Steps:

1. **Get API credentials**: under **Settings → Publish integrations → API integration**, copy the API key and API URL (the guide’s **Open API info** button goes there). Create a dedicated key and restrict capabilities if needed (at minimum search and ingestion; see the API key chapter in [Tenants, users, and authentication](../03-features/01-tenant-auth.md));
2. **Fixed port (desktop recommended)**: with WeKnora Desktop, set a fixed port on the **API integration** page (e.g. 37841). Otherwise the port changes on each launch and the extension will not reconnect;
3. **Install the extension** from the Chrome Web Store;
4. **Connect in the extension**: open settings, **Enterprise / developer** mode, enter API URL and API key.

After connecting, list knowledge bases and ask a question to validate credentials and network.

## Troubleshooting
| Symptom | What to check |
| --- | --- |
| Cannot connect | Is the API URL reachable from the browser machine (container address, `localhost` on remote deploy); fixed port on desktop |
| 401 / 403 | Key revoked; capabilities covering search and ingestion; if the key is limited to certain knowledge bases, is the target allowed |
| Nothing in the knowledge base after capture | Document list and parse status; `processing` = in progress; failure detail on the document page |

## Related documentation {#related-documentation}
- Credentials and capabilities: [Tenants, users, and authentication](../03-features/01-tenant-auth.md)
- Ingestion pipeline: [Document pipeline](../02-architecture/03-document-pipeline.md)
- Other integrations: [Claw Skill](07-claw-skill.md), [CLI](02-cli.md), [Go SDK](03-go-sdk.md)
