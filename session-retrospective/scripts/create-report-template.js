#!/usr/bin/env node

const { mkdirSync, writeFileSync, openSync, readSync, closeSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

const READ_CHUNK_SIZE = 64 * 1024;
const MAX_LINE_LENGTH = 5 * 1024 * 1024;

function parseArgs(argv) {
  const options = {
    sessionFile: "",
    outputJson: "",
    sessionId: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--session-file") {
      const value = argv[index + 1];
      if (!value) throw new Error("missing value for --session-file");
      options.sessionFile = value;
      index += 1;
      continue;
    }
    if (arg === "--output-json") {
      const value = argv[index + 1];
      if (!value) throw new Error("missing value for --output-json");
      options.outputJson = value;
      index += 1;
      continue;
    }
    if (arg === "--session-id") {
      const value = argv[index + 1];
      if (!value) throw new Error("missing value for --session-id");
      options.sessionId = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${arg}`);
  }

  if (!options.sessionFile) throw new Error("--session-file is required");
  if (!options.outputJson) throw new Error("--output-json is required");
  return options;
}

function readFirstNonEmptyLine(filePath) {
  const fd = openSync(filePath, "r");
  const buffer = Buffer.alloc(READ_CHUNK_SIZE);
  let carry = "";
  try {
    while (true) {
      const bytesRead = readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead <= 0) break;
      carry += buffer.toString("utf8", 0, bytesRead);
      if (carry.length > MAX_LINE_LENGTH) {
        throw new Error(`first line too long: ${filePath}`);
      }
      let newlineIndex = carry.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = carry.slice(0, newlineIndex).trim();
        carry = carry.slice(newlineIndex + 1);
        if (line) return line;
        newlineIndex = carry.indexOf("\n");
      }
    }
    const tail = carry.trim();
    return tail || null;
  } finally {
    closeSync(fd);
  }
}

function parseSessionMeta(sessionFilePath) {
  const line = readFirstNonEmptyLine(sessionFilePath);
  if (!line) throw new Error(`empty session file: ${sessionFilePath}`);
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch (error) {
    throw new Error(`failed to parse first line JSON: ${String(error)}`);
  }
  if (parsed.type !== "session_meta") {
    throw new Error("first non-empty line is not session_meta");
  }
  const payload = parsed.payload && typeof parsed.payload === "object" ? parsed.payload : {};
  return {
    sessionId: typeof payload.id === "string" ? payload.id : "",
    startedAt: typeof payload.timestamp === "string" ? payload.timestamp : "",
  };
}

function createTemplate(meta, _sessionIdHint) {
  return {
    sessionTitle: "セッションタイトルを記入",
    locale: "ja-JP",
    overview: "今回のセッション全体を3-5文で要約",
    doneActions: [
      "やったことを端的に記入（短く）",
      "やったことを端的に記入（短く）",
    ],
    userDirectives: [
      "ユーザーが指示した内容を記入",
      "ユーザーが指示した内容を記入",
    ],
    codexLearnings: [
      "このセッションを通じてCodexから学んだことを記入",
      "このセッションを通じてCodexから学んだことを記入",
    ],
    improvementPoints: [
      "次回に向けてユーザーが改善できるポイントを記入",
      "次回に向けてユーザーが改善できるポイントを記入",
    ],
    keywords: [
      {
        term: "キーワード1",
        description: "ユーザーが尋ねた語またはセッション特有の語を解説",
      },
      {
        term: "キーワード2",
        description: "ユーザーが尋ねた語またはセッション特有の語を解説",
      },
    ],
    scores: [
      { key: "goal_planning", score: 3, comment: "評価理由を記入" },
      { key: "execution", score: 3, comment: "評価理由を記入" },
      { key: "debugging", score: 3, comment: "評価理由を記入" },
      { key: "communication", score: 3, comment: "評価理由を記入" },
      { key: "reflection", score: 3, comment: "評価理由を記入" },
    ],
    notes: {
      instruction:
        "このJSONは下書きです。Codexが対象セッション全体を読み、誰の発言かを区別して本文・キーワード・点数を更新してください。期間(start~end)はセッションログから自動計算されます。",
    },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const sessionFilePath = resolve(options.sessionFile);
  const outputJsonPath = resolve(options.outputJson);
  const meta = parseSessionMeta(sessionFilePath);
  const template = createTemplate(meta, options.sessionId);
  mkdirSync(dirname(outputJsonPath), { recursive: true });
  writeFileSync(outputJsonPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  process.stdout.write(`${outputJsonPath}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}
