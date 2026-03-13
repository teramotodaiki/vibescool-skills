---
name: session-retrospective
description: Codexセッションを振り返るために、実行中のCodexが対象JSONL全文を読み、評価項目に沿った採点付きPDFレポートとPNGプレビューを作成するスキル。
metadata:
  tags: codex, session, retrospective, pdf, education
---

# When to use

`session-retrospective` は、Codex で課題作成や実装を行った後に、同一セッションまたは指定セッションを監査可能な形で振り返るときに使う。

# Preconditions

1. `--codex-home` を省略した場合は `~/.codex`（または `CODEX_HOME`）を使う。
2. PDF/PNG 出力には Chrome/Chromium/Edge 系の実行ファイルが必要。既知パスと `PATH` から自動検出し、必要なら `--chrome-path` または `CHROME_PATH` で上書きできる。
3. `bash` や `pdftoppm` は不要。Node から直接実行する。
4. 対象は Codex の rollout JSONL セッションであること。
5. `CODEX_THREAD_ID` がある場合は一覧で `[current]` 表示される（選択時の参考情報）。
6. 本文要約はスクリプトで自動生成しない。Codex が対象セッション全文を読んで作成する。

# Workflow

1. まず依頼者に振り返り対象の `session_id` を確認し、可能なら `--session-id` で直接指定する。
2. 対象 session JSONL を全文読み、`references/evaluation-rubric.md` の評価項目に沿って評価JSONを作る。
3. `scripts/run-session-retrospective.js` を `--report-json` 付きで実行して HTML/PDF/PNG を生成する。
4. 最終成果物として PDF パスを提示し、加えて PNG をセッションに貼る。
5. 画像貼り付けは絶対パスの Markdown で行う（例: `![retrospective p1](/abs/path/page1.png)`）。
6. `--session-id` が無い場合のみ、一覧表示で番号選択を行う。`CODEX_THREAD_ID` が表示される場合は `c` を使える。

# Commands

以下の例では、配布先に同期されたスキルの配置先を `SKILL_ROOT` として使う:

```bash
SKILL_ROOT="${CODEX_HOME:-$HOME/.codex}/skills/session-retrospective"
```

`session_id` を直接指定して作る（推奨）:

```bash
node "$SKILL_ROOT/scripts/run-session-retrospective.js" \
  --session-id "<codex-session-id>" \
  --report-json "<filled-report-json-path>" \
  --output-dir "$PWD/reports/session-retrospective"
```

必要なら `--chrome-path "<browser-executable>"` を追加して上書きする。

一覧から番号選択して作る（`session_id` 不明時のみ）:

```bash
node "$SKILL_ROOT/scripts/run-session-retrospective.js" \
  --report-json "<filled-report-json-path>" \
  --output-dir "$PWD/reports/session-retrospective"
```

`--report-json` の雛形だけ先に作る:

```bash
node "$SKILL_ROOT/scripts/run-session-retrospective.js" \
  --session-id "<codex-session-id>" \
  --output-dir "$PWD/reports/session-retrospective"
```

この実行は失敗終了するが、`template=...report-template.json` が出力される。Codex が全文を読んでそのJSONを埋め、再実行する。

# Quality gates

1. セッション JSONL は全行を読む。途中打ち切りは禁止。
2. レポート本文は Codex が作成し、スクリプトは描画専用に使う。
3. 誰の発言か（JSONLの `user` / `assistant`）を区別して読み、`やったこと` は短く、`依頼者が指示したこと` と `対象セッションのCodexから学んだこと` を重視する。
4. 評価は5項目（課題理解と計画性 / 実装の実行力 / 問題解決力 / 対話と伝達力 / 振り返りと改善意識）を必須で採点する。
5. 点数はレーダーチャートで視覚化する。
6. レポート上の対象セッション期間は、開始/終了時刻をローカライズして `start ~ end` で表示する。
7. `新しいキーワード` セクションを必須にし、2-3語の用語解説を入れる。
8. `改善できるポイント`（依頼者向け）を必須にし、2-3項目の実行可能な提案を入れる。
9. スクリーンショットがある場合のみスクリーンショットを掲載する。
10. 公開URLがある場合のみURLを掲載する。
11. レポートは A4 1ページに収める。
12. 最終成果物は PDF とし、セッション表示用に PNG も生成する。
13. 既知パスと `PATH` から browser を自動検出できない場合のみ、Chrome/Chromium/Edge のインストール不足として停止する。`where chrome` や `where msedge` だけで事前判定しない。

# Notes

セッション候補一覧のタイトルは `~/.codex/.codex-global-state.json` の `thread-titles` を使う。詳細は `references/session-selection.md` を参照。
評価項目の詳細は `references/evaluation-rubric.md` を参照。

LLM で文章要約を追加する場合は `references/report-prompt.md` の形式を使う。
