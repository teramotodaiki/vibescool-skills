# Browser Policy

- `agent-browser` は OS を問わず system Chrome 優先で使う。最初から Chromium ダウンロード前提にしない。
- `agent-browser` を使う前に、作業ルートへ `agent-browser.json` を作成し、既定値を次で固定する。

```json
{
  "engine": "chrome"
}
```

- `agent-browser` 実行時は、この設定または `--engine chrome` により Chrome engine を使う。
- `agent-browser install` は、system Chrome が見つからないことを切り分けた後にのみ実行してよい。
- macOS / Windows では、まず system Chrome がある前提で確認する。見つからない場合でも、すぐに「Chrome 未インストール」と断定せず、Chrome engine の失敗内容と既知パスを確認する。
- `AGENT_BROWSER_EXECUTABLE_PATH` を使う場合は、system Chrome / Chromium / Edge の実パスを明示する。
- `AGENTS.md` に `agent-browser` 検証がある場合、`agent-browser` 実行ログを必ず残す。`curl` のみで代替しない。
- deploy 後は、公開 URL を `agent-browser` で実表示確認するまで完了報告しない。
- deploy 後は、公開 URL を開くだけでなく、主要な 1 操作まで `agent-browser` で実行して結果を確認する。`curl` / HEAD / HTML取得だけで「ボタンが動いた」と断定しない。
- クリック後の状態確認は逐次で行う。`click` と DOM 読み取りやスクリーンショットを同時に投げず、必要なら短く `wait` してから結果を読む。
