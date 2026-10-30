# GSMS deploy overlays

| File | Purpose |
|---|---|
| [docker-compose.traefik.yml](docker-compose.traefik.yml) | Traefik labels for landing + WeKnora app (Hostinger / custom domains) |
| [docker-compose.traefik.gsms.yml](docker-compose.traefik.gsms.yml) | Shared `gsms-secure` middleware on the GSMS VPS |
| [deploy-global-it-ss-vps.md](deploy-global-it-ss-vps.md) | **global-it-ss** VPS procedure (build `landing` **and** `frontend`) |
| [weknora-lite.service](weknora-lite.service) | systemd unit reference |

For Global-IT-SS on the shared GSMS VPS, follow [deploy-global-it-ss-vps.md](deploy-global-it-ss-vps.md). Building only `landing` leaves the auth UI on upstream `weknora-ui:latest`.
