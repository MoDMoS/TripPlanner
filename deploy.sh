#!/usr/bin/env bash
set -euo pipefail
exec "${PORTAL_DIR:-$HOME/MoDMoS_Portal}/scripts/deploy-all.sh" tripplanner
