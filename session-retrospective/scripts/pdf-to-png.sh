#!/usr/bin/env bash
set -euo pipefail

pdf_path=""
output_prefix=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --pdf)
      pdf_path="${2:-}"
      shift 2
      ;;
    --output-prefix)
      output_prefix="${2:-}"
      shift 2
      ;;
    *)
      echo "Error: unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [ -z "$pdf_path" ]; then
  echo "Error: --pdf is required" >&2
  exit 1
fi
if [ -z "$output_prefix" ]; then
  echo "Error: --output-prefix is required" >&2
  exit 1
fi
if [ ! -f "$pdf_path" ]; then
  echo "Error: pdf not found: $pdf_path" >&2
  exit 1
fi
if ! command -v pdftoppm >/dev/null 2>&1; then
  echo "Error: pdftoppm is required to export PNG pages from PDF" >&2
  exit 1
fi

mkdir -p "$(dirname "$output_prefix")"
marker_file="$(mktemp)"
pdftoppm -png "$pdf_path" "$output_prefix" >/dev/null

generated_files="$(
  find "$(dirname "$output_prefix")" -maxdepth 1 -type f -name "$(basename "$output_prefix")-*.png" -newer "$marker_file" | sort
)"
if [ -z "$generated_files" ]; then
  echo "Error: no PNG files were generated from $pdf_path" >&2
  exit 1
fi

printf '%s\n' "$generated_files"
