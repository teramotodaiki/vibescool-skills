#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { homedir } = require("node:os");
const readline = require("node:readline/promises");

const selfDir = __dirname;

function fail(message) {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    sessionId: "",
    codexHome: process.env.CODEX_HOME || path.join(process.env.HOME || homedir(), ".codex"),
    outputDir: "",
    reportTitle: "Codexセッション振り返りレポート",
    chromePath: process.env.CHROME_PATH || "",
    listLimit: "12",
    reportJson: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    switch (arg) {
      case "--session-id":
        options.sessionId = value || "";
        index += 1;
        break;
      case "--codex-home":
        options.codexHome = value || "";
        index += 1;
        break;
      case "--output-dir":
        options.outputDir = value || "";
        index += 1;
        break;
      case "--report-title":
        options.reportTitle = value || "";
        index += 1;
        break;
      case "--report-json":
        options.reportJson = value || "";
        index += 1;
        break;
      case "--chrome-path":
        options.chromePath = value || "";
        index += 1;
        break;
      case "--limit":
        options.listLimit = value || "";
        index += 1;
        break;
      default:
        fail(`unknown option: ${arg}`);
    }
  }

  return options;
}

function runNodeScript(scriptName, args, options = {}) {
  return execFileSync(process.execPath, [path.join(selfDir, scriptName), ...args], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    ...options,
  });
}

function runJsonScript(scriptName, args) {
  return JSON.parse(runNodeScript(scriptName, args));
}

async function chooseSessionId(codexHome, listLimit) {
  const choices = runJsonScript("list-session-choices.js", ["--codex-home", codexHome, "--limit", listLimit]);

  process.stdout.write("\n振り返るセッションを番号で選んでください:\n");
  for (const item of choices.choices) {
    const shortId = item.sessionId.slice(0, 8);
    const marker = item.isCurrent ? " [current]" : "";
    const cwdName = item.cwdName ? ` [${item.cwdName}]` : "";
    process.stdout.write(`${item.index}. ${item.title}${marker}${cwdName}  (${item.age}, ${shortId})\n`);
  }
  if (choices.currentThreadId) {
    process.stdout.write(`\nCODEX_THREAD_ID: ${choices.currentThreadId}\n`);
  }
  process.stdout.write("\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const selected = await rl.question(process.env.CODEX_THREAD_ID ? "番号（または c=current）: " : "番号: ");
    if (!selected) {
      fail("selection is required");
    }
    if (selected === "c" || selected === "C") {
      if (!process.env.CODEX_THREAD_ID) {
        fail("CODEX_THREAD_ID is not set");
      }
      return process.env.CODEX_THREAD_ID;
    }

    const parsed = Number.parseInt(selected, 10);
    const found = choices.choices.find((item) => item.index === parsed);
    if (!found) {
      fail(`invalid selection: ${selected}`);
    }
    return found.sessionId;
  } finally {
    rl.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.outputDir) {
    fail("--output-dir is required");
  }
  if (!options.codexHome || !fs.existsSync(options.codexHome) || !fs.statSync(options.codexHome).isDirectory()) {
    fail(`codex home not found: ${options.codexHome}`);
  }

  fs.mkdirSync(options.outputDir, { recursive: true });
  const outputDir = fs.realpathSync(options.outputDir);
  const sessionId = options.sessionId || (await chooseSessionId(options.codexHome, options.listLimit));

  const resolved = runJsonScript("resolve-session.js", ["--session-id", sessionId, "--codex-home", options.codexHome]);
  if (!resolved.sessionFilePath) {
    fail(`session file not found for session: ${sessionId}`);
  }
  const sessionFilePath = resolved.sessionFilePath;

  const htmlPath = path.join(outputDir, `${sessionId}.html`);
  const pdfPath = path.join(outputDir, `${sessionId}.pdf`);
  const pngPath = path.join(outputDir, `${sessionId}.png`);
  const templateJsonPath = path.join(outputDir, `${sessionId}.report-template.json`);

  if (!options.reportJson) {
    runNodeScript("create-report-template.js", [
      "--session-file",
      sessionFilePath,
      "--output-json",
      templateJsonPath,
      "--session-id",
      sessionId,
    ]);
    process.stderr.write("Error: --report-json is required\n");
    process.stderr.write(`template=${templateJsonPath}\n`);
    process.stderr.write("hint=Codexで対象セッションを読み、テンプレートJSONを埋めて再実行してください\n");
    process.exit(1);
  }

  const reportJson = path.resolve(options.reportJson);
  if (!fs.existsSync(reportJson) || !fs.statSync(reportJson).isFile()) {
    fail(`report json not found: ${reportJson}`);
  }

  runNodeScript("build-report-html.js", [
    "--session-file",
    sessionFilePath,
    "--report-json",
    reportJson,
    "--output-html",
    htmlPath,
    "--report-title",
    options.reportTitle,
  ]);

  const renderArgs = ["--html", htmlPath, "--pdf", pdfPath, "--png", pngPath];
  if (options.chromePath) {
    renderArgs.push("--chrome-path", options.chromePath);
  }
  runNodeScript("html-to-pdf.js", renderArgs);

  process.stdout.write(`session_id=${sessionId}\n`);
  process.stdout.write(`session_file=${sessionFilePath}\n`);
  process.stdout.write(`report_json=${reportJson}\n`);
  process.stdout.write(`html=${htmlPath}\n`);
  process.stdout.write(`pdf=${pdfPath}\n`);
  process.stdout.write(`png_1=${pngPath}\n`);
  process.stdout.write(`png_markdown_1=![retrospective p1](${pngPath})\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
});
