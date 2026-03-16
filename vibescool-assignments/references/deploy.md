# Deploy Rules

- 公開が必要な課題では、公開してよいか確認するまで `vibescool deploy` を実行しない。
- 公開可否を確認するメッセージでは、公開してよいかどうかだけを聞く。改善点の質問や別件を同じメッセージに混ぜない。
- setup 中に `vibescool login` を済ませていても、有効期限切れの可能性がある。公開が必要な課題では、初回の `vibescool deploy` 前に必ず現在のログイン状態を確認し、未ログインまたは期限切れなら `vibescool login` をやり直してから続ける。
- このセッションでまだ credit の料金体系を説明していない場合は、初回の `vibescool deploy` または `vibescool resume` の前に次を短く伝える。
  - `1 credit = 1 Server の 24時間レンタル`
  - 新しい 24時間レンタルが始まる `deploy` / `resume` では 1 credit 消費し得る
  - すでに有効な 24時間レンタルがある場合は追加で消費しない
  - `Running` のまま 24時間を超えると追加で credit 消費し得る
  - 現在の残高は `vibescool credit` で確認できる
  - 金額の正本は Web / Stripe にあるため、CLI では金額を案内しない
- 必要なら `vibescool docs billing` を開き、説明内容の正本を確認してから案内する。
- 公開が必要な課題では、初回の `vibescool deploy` 前に `wrangler.jsonc`、build 済みの `.js` / `.mjs` entry、必要な静的 assets がそろっていることを自分で確認する。足りなければ自分で補う。
- `wrangler.jsonc` を自分で作る場合は、VibesCool が受け付ける key だけを使い、`compatibility_date` は UTC で今日以下の日付にする。
- `vibescool deploy` が `wrangler.jsonc` 不足、build 出力不足、`compatibility_date` や unsupported key などの設定不備で失敗した場合は、自分で修復し、直せる限り再試行する。自動修復できない blocker が残った場合のみ止まって原因を短く伝える。
- 公開 URL を提示した後は、スマホでの利用手順だけを案内する。
