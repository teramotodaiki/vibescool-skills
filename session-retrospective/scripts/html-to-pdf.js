#!/usr/bin/env node

const { existsSync, mkdirSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { delimiter, dirname, join, resolve } = require("node:path");

function parseArgs(argv) {
  const options = {
    htmlPath: "",
    pdfPath: "",
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

function renderPdfWithBrowser(browserPath, htmlPath, pdfPath) {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--allow-file-access-from-files",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    `file://${htmlPath}`,
  ];

  try {
    execFileSync(browserPath, args, {
      stdio: "pipe",
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
    throw new Error(`failed to render PDF with ${browserPath}: ${detail}`);
  }

  if (!existsSync(pdfPath)) {
    throw new Error(`pdf was not created: ${pdfPath}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const htmlPath = resolve(options.htmlPath);
  const pdfPath = resolve(options.pdfPath);
  const browserPath = resolveBrowserPath(options.chromePath);

  if (!existsSync(htmlPath)) {
    throw new Error(`html file not found: ${htmlPath}`);
  }

  mkdirSync(dirname(pdfPath), { recursive: true });
  renderPdfWithBrowser(browserPath, htmlPath, pdfPath);

  process.stdout.write(`${pdfPath}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
