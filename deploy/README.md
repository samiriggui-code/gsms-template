# GSMS deploy overlays

| File | Purpose |
|---|---|
| [docker-compose.traefik.yml](docker-compose.traefik.yml) | Traefik labels for landing + WeKnora app (Hostinger / custom domains) |
| [docker-compose.traefik.gsms.yml](docker-compose.traefik.gsms.yml) | Shared `gsms-secure` middleware on the GSMS VPS |
| [deploy-global-it-ss-vps.md](deploy-global-it-ss-vps.md) | **global-it-ss** VPS procedure — run [`../scripts/deploy-global-it-ss.sh`](../scripts/deploy-global-it-ss.sh) |
| [weknora-lite.service](weknora-lite.service) | systemd unit reference |

For Global-IT-SS on the shared GSMS VPS, follow [deploy-global-it-ss-vps.md](deploy-global-it-ss-vps.md) and use **`./scripts/deploy-global-it-ss.sh`** (builds `landing` + `frontend`, then `up -d --no-build`). The frontend image is **`gsms-weknora-ui`** (local build from `./frontend` with `pull_policy: build`); never rely on Docker Hub `wechatopenai/weknora-ui` or bare `up -d` without a local build.
