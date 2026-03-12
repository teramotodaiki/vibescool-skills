#!/usr/bin/env node

const { readFileSync, existsSync, statSync, openSync, readSync, closeSync } = require("node:fs");
const { homedir } = require("node:os");
const { join, basename } = require("node:path");

const READ_CHUNK_SIZE = 64 * 1024;
const MAX_LINE_LENGTH = 5 * 1024 * 1024;

function parseArgs(argv) {
  const options = {
    codexHome: process.env.CODEX_HOME || join(homedir(), ".codex"),
    limit: 12,
    currentThreadId: process.env.CODEX_THREAD_ID || "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--codex-home") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("missing value for --codex-home");
      }
      options.codexHome = value;
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("missing value for --limit");
      }
      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`invalid --limit: ${value}`);
      }
      options.limit = parsed;
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${arg}`);
  }

  return options;
}

function formatRelativeAge(timestampMs) {
  const now = Date.now();
  const diffMs = Math.max(0, now - timestampMs);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes}m`;
  }
  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `${hours}h`;
  }
  const days = Math.floor(diffMs / dayMs);
  return `${days}d`;
}

function readFirstNonEmptyLine(filePath) {
  const fd = openSync(filePath, "r");
  const buffer = Buffer.alloc(READ_CHUNK_SIZE);
  let carry = "";

  try {
    while (true) {
      const bytesRead = readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead <= 0) {
        break;
      }

      carry += buffer.toString("utf8", 0, bytesRead);
      if (carry.length > MAX_LINE_LENGTH) {
        return null;
      }

      let newlineIndex = carry.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = carry.slice(0, newlineIndex).trim();
        carry = carry.slice(newlineIndex + 1);
        if (line.length > 0) {
          return line;
        }
        newlineIndex = carry.indexOf("\n");
      }
    }
    const tail = carry.trim();
    return tail.length > 0 ? tail : null;
  } finally {
    closeSync(fd);
  }
}

function extractCwdName(rolloutPath) {
  const firstLine = readFirstNonEmptyLine(rolloutPath);
  if (!firstLine) {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(firstLine);
  } catch {
    return null;
  }
  if (parsed.type !== "session_meta" || !parsed.payload) {
    return null;
  }
  const cwd = parsed.payload.cwd;
  if (typeof cwd !== "string" || cwd.length === 0) {
    return null;
  }
  const leaf = basename(cwd);
  return leaf && leaf.length > 0 ? leaf : cwd;
}

function findRolloutPath(codexHome, sessionId) {
  const globPattern = join(codexHome, "sessions");
  if (!existsSync(globPattern)) {
    return null;
  }

  // Keep this deterministic and cheap: infer date shard from session ID is not possible,
  // so we scan `sessions` once via shell `find`.
  const { execFileSync } = require("node:child_process");
  let output = "";
  try {
    output = execFileSync(
      "find",
      [join(codexHome, "sessions"), "-type", "f", "-name", `rollout-*-${sessionId}.jsonl`],
      { encoding: "utf8" },
    );
  } catch {
    return null;
  }
  const matched = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return matched || null;
}

function loadThreadTitles(codexHome) {
  const statePath = join(codexHome, ".codex-global-state.json");
  if (!existsSync(statePath)) {
    throw new Error(`state file not found: ${statePath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(statePath, "utf8"));
  } catch (error) {
    throw new Error(`failed to parse ${statePath}: ${String(error)}`);
  }

  const threadTitles = parsed["thread-titles"];
  if (!threadTitles || typeof threadTitles !== "object") {
    throw new Error(`thread-titles not found in ${statePath}`);
  }
  if (!Array.isArray(threadTitles.order) || !threadTitles.titles) {
    throw new Error(`thread-titles.order or thread-titles.titles is missing in ${statePath}`);
  }

  return threadTitles;
}

function sanitizeTitle(rawTitle) {
  if (typeof rawTitle !== "string") {
    return "";
  }
  let title = rawTitle.replace(/\s+/g, " ").trim();
  // Remove accidental annotation tails introduced outside Codex UI.
  title = title.replace(/["']?\}\s+however.*$/i, "").trim();
  title = title.replace(/["']?\}\s+.*$/, "").trim();
  if (title.endsWith("」") && !title.includes("「")) {
    title = title.slice(0, -1).trim();
  }
  return title;
}

function buildChoices(codexHome, limit) {
  const currentThreadId = process.env.CODEX_THREAD_ID || "";
  const threadTitles = loadThreadTitles(codexHome);
  const choices = [];

  for (const sessionId of threadTitles.order) {
    if (choices.length >= limit) {
      break;
    }
    if (typeof sessionId !== "string" || sessionId.length === 0) {
      continue;
    }
    const title = sanitizeTitle(threadTitles.titles[sessionId]);
    if (!title) {
      continue;
    }
    const rolloutPath = findRolloutPath(codexHome, sessionId);
    if (!rolloutPath || !existsSync(rolloutPath)) {
      continue;
    }
    let age = "-";
    try {
      age = formatRelativeAge(statSync(rolloutPath).mtimeMs);
    } catch {
      age = "-";
    }
    choices.push({
      index: choices.length + 1,
      sessionId,
      title,
      age,
      cwdName: extractCwdName(rolloutPath),
      rolloutPath,
      isCurrent: currentThreadId.length > 0 && sessionId === currentThreadId,
    });
  }

  if (choices.length === 0) {
    throw new Error("no selectable sessions found from thread-titles");
  }

  return choices;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const choices = buildChoices(options.codexHome, options.limit);
  process.stdout.write(
    `${JSON.stringify({ choices, currentThreadId: options.currentThreadId || null }, null, 2)}\n`,
  );
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}
