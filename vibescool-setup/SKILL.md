---
name: vibescool-setup
description: VibesCoolの受講開始時に、必要なツール確認とインストール、global skill の準備、week 1 の課題AGENTS作成を行う配布スキル。
metadata:
  tags: vibescool, student, setup
---

# When to use

- 受講開始直後に、いま開いているフォルダを VibesCool の課題ワークスペースとして整えるとき。
- `vibescool-assignments` を使い始める前に、必要なツールと week 1 の課題AGENTSをそろえるとき。

# Hard rules

- ソフトや global skill を新しく入れる前、または更新する前は、必ず説明だけを先に送り、その場で止まって明確な承認を待つ。承認前に install command を実行してはならない。
- `npm` package と global の配布スキルは、足りないものを先に全部洗い出し、まとめて 1 回で承認を取る。見つけるたびに 1 件ずつ承認を取り直してはならない。
- まとめ承認の説明では、追加や更新が必要なものをすべて列挙し、日本語で次を必ず含める。
  - 何を入れるのか
  - 名前の読み方をカタカナで添える
  - それぞれ何のために必要かを、やさしい言い方で説明する
  - 受講者が押すボタンや確認の画面など、その install や追加で必要な操作だけを先に説明する
  - 分からないことがあれば何でも聞いてよいと伝える
  - 最後を `まとめて準備してもよいですか？` で終える
- `vibescool login` を実行する前も、install 前と同じように説明だけを先に送り、その場で止まって明確な承認を待つ。
- login 前の説明では、何のためのログインか、ブラウザや確認画面で必要な操作は何か、分からないことがあれば何でも聞いてよいことを日本語で先に伝える。
- `今からログインします。` と言った直後に先へ進むのは禁止。説明を出したら一度止まり、承認が来るまで待つ。
- 難しい技術用語やカタカナ語はできるだけ避ける。避けにくい語は、すぐ後ろで短く説明する。
- 管理者権限の確認が出る可能性が高いと判断できる install のときだけ、その対応を説明する。毎回機械的に同じ注意文を入れてはならない。
- `今から <名前> をインストールします。` と言った直後に先へ進むのは禁止。説明を出したら一度止まり、承認が来るまで待つ。
- Windows で日本語の Markdown や配布スキルを読むときは、既定の `Get-Content` をそのまま使わない。`-Encoding utf8` を明示するか `cmd /c type` を使い、文字化けしても即座にファイル破損と判断しない。
- すでに必要条件を満たしているソフトウェアは、再 install しない。
- `npm` で install する package は常に latest を使う。
- global の配布スキルを確認したり追加したりするときは、必ず system の `skill-installer` を使う。`~/.codex/skills` や `/Users/.../.codex/skills` のような固定パスを直接見に行って判定してはならない。
- setup 中は題材決めや作品の実装に入らず、環境を整えることだけに集中する。
- `cwd/AGENTS.md` がすでに存在する場合は、絶対に上書きしない。新しい講義用フォルダを作るよう短く伝えて止まる。
- week 1 の課題AGENTSの正本は https://vibescool.jp/assignments/week-1.md。local template や別名ファイルを正本にしない。

# Setup approval template

- `npm` package や global の配布スキルをまとめて準備するときは、次の形を基本にする。

```text
今から次のものをまとめて準備します。
- `vibescool-cli` （バイブスクール シーエルアイ）: 課題の準備や公開に使います。
- `agent-browser` （エージェント ブラウザー）: 公開した画面が正しく見えるか確かめるのに使います。
- `vibescool-assignments` （バイブスクール アサインメンツ）: 課題を進めるための案内です。
- `session-retrospective` （セッション レトロスペクティブ）: 最後のふりかえりに使います。
このあと確認の画面が出たら、進めるほうのボタンを押してください。たとえば「はい」や「許可」です。
なにか分からないことがあれば、何でも聞いてください。

まとめて準備してもよいですか？
```

- 実際の対象一覧と説明は、その都度不足分だけに合わせて言い換える。
- 管理者権限の確認が出そうな install が含まれるときだけ、たとえば `パソコンから確認の画面が出たら、「はい」を押してください。` のように操作を足す。
- 返事が来るまでは待つ。承認がないまま次の install や次の作業へ進まない。

# Workflow

1. 現在の `cwd` を作業ルートとして確認する。
2. `node --version` と `npm --version` を確認する。
3. `Node.js` または `npm` が不足している場合は、その不足だけをやさしく説明し、承認を待ってから対応する。自動 install が難しい環境なら、不足内容と次の操作をやさしく伝えて止まる。
4. `vibescool describe --output json`、`agent-browser --version`、`vibescool-assignments` の global 利用可否、`session-retrospective` の global 利用可否を確認し、追加や更新が必要なものを一覧化する。
5. 4 で不足が 1 つ以上あった場合は、上の setup approval template に沿って不足分をまとめて説明し、承認を 1 回だけ待つ。
6. 5 の承認後、必要な `npm install -g ...@latest` と global の配布スキル追加を順に実行する。途中で新しい承認は挟まない。
7. `vibescool credit --output json` など、ログインが必要な読み取り command で現在のログイン状態を確認する。未ログインまたは期限切れなら、login 前の説明を送り、承認を待ってから `vibescool login` を実行する。
8. `cwd/AGENTS.md` が存在しないことを確認する。存在したら上書きせず、新しい講義用フォルダを作るよう短く伝えて止まる。
9. https://vibescool.jp/assignments/week-1.md を開く。
10. その内容を `cwd/AGENTS.md` に UTF-8 で保存する。
11. `cwd/AGENTS.md` がそろっていることを確認する。
12. 準備完了を短く伝え、そのまま何を作りたいかを聞く。

# Completion criteria

- `vibescool-cli` と `agent-browser` が必要に応じて使える状態になっている。
- `vibescool-cli` のログインが完了し、公開前に必要な準備が先に済んでいる。
- `vibescool-assignments` と `session-retrospective` が global で使える状態になっている。
- week 1 の正本 https://vibescool.jp/assignments/week-1.md から `AGENTS.md` が作業ルートにそろっている。
- 以後の会話が課題AGENTSのルールで続けられる。
