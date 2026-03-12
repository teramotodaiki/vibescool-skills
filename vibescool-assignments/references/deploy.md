# Deploy Rules

- 公開が必要な課題では、公開してよいか確認するまで `vibescool deploy` を実行しない。
- 公開可否を確認するメッセージでは、公開してよいかどうかだけを聞く。改善点の質問や別件を同じメッセージに混ぜない。
- 公開が必要な課題では、初回の `vibescool deploy` 前に `wrangler.jsonc`、build 済みの `.js` / `.mjs` entry、必要な静的 assets がそろっていることを自分で確認する。足りなければ自分で補う。
- `wrangler.jsonc` を自分で作る場合は、VibesCool が受け付ける key だけを使い、`compatibility_date` は UTC で今日以下の日付にする。
- `vibescool deploy` が `wrangler.jsonc` 不足、build 出力不足、`compatibility_date` や unsupported key などの設定不備で失敗した場合は、自分で修復し、直せる限り再試行する。自動修復できない blocker が残った場合のみ止まって原因を短く伝える。
- 公開 URL を提示した後は、スマホでの利用手順だけを案内する。
