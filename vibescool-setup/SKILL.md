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

- ソフトウェアを install する直前に、必ず `今から <名前> をインストールします。` と日本語で伝える。
- すでに必要条件を満たしているソフトウェアは、再 install しない。
- `npm` で install する package は常に latest を使う。
- setup 中は題材決めや作品の実装に入らず、環境を整えることだけに集中する。
- `vibescool setup` 実行後は、global の `vibescool-assignments` を開き、そのルールを優先して会話を続ける。

# Workflow

1. 現在の `cwd` を作業ルートとして確認する。
2. `node --version` と `npm --version` を確認する。
3. `Node.js` または `npm` が不足している場合は、install 前に何を入れるか説明してから対応する。自動 install が難しい環境なら、不足内容と次の操作を短く伝えて止まる。
4. `vibescool --version` を確認し、必要なら説明してから `npm install -g vibescool-cli@latest` を実行する。
5. `agent-browser --version` を確認し、必要なら説明してから `npm install -g agent-browser@latest` を実行する。
6. `vibescool-assignments` が global で使える状態か確認する。無ければ、https://github.com/teramotodaiki/vibescool-skills/tree/main/vibescool-assignments を使って global に追加する。
7. `session-retrospective` が global で使える状態か確認する。無ければ、https://github.com/teramotodaiki/vibescool-skills/tree/main/session-retrospective を使って global に追加する。
8. `vibescool setup` を実行する。
9. `cwd/.vibescool/ASSIGNMENT.md` がそろっていることを確認する。
10. global の `vibescool-assignments` を開く。
11. 準備完了を短く伝え、そのまま何を作りたいかを聞く。

# Completion criteria

- `vibescool-cli` と `agent-browser` が必要に応じて使える状態になっている。
- `vibescool-assignments` と `session-retrospective` が global で使える状態になっている。
- `vibescool setup` が完了し、`.vibescool/ASSIGNMENT.md` が作業ルートにそろっている。
- 以後の会話が `vibescool-assignments` のルールで続けられる。
