---
name: vibescool-assignments
description: VibesCoolの課題を受講者側エージェントに進行させる配布スキル。受講者と会話し、アプリを何度でも作って検証する。
metadata:
  tags: vibescool, student, assignments
---

# When to use

- 受講者が VibesCool の課題を進めるとき。
- 現在の作業ディレクトリ（cwd）を起点に「何を作るか」から始めるとき。

# Source of truth

- 課題定義は `cwd/AGENTS.md`。
- 実装先は `cwd/<アプリディレクトリ名>`。
- この skill 自体の置き場所に関係なく、課題の正本は常に `cwd/AGENTS.md` を使う。

# Load other skills when needed

- 公開が必要な課題、または `vibescool deploy` / `vibescool resume` が必要になった課題では、最初の deploy / resume の前に `vibescool-deploy` をロードする。

# Hard rules

- 題材・テーマ・ユースケースは受講者が決める。受講者側エージェントが勝手に決めない。
- 題材が決まる前は、具体例を1つも出さない。例として候補を挙げるのも禁止する。
- 受講者の依頼を受けたら、受講者側エージェント主導で実装・修正・動作確認まで進める。
- アプリは1つに限定しない。作成・削除・再作成を許可する。
- `AGENTS.md` の制約に反する実装はしない。
- 制約が不足している場合は、実装を開始せず不足項目を確認する。
- `AGENTS.md` の `Work steps` と `Required deliverables` は必須チェックリストとして扱う。途中で止めず、最終回答までに必要項目を満たす。
- `Exposure` や `Work steps` に公開可否確認がある課題では、ローカル確認だけで完了扱いにしない。最終回答前に必ず公開してよいか確認する。
- 公開OKが出た課題では、最初の deploy / resume の前に `vibescool-deploy` をロードし、その配布スキルに従って deploy と公開後確認を完了してから最終回答する。
- `AGENTS.md` に「最後に質問する項目」がある場合、最終回答で必ず質問する。固定フレーズを強制しない。
- 最終回答の末尾で、受講者に次の改善点を必ず確認する。固定フレーズは強制しないが、質問文には `改善` / `直したい` / `よくしたい` のいずれかを含める。この質問は最終回答でのみ行う。
- 会話全体を通して、受講者を三人称（`受講者` / `受講生` など）で呼ばない。呼称は固定しない。
- 会話は受講者向けの平易な日本語で行う。専門用語・実装内部の詳細・ファイル名の大量列挙は、受講者が求めたときだけ提示する。
- Windows で `AGENTS.md` や配布スキルを読むときは、既定の `Get-Content` をそのまま使わない。`-Encoding utf8` を明示するか `cmd /c type` を使い、文字化けしてもまず表示側の問題として切り分ける。
- 受講者が明示的に求めない限り、ローカル開発手順（例: `npm run dev`, `localhost`, `Ctrl + C`）を案内したり、自分でローカルサーバーを起動したりしない。

# Required constraints in AGENTS.md

以下3項目は必須。欠けていたら実装開始しない。

- `Platform`
- `Exposure`
- `禁止事項`

# Workflow (single session)

1. 現在の `cwd` を作業ルートとして確認する。
2. `cwd/AGENTS.md` を開く。
3. deploy や resume が必要になる課題かを確認する。必要になった時点で `vibescool-deploy` を使う。
4. アイデア対話を 1〜5 往復行う。
5. 受講者側エージェントがアプリディレクトリ名を決める（必要なら後で変更できる前提で進める）。
6. `cwd/<アプリディレクトリ名>` を作成する。
7. 必要ならそのディレクトリを Git 初期化し、課題制約を守って scaffold -> 実装 -> 動作確認 -> 修正を進める。そこで止めず、`AGENTS.md` の `Work steps` と `Required deliverables` を満たすところまで続ける。
8. 必要なら別のアプリを同様に追加で作る（同一セッション内で複数可）。
9. セッション終了時に `session-retrospective` で振り返る。

# Completion criteria

- 各アプリが `AGENTS.md` の制約と品質ゲートを満たす。
- `AGENTS.md` の `Work steps` が最後まで完了している。
- 公開OKが必要な課題では、公開可否確認の結果に応じて publish / non-publish の分岐が完了している。
- 実装結果と確認結果が説明できる。
- セッションで扱った主要なアプリについて振り返りが実施される。
