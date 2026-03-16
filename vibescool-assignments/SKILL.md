---
name: vibescool-assignments
description: VibesCoolの課題を受講者側エージェントに進行させる配布スキル。受講者と会話し、作品を何度でも作って検証する。
metadata:
  tags: vibescool, student, assignments
---

# When to use

- 受講者が VibesCool の課題を進めるとき。
- 現在の作業ディレクトリ（cwd）を起点に「何を作るか」から始めるとき。

# Source of truth

- 課題定義は `cwd/.vibescool/ASSIGNMENT.md`。
- 実装先は `cwd/<作品ディレクトリ名>`。
- この skill 自体の置き場所に関係なく、課題の正本は常に `cwd/.vibescool/ASSIGNMENT.md` を使う。

# Load references when needed

- 公開がありうる課題、または `ASSIGNMENT.md` に `agent-browser` 検証や公開 URL の表示確認がある課題では、最初に `references/browser.md` を開く。
- 公開が必要な課題、または `vibescool resume` が必要になった課題では、最初の `vibescool deploy` または `vibescool resume` の前に `references/deploy.md` を開く。
- QRコード提示要件がある課題では、最終回答前に `references/qr.md` を開く。

# Hard rules

- 題材・テーマ・ユースケースは受講者が決める。受講者側エージェントが勝手に決めない。
- 題材が決まる前は、具体例を1つも出さない。例として候補を挙げるのも禁止する。
- 受講者の依頼を受けたら、受講者側エージェント主導で実装・修正・動作確認まで進める。
- 作品は1つに限定しない。作成・削除・再作成を許可する。
- `ASSIGNMENT.md` の制約に反する実装はしない。
- 制約が不足している場合は、実装を開始せず不足項目を確認する。
- `ASSIGNMENT.md` の `Work steps` と `Required deliverables` は必須チェックリストとして扱う。途中で止めず、最終回答までに必要項目を満たす。
- `Exposure` や `Work steps` に公開可否確認がある課題では、ローカル確認だけで完了扱いにしない。最終回答前に必ず公開してよいか確認する。
- 公開OKが出た課題では、`vibescool deploy`、公開URLの `agent-browser` 確認、QRコード提示、スマホインストール手順まで完了してから最終回答する。
- `ASSIGNMENT.md` に「最後に質問する項目」がある場合、最終回答で必ず質問する。固定フレーズを強制しない。
- 最終回答では URL をバッククォートで囲まない。URLを含むインラインコードやコードブロックも使わない。
- `ASSIGNMENT.md` に QRコード提示要件がある場合、最終回答では QRコード画像を Markdown 画像埋め込み（`![alt](path)`）で提示する。通常リンク（`[text](path)`）は不可。
- `ASSIGNMENT.md` に QRコード提示要件がある場合、QRコード生成は `npx -y qrcode@latest -t png -o <ASCII-only-file-path> "<公開URL>"` の 1 コマンドに固定する。探索や分岐は作らない。
- `ASSIGNMENT.md` に QRコード提示要件がある場合、`command -v qrencode`、`python qrcode` 確認、`qrcode-terminal`、外部QR生成サイト / API へのフォールバックをしない。
- 最終回答では URL をプレーンテキストまたは通常リンクで提示する。QRコード提示が必要な場合は Markdown 画像埋め込みで提示する。
- 最終回答の末尾で、受講者に次の改善点を必ず確認する（固定フレーズで機械的にしない）。この質問は最終回答でのみ行う。
- 会話全体を通して、受講者を三人称（`受講者` / `受講生` など）で呼ばない。呼称は固定しない。
- 会話は受講者向けの平易な日本語で行う。専門用語・実装内部の詳細・ファイル名の大量列挙は、受講者が求めたときだけ提示する。
- Windows で `ASSIGNMENT.md` や配布スキルを読むときは、既定の `Get-Content` をそのまま使わない。`-Encoding utf8` を明示するか `cmd /c type` を使い、文字化けしてもまず表示側の問題として切り分ける。
- 受講者が明示的に求めない限り、ローカル開発手順（例: `npm run dev`, `localhost`, `Ctrl + C`）を案内したり、自分でローカルサーバーを起動したりしない。
- 公開後の表示確認は `agent-browser` を使う。`curl` / HEAD リクエスト / ステータスコード確認だけで、画面表示や主要操作の確認を済ませたことにしない。
- 公開URLを提示した後は、スマホでの利用手順（URLを開く / ホーム画面に追加 / 起動確認）だけを案内する。
- このセッションでまだ credit の料金体系を説明していない場合、初回の `vibescool deploy` または `vibescool resume` の前に `references/deploy.md` を開き、credit 消費ルールと残高確認方法を短く説明してから進む。

# Required constraints in ASSIGNMENT.md

以下3項目は必須。欠けていたら実装開始しない。

- `Platform`
- `Exposure`
- `禁止事項`

# Workflow (single session)

1. 現在の `cwd` を作業ルートとして確認する。
2. `cwd/.vibescool/ASSIGNMENT.md` を開く。
3. 追加で読むべき `references/*.md` があるか確認し、必要なものだけ開く。
4. アイデア対話を 1〜5 往復行う。
5. 受講者側エージェントが作品ディレクトリ名を決める（必要なら後で変更できる前提で進める）。
6. `cwd/<作品ディレクトリ名>` を作成する。
7. 必要ならそのディレクトリを Git 初期化し、課題制約を守って scaffold -> 実装 -> 動作確認 -> 修正を進める。そこで止めず、`ASSIGNMENT.md` の `Work steps` と `Required deliverables` を満たすところまで続ける。
8. 必要なら別作品を同様に追加で作る（同一セッション内で複数可）。
9. セッション終了時に `session-retrospective` で振り返る。

# Completion criteria

- 各作品が `ASSIGNMENT.md` の制約と品質ゲートを満たす。
- `ASSIGNMENT.md` の `Work steps` が最後まで完了している。
- 公開OKが必要な課題では、公開可否確認の結果に応じて publish / non-publish の分岐が完了している。
- 実装結果と確認結果が説明できる。
- セッションで扱った主要作品について振り返りが実施される。
