#!/usr/bin/env bash
set -euo pipefail

self_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$self_dir/html-to-pdf.js" "$@"
