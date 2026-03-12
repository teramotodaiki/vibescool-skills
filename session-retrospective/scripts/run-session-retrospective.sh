#!/usr/bin/env bash
set -euo pipefail

self_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

session_id=""
codex_home="${CODEX_HOME:-$HOME/.codex}"
output_dir=""
report_title="Codexセッション振り返りレポート"
chrome_path="${CHROME_PATH:-}"
list_limit="12"
report_json=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --session-id)
      session_id="${2:-}"
      shift 2
      ;;
    --codex-home)
      codex_home="${2:-}"
      shift 2
      ;;
    --output-dir)
      output_dir="${2:-}"
      shift 2
      ;;
    --report-title)
      report_title="${2:-}"
      shift 2
      ;;
    --report-json)
      report_json="${2:-}"
      shift 2
      ;;
    --chrome-path)
      chrome_path="${2:-}"
      shift 2
      ;;
    --limit)
      list_limit="${2:-}"
      shift 2
      ;;
    *)
      echo "Error: unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [ -z "$output_dir" ]; then
  echo "Error: --output-dir is required" >&2
  exit 1
fi
if [ ! -d "$codex_home" ]; then
  echo "Error: codex home not found: $codex_home" >&2
  exit 1
fi

mkdir -p "$output_dir"
output_dir="$(cd "$output_dir" && pwd)"

if [ -z "$session_id" ]; then
  choices_json="$(node "$self_dir/list-session-choices.js" --codex-home "$codex_home" --limit "$list_limit")"
  printf '\n'
  echo "振り返るセッションを番号で選んでください:"
  node -e '
const data = JSON.parse(process.argv[1]);
for (const item of data.choices) {
  const shortId = item.sessionId.slice(0, 8);
  const marker = item.isCurrent ? " [current]" : "";
  const cwdName = item.cwdName ? ` [${item.cwdName}]` : "";
  process.stdout.write(`${item.index}. ${item.title}${marker}${cwdName}  (${item.age}, ${shortId})\n`);
}
if (data.currentThreadId) {
  process.stdout.write(`\nCODEX_THREAD_ID: ${data.currentThreadId}\n`);
}
' "$choices_json"

  printf '\n'
  if [ -n "${CODEX_THREAD_ID:-}" ]; then
    read -r -p "番号（または c=current）: " selected_number
  else
    read -r -p "番号: " selected_number
  fi
  if [ -z "${selected_number:-}" ]; then
    echo "Error: selection is required" >&2
    exit 1
  fi

  if [ "$selected_number" = "c" ] || [ "$selected_number" = "C" ]; then
    if [ -z "${CODEX_THREAD_ID:-}" ]; then
      echo "Error: CODEX_THREAD_ID is not set" >&2
      exit 1
    fi
    session_id="$CODEX_THREAD_ID"
  else
    session_id="$(node -e '
const data = JSON.parse(process.argv[1]);
const selected = Number.parseInt(process.argv[2], 10);
if (!Number.isInteger(selected)) process.exit(2);
const found = data.choices.find((item) => item.index === selected);
if (!found) process.exit(3);
process.stdout.write(found.sessionId);
' "$choices_json" "$selected_number")" || {
      echo "Error: invalid selection: ${selected_number}" >&2
      exit 1
    }
  fi
fi

resolved_json="$(node "$self_dir/resolve-session.js" --session-id "$session_id" --codex-home "$codex_home")"
session_file_path="$(node -e 'const data=JSON.parse(process.argv[1]); if(!data.sessionFilePath){process.exit(2);} process.stdout.write(data.sessionFilePath);' "$resolved_json")"

html_path="$output_dir/$session_id.html"
pdf_path="$output_dir/$session_id.pdf"
png_prefix="$output_dir/$session_id"
template_json_path="$output_dir/$session_id.report-template.json"

if [ -z "$report_json" ]; then
  node "$self_dir/create-report-template.js" \
    --session-file "$session_file_path" \
    --output-json "$template_json_path" \
    --session-id "$session_id" \
    >/dev/null
  echo "Error: --report-json is required" >&2
  echo "template=$template_json_path" >&2
  echo "hint=Codexで対象セッションを読み、テンプレートJSONを埋めて再実行してください" >&2
  exit 1
fi

report_json="$(cd "$(dirname "$report_json")" && pwd)/$(basename "$report_json")"
if [ ! -f "$report_json" ]; then
  echo "Error: report json not found: $report_json" >&2
  exit 1
fi

node "$self_dir/build-report-html.js" \
  --session-file "$session_file_path" \
  --report-json "$report_json" \
  --output-html "$html_path" \
  --report-title "$report_title"

html_to_pdf_args=(
  --html "$html_path"
  --pdf "$pdf_path"
)
if [ -n "$chrome_path" ]; then
  html_to_pdf_args+=(--chrome-path "$chrome_path")
fi

bash "$self_dir/html-to-pdf.sh" "${html_to_pdf_args[@]}" >/dev/null

generated_pngs="$(
  bash "$self_dir/pdf-to-png.sh" \
  --pdf "$pdf_path" \
  --output-prefix "$png_prefix"
)"

echo "session_id=$session_id"
echo "session_file=$session_file_path"
echo "report_json=$report_json"
echo "html=$html_path"
echo "pdf=$pdf_path"
png_count=0
while IFS= read -r png_path; do
  [ -n "$png_path" ] || continue
  png_count=$((png_count + 1))
  echo "png_$png_count=$png_path"
  echo "png_markdown_$png_count=![retrospective p$png_count]($png_path)"
done <<< "$generated_pngs"
