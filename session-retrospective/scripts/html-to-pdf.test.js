const assert = require("node:assert/strict");
const { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } = require("node:fs");
const { execFile } = require("node:child_process");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");
const { setTimeout: delay } = require("node:timers/promises");

const scriptPath = join(__dirname, "html-to-pdf.js");

function runHtmlToPdf(args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [scriptPath, ...args],
      {
        encoding: "utf8",
        timeout: 8000,
        ...options,
      },
      (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ESRCH") {
      return false;
    }
    throw error;
  }
}

test("html-to-pdf stops a browser that keeps running after writing output", async () => {
  if (process.platform === "win32") {
    return;
  }

  const tempDir = mkdtempSync(join(tmpdir(), "session-retro-html-to-pdf-test-"));
  const htmlPath = join(tempDir, "report.html");
  const pdfPath = join(tempDir, "report.pdf");
  const pngPath = join(tempDir, "report.png");
  const browserPath = join(tempDir, "fake-browser.js");
  const pidLogPath = join(tempDir, "browser-pids.txt");

  writeFileSync(htmlPath, "<!doctype html><title>report</title><body>ok</body>\n", "utf8");
  writeFileSync(
    browserPath,
    `#!/usr/bin/env node
const { appendFileSync, writeFileSync } = require("node:fs");

const outputArg = process.argv.find((arg) => arg.startsWith("--print-to-pdf=") || arg.startsWith("--screenshot="));
if (!outputArg) {
  process.stderr.write("missing output argument\\n");
  process.exit(2);
}

const outputPath = outputArg.split("=").slice(1).join("=");
writeFileSync(outputPath, "rendered\\n", "utf8");
if (process.env.FAKE_BROWSER_PID_LOG) {
  appendFileSync(process.env.FAKE_BROWSER_PID_LOG, process.pid + "\\n", "utf8");
}

const shutdown = () => process.exit(0);
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
setInterval(() => {}, 1000);
`,
    "utf8"
  );
  chmodSync(browserPath, 0o755);

  const startedAt = Date.now();
  const result = await runHtmlToPdf(["--html", htmlPath, "--pdf", pdfPath, "--png", pngPath, "--chrome-path", browserPath], {
    env: {
      ...process.env,
      FAKE_BROWSER_PID_LOG: pidLogPath,
    },
  });

  assert.equal(existsSync(pdfPath), true);
  assert.equal(existsSync(pngPath), true);
  assert.match(result.stdout, new RegExp(`${pdfPath.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`));
  assert.ok(Date.now() - startedAt < 7000);

  await delay(300);
  const pids = readFileSync(pidLogPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((value) => Number.parseInt(value, 10));
  assert.equal(pids.length, 2);
  for (const pid of pids) {
    assert.equal(processExists(pid), false, `browser pid ${pid} should have been cleaned up`);
  }
});

test("html-to-pdf passes SESSION_RETROSPECTIVE_BROWSER_HOME to the browser process", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "session-retro-html-to-pdf-home-test-"));
  const htmlPath = join(tempDir, "report.html");
  const pdfPath = join(tempDir, "report.pdf");
  const pngPath = join(tempDir, "report.png");
  const browserPath = join(tempDir, "fake-browser.js");
  const runtimeHome = join(tempDir, "runtime-home");
  const browserHome = join(tempDir, "browser-home");
  const homeLogPath = join(tempDir, "browser-home-log.txt");

  writeFileSync(htmlPath, "<!doctype html><title>report</title><body>ok</body>\n", "utf8");
  writeFileSync(
    browserPath,
    `#!/usr/bin/env node
const { appendFileSync, writeFileSync } = require("node:fs");

const outputArg = process.argv.find((arg) => arg.startsWith("--print-to-pdf=") || arg.startsWith("--screenshot="));
if (!outputArg) {
  process.stderr.write("missing output argument\\n");
  process.exit(2);
}

const outputPath = outputArg.split("=").slice(1).join("=");
writeFileSync(outputPath, "rendered\\n", "utf8");
appendFileSync(process.env.FAKE_BROWSER_HOME_LOG, String(process.env.HOME) + "\\n", "utf8");
process.exit(0);
`,
    "utf8"
  );
  chmodSync(browserPath, 0o755);

  await runHtmlToPdf(["--html", htmlPath, "--pdf", pdfPath, "--png", pngPath, "--chrome-path", browserPath], {
    env: {
      ...process.env,
      HOME: runtimeHome,
      SESSION_RETROSPECTIVE_BROWSER_HOME: browserHome,
      FAKE_BROWSER_HOME_LOG: homeLogPath,
    },
  });

  const homes = readFileSync(homeLogPath, "utf8").trim().split("\n");
  assert.deepEqual(homes, [browserHome, browserHome]);
});
