---
name: vibescool-setup
description: VibesCoolの受講開始時に、必要なツール確認とインストール、global skill の準備、workspace の課題ファイル作成を行う配布スキル。
metadata:
  tags: vibescool, student, setup
---

# When to use

- 受講開始直後に、いま開いているフォルダを VibesCool の課題ワークスペースとして整えるとき。
- `vibescool-assignments` を使い始める前に、必要なツールとファイルをそろえるとき。

# Hard rules

- ソフトや global skill を新しく入れる前、または更新する前は、必ず説明だけを先に送り、その場で止まって明確な承認を待つ。承認前に install command を実行してはならない。
- install 前の説明は、毎回 1 つずつ、日本語で次を必ず含める。
  - 何を install するのか
  - 名前の読み方をカタカナで添える
  - 何のために必要かを、やさしい言い方で説明する
  - 受講者が押すボタンや確認の画面など、その install で必要な操作だけを先に説明する
  - 分からないことがあれば何でも聞いてよいと伝える
  - 最後を `インストールしてもよいですか？` で終える
- 難しい技術用語やカタカナ語はできるだけ避ける。避けにくい語は、すぐ後ろで短く説明する。
- 管理者権限の確認が出る可能性が高いと判断できる install のときだけ、その対応を説明する。毎回機械的に同じ注意文を入れてはならない。
- `今から <名前> をインストールします。` と言った直後に先へ進むのは禁止。説明を出したら一度止まり、承認が来るまで待つ。
- すでに必要条件を満たしているソフトウェアは、再 install しない。
- `npm` で install する package は常に latest を使う。
- setup 中は題材決めや作品の実装に入らず、環境を整えることだけに集中する。
- `vibescool setup` 実行後は、global の `vibescool-assignments` を開き、そのルールを優先して会話を続ける。

# Install approval template

- install 前の説明は、次の形を基本にする。

```text
今から `Node.js` （ノード）というソフトをインストールします。
アプリを作るために必要な、無料のソフトです。
このあと確認の画面が出たら、進めるほうのボタンを押してください。たとえば「はい」や「許可」です。
なにか分からないことがあれば、何でも聞いてください。

インストールしてもよいですか？
```

- 実際の名前と説明は、その都度対象に合わせて言い換える。
- 管理者権限の確認が出そうな install のときだけ、たとえば `パソコンから確認の画面が出たら、「はい」を押してください。` のように操作を足す。
- 返事が来るまでは待つ。承認がないまま次の install や次の作業へ進まない。

# Workflow

1. 現在の `cwd` を作業ルートとして確認する。
2. `node --version` と `npm --version` を確認する。
3. `Node.js` または `npm` が不足している場合は、上の approval template に沿って説明し、承認を待ってから対応する。自動 install が難しい環境なら、不足内容と次の操作をやさしく伝えて止まる。
4. `vibescool --version` を確認し、必要なら上の approval template に沿って説明し、承認を待ってから `npm install -g vibescool-cli@latest` を実行する。
5. `agent-browser --version` を確認し、必要なら上の approval template に沿って説明し、承認を待ってから `npm install -g agent-browser@latest` を実行する。
6. `vibescool-assignments` が global で使える状態か確認する。無ければ、上の approval template に沿って説明し、承認を待ってから https://github.com/teramotodaiki/vibescool-skills/tree/main/vibescool-assignments を使って global に追加する。
7. `session-retrospective` が global で使える状態か確認する。無ければ、上の approval template に沿って説明し、承認を待ってから https://github.com/teramotodaiki/vibescool-skills/tree/main/session-retrospective を使って global に追加する。
8. `vibescool setup` を実行する。
9. `cwd/.vibescool/ASSIGNMENT.md` がそろっていることを確認する。
10. global の `vibescool-assignments` を開く。
11. 準備完了を短く伝え、そのまま何を作りたいかを聞く。

# Completion criteria

- `vibescool-cli` と `agent-browser` が必要に応じて使える状態になっている。
- `vibescool-assignments` と `session-retrospective` が global で使える状態になっている。
- `vibescool setup` が完了し、`.vibescool/ASSIGNMENT.md` が作業ルートにそろっている。
- 以後の会話が `vibescool-assignments` のルールで続けられる。
