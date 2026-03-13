#!/usr/bin/env node

const { existsSync, mkdirSync, mkdtempSync, rmSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { delimiter, dirname, join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const { pathToFileURL } = require("node:url");

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

function runBrowser(browserPath, args, outputPath, purpose) {
  const userDataDir = mkdtempSync(join(tmpdir(), "session-retro-chrome-"));
  const fullArgs = [`--user-data-dir=${userDataDir}`, ...args];

  try {
    execFileSync(browserPath, fullArgs, {
      stdio: "pipe",
      timeout: 30000,
    });
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error && error.stderr
        ? String(error.stderr)
        : "";
    const stdout =
      error && typeof error === "object" && "stdout" in error && error.stdout
        ? String(error.stdout)
        : "";
    const detail = stderr.trim() || stdout.trim() || (error instanceof Error ? error.message : String(error));
    if (existsSync(outputPath)) {
      return;
    }
    throw new Error(`failed to render ${purpose} with ${browserPath}: ${detail}`);
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }

  if (!existsSync(outputPath)) {
    throw new Error(`${purpose} was not created: ${outputPath}`);
  }
}

function renderPdfWithBrowser(browserPath, htmlPath, pdfPath) {
  runBrowser(
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

function renderPngWithBrowser(browserPath, htmlPath, pngPath) {
  runBrowser(
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
  renderPdfWithBrowser(browserPath, htmlPath, pdfPath);
  if (pngPath) {
    mkdirSync(dirname(pngPath), { recursive: true });
    renderPngWithBrowser(browserPath, htmlPath, pngPath);
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
