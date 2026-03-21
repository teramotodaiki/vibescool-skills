# QR Code Rules

- QR コードはローカル生成のみ。`api.qrserver.com` などの外部サイト / 外部APIで生成しない。
- 生成コマンドは `vibescool qr --url "<URL>" --output-file <ASCII-only-absolute-png-path>` に固定する。
- `npx qrcode`、`command -v qrencode`、`python qrcode` の有無確認を含む探索をしない。最初から上の固定コマンドだけを実行する。
- `qrencode` / `python qrcode` / `qrcode-terminal` など、OS 依存や画像未生成になりうる分岐を作らない。
- QR コード画像のファイル名は ASCII のみを使う。例: `deploy-url-qr.png`
- 最終回答へ埋め込む前に、QR コード画像パスは絶対ファイルパスへ解決する。相対パスは不可。
- 生成直後に、その絶対パスに実ファイルが存在することを確認してから最終回答へ埋め込む。保存メッセージだけで成功と断定しない。
- Windows では、最終回答へ入れる絶対パスの `\` を `/` に置き換える。
- 絶対パスに日本語などの非 ASCII 文字が含まれる場合は、ASCII-only の別パスへコピーしてから埋め込む。
- ASCII-only の退避先例:
  - Windows: `%PUBLIC%/vibescool/deploy-url-qr.png`
  - macOS / Linux: `/tmp/vibescool/deploy-url-qr.png`
