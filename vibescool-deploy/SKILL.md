---
name: vibescool-deploy
description: VibesCool Platform にアプリを deploy または resume するときに使う配布スキル。private / public deploy、credit 消費の説明、ログイン確認、設定修復、deploy 後の表示確認、URL共有、QRコード生成が必要なときに使う。
---

# When to use

- VibesCool Platform にアプリを deploy するとき。
- VibesCool Platform にアプリを resume するとき。
- private / public のどちらで出すかを守りつつ、deploy 後の確認まで進めるとき。
- deploy 後に URL 共有や QR コード生成まで求められているとき。

# Source of truth

- 正本は今の依頼、現在の作業ディレクトリ、`wrangler.jsonc` などの deploy 設定、`vibescool` CLI の返り値。
- この配布スキルは deploy / resume と deploy 後確認だけを担当する。実装そのものは担当しない。

# Load references when needed

- 最初の `vibescool deploy` または `vibescool resume` の前に `references/deploy.md` を読む。
- 画面表示の確認が必要な場合は、deploy 後の確認前に `references/browser.md` を読む。
- URL を QR コードにしたい依頼がある場合は、最終回答前に `references/qr.md` を読む。

# Hard rules

- 今の依頼で deploy や公開の前に明示確認が必要な場合は、その確認だけを行って待つ。
- private / public の指定が依頼や設定から一意に決まらない場合は、deploy 前に確認する。
- URL 共有、QR コード生成、表示確認など、依頼された deliverable がそろう前に最終回答しない。
- deploy 後の表示確認が必要な場合は `agent-browser` を使う。`human-browser` や `curl`、HEAD リクエストだけへ置き換えない。
- `agent-browser` が使えない場合は、その時点で止まり、不足を短く伝える。
- `wrangler.jsonc`、build 済み entry、静的 assets、`compatibility_date` などの不備で deploy が失敗した場合は、自分で直せる範囲を修復してから再試行する。
- 最終回答では URL をバッククォートで囲まない。URL を含むインラインコードやコードブロックも使わない。
- QR コードを提示する場合は、最終回答で Markdown 画像埋め込みを使う。

# Workflow

1. 今の依頼とローカル設定を読み、deploy / resume が必要か、private / public のどちらを守るべきかを確認する。
2. 必要な `references/*.md` だけを読む。
3. 明示確認が必要な場合は、その確認だけを行って待つ。
4. 最初の `vibescool deploy` または `vibescool resume` の前に、credit 消費ルールを短く説明し、ログイン状態を確認する。
5. deploy 前に `wrangler.jsonc`、entry、assets を確認し、足りなければ自分で補う。
6. 必要最小限の `--auto-pause-after` で `vibescool deploy` または `vibescool resume` を実行する。
7. 表示確認が必要な場合は、deploy 後に `agent-browser` で URL を開き、主要な 1 操作まで確認する。
8. QR コード提示が必要なら、ローカルで生成し、絶対パスの PNG が実在することまで確認する。
9. 依頼された deliverable をそろえて最終回答する。

# Completion criteria

- 必要な明示確認が済んでいる。
- credit 説明とログイン確認が済んでいる。
- deploy または resume が成功している。
- 表示確認が必要な場合は、deploy 後の URL を `agent-browser` で実表示確認している。
- URL 共有、QR コード、その他の依頼された deliverable がそろっている。
