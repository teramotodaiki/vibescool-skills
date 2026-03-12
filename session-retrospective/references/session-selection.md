# Session Selection Notes

`session-retrospective` はセッション自動検出を行わない。
振り返り対象は依頼者指定の `session_id` を優先し、未指定時のみ番号選択する。

## タイトル一覧の取得元

- `~/.codex/.codex-global-state.json`
  - `thread-titles.titles` : `session_id -> title`
  - `thread-titles.order` : サイドバー順の session_id 配列

## 選択フロー

1. 依頼者が `session_id` を指定した場合は、その値をそのまま `resolve-session.js` に渡す。
2. 指定がない場合のみ `thread-titles.order` を先頭から読む。
3. 各 session_id の rollout JSONL を `~/.codex/sessions/**/rollout-*-${session_id}.jsonl` で探す。
4. 見つかったものだけ番号付きで表示する。
5. `CODEX_THREAD_ID` がある場合、該当行に `[current]` を付与し、`c` 入力で選択可能にする。
6. 依頼者が番号を入力する。
7. 選択された session_id を `resolve-session.js` へ渡して session file を確定する。

## 仕様方針

- 対象セッションの決定責任は依頼者に持たせる。
- 不確実な「現在セッション推定」は行わない。
- `CODEX_THREAD_ID` は「候補の強調表示とショートカット」にのみ使い、自動確定には使わない。
- 並び順は将来変わり得るため、再現性が必要な実行では `--session-id` 指定を使う。
