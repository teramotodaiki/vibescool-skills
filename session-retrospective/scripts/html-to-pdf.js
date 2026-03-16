#!/usr/bin/env node

const { existsSync, mkdirSync, mkdtempSync, rmSync } = require("node:fs");
const { execFileSync, spawn } = require("node:child_process");
const { delimiter, dirname, join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const { setTimeout: delay } = require("node:timers/promises");
const { pathToFileURL } = require("node:url");

const RENDER_TIMEOUT_MS = 30000;
const EXIT_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 200;

function parseArgs(argv) {
  const options = {
    htmlPath: "",
    pdfPath: "",
    pngPath: "",
    chromePath: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--html") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("missing value for --html");
      }
      options.htmlPath = value;
      index += 1;
      continue;
    }
    if (arg === "--pdf") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("missing value for --pdf");
      }
      options.pdfPath = value;
      index += 1;
      continue;
    }
    if (arg === "--chrome-path") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("missing value for --chrome-path");
      }
      options.chromePath = value;
      index += 1;
      continue;
    }
    if (arg === "--png") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("missing value for --png");
      }
      options.pngPath = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${arg}`);
  }

  if (!options.htmlPath) {
    throw new Error("--html is required");
  }
  if (!options.pdfPath) {
    throw new Error("--pdf is required");
  }
  return options;
}

function fileExists(targetPath) {
  return typeof targetPath === "string" && targetPath.length > 0 && existsSync(targetPath);
}

function collectKnownBrowserPaths() {
  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
  }

  if (process.platform === "win32") {
    const roots = [
      process.env.PROGRAMFILES,
      process.env["PROGRAMFILES(X86)"],
      process.env.LOCALAPPDATA,
    ].filter(Boolean);
    return roots.flatMap((root) => [
      join(root, "Google", "Chrome", "Application", "chrome.exe"),
      join(root, "Chromium", "Application", "chrome.exe"),
      join(root, "Microsoft", "Edge", "Application", "msedge.exe"),
    ]);
  }

  return [];
}

function resolveCommandOnPath(commandName) {
  const pathEntries = (process.env.PATH || "").split(delimiter).filter(Boolean);
  const suffixes =
    process.platform === "win32"
      ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM")
          .split(";")
          .filter(Boolean)
      : [""];

  for (const entry of pathEntries) {
    for (const suffix of suffixes) {
      const candidatePath = join(entry, `${commandName}${suffix}`);
      if (existsSync(candidatePath)) {
        return candidatePath;
      }
    }
  }
  return "";
}

function resolveBrowserPath(explicitChromePath) {
  const candidates = [
    explicitChromePath,
    process.env.CHROME_PATH || "",
    ...collectKnownBrowserPaths(),
    resolveCommandOnPath("google-chrome-stable"),
    resolveCommandOnPath("google-chrome"),
    resolveCommandOnPath("chromium"),
    resolveCommandOnPath("chromium-browser"),
    resolveCommandOnPath("chrome"),
    resolveCommandOnPath("msedge"),
    resolveCommandOnPath("microsoft-edge"),
  ];

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return resolve(candidate);
    }
  }

  throw new Error(
    "Could not find a Chrome/Chromium/Edge executable. Install one or pass --chrome-path/CHROME_PATH."
  );
}

function formatChildDetail(stdout, stderr, fallback) {
  const detail = stderr.trim() || stdout.trim() || fallback;
  return detail || "unknown error";
}

function isProcessMissing(error) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ESRCH");
}

function terminateProcessTree(child, force) {
  if (!child || !child.pid || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  try {
    if (process.platform === "win32") {
      const args = ["/PID", String(child.pid), "/T"];
      if (force) {
        args.push("/F");
      }
      execFileSync("taskkill", args, { stdio: "ignore" });
      return;
    }

    process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
  } catch (error) {
    if (isProcessMissing(error)) {
      return;
    }
    throw error;
  }
}

function waitForChildExit(child, timeoutMs) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({
      code: child?.exitCode ?? null,
      signal: child?.signalCode ?? null,
    });
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`browser process did not exit within ${timeoutMs}ms`));
    }, timeoutMs);

    const onExit = (code, signal) => {
      cleanup();
      resolve({ code, signal });
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      child.off("exit", onExit);
      child.off("error", onError);
    };

    child.once("exit", onExit);
    child.once("error", onError);
  });
}

async function ensureBrowserStopped(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  try {
    terminateProcessTree(child, false);
    await waitForChildExit(child, EXIT_TIMEOUT_MS);
  } catch (error) {
    terminateProcessTree(child, true);
    await waitForChildExit(child, EXIT_TIMEOUT_MS);
  }
}

async function waitForOutputOrExit(child, outputPath, spawnErrorRef) {
  const deadline = Date.now() + RENDER_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (existsSync(outputPath)) {
      return "output";
    }
    if (spawnErrorRef.current) {
      throw spawnErrorRef.current;
    }
    if (child.exitCode !== null || child.signalCode !== null) {
      return "exit";
    }
    await delay(POLL_INTERVAL_MS);
  }

  if (existsSync(outputPath)) {
    return "output";
  }
  return "timeout";
}

async function runBrowser(browserPath, args, outputPath, purpose) {
  const userDataDir = mkdtempSync(join(tmpdir(), "session-retro-chrome-"));
  const fullArgs = [`--user-data-dir=${userDataDir}`, ...args];
  let child = null;
  let stdout = "";
  let stderr = "";
  let renderError = null;
  let cleanupError = null;

  try {
    const spawnErrorRef = { current: null };
    child = spawn(browserPath, fullArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      spawnErrorRef.current = error;
    });

    const outcome = await waitForOutputOrExit(child, outputPath, spawnErrorRef);
    if (outcome === "output") {
      return;
    }
    if (outcome === "timeout") {
      throw new Error(`timed out waiting for ${purpose} output from ${browserPath}`);
    }
    throw new Error(
      `failed to render ${purpose} with ${browserPath}: ${formatChildDetail(
        stdout,
        stderr,
        `browser exited before creating ${outputPath}`
      )}`
    );
  } catch (error) {
    renderError =
      error instanceof Error
        ? error
        : new Error(`failed to render ${purpose} with ${browserPath}: ${String(error)}`);
  } finally {
    try {
      await ensureBrowserStopped(child);
    } catch (error) {
      cleanupError = error instanceof Error ? error : new Error(String(error));
    }
    rmSync(userDataDir, { recursive: true, force: true });
  }

  if (renderError) {
    if (cleanupError) {
      throw new Error(`${renderError.message}; cleanup failed: ${cleanupError.message}`);
    }
    throw renderError;
  }
  if (cleanupError) {
    throw cleanupError;
  }
  if (!existsSync(outputPath)) {
    throw new Error(`${purpose} was not created: ${outputPath}`);
  }
}

async function renderPdfWithBrowser(browserPath, htmlPath, pdfPath) {
  await runBrowser(
    browserPath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--allow-file-access-from-files",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ],
    pdfPath,
    "PDF"
  );
}

async function renderPngWithBrowser(browserPath, htmlPath, pngPath) {
  await runBrowser(
    browserPath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--allow-file-access-from-files",
      "--hide-scrollbars",
      "--force-device-scale-factor=2",
      "--window-size=1240,1754",
      `--screenshot=${pngPath}`,
      pathToFileURL(htmlPath).href,
    ],
    pngPath,
    "PNG"
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const htmlPath = resolve(options.htmlPath);
  const pdfPath = resolve(options.pdfPath);
  const pngPath = options.pngPath ? resolve(options.pngPath) : "";
  const browserPath = resolveBrowserPath(options.chromePath);

  if (!existsSync(htmlPath)) {
    throw new Error(`html file not found: ${htmlPath}`);
  }

  mkdirSync(dirname(pdfPath), { recursive: true });
  await renderPdfWithBrowser(browserPath, htmlPath, pdfPath);
  if (pngPath) {
    mkdirSync(dirname(pngPath), { recursive: true });
    await renderPngWithBrowser(browserPath, htmlPath, pngPath);
  }

  process.stdout.write(`${pdfPath}\n`);
  if (pngPath) {
    process.stdout.write(`${pngPath}\n`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
