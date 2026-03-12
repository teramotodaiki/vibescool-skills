#!/usr/bin/env node

const { readdirSync, existsSync, openSync, readSync, closeSync } = require("node:fs");
const { homedir } = require("node:os");
const { join } = require("node:path");

const READ_CHUNK_SIZE = 64 * 1024;
const MAX_LINE_LENGTH = 5 * 1024 * 1024;

function parseArgs(argv) {
  const options = {
    sessionId: "",
    codexHome: process.env.CODEX_HOME || join(homedir(), ".codex"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--session-id") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("missing value for --session-id");
      }
      options.sessionId = value;
      index += 1;
      continue;
    }
    if (arg === "--codex-home") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("missing value for --codex-home");
      }
      options.codexHome = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${arg}`);
  }

  if (!options.sessionId) {
    throw new Error("--session-id is required");
  }
  return options;
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
        throw new Error(`first line is too long: ${filePath}`);
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

function* walkRolloutFiles(rootDir) {
  const entries = readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      yield* walkRolloutFiles(fullPath);
      continue;
    }
    if (entry.name.startsWith("rollout-") && entry.name.endsWith(".jsonl")) {
      yield fullPath;
    }
  }
}

function parseSessionMeta(firstLine, sessionFilePath) {
  let parsed;
  try {
    parsed = JSON.parse(firstLine);
  } catch {
    return null;
  }

  if (parsed.type !== "session_meta") {
    return null;
  }

  const payload = parsed.payload ?? {};
  if (typeof payload.id !== "string" || payload.id.length === 0) {
    return null;
  }

  return {
    sessionId: payload.id,
    sessionFilePath,
    cwd: typeof payload.cwd === "string" ? payload.cwd : null,
    gitBranch:
      payload.git && typeof payload.git.branch === "string"
        ? payload.git.branch
        : null,
    startedAt:
      typeof payload.timestamp === "string"
        ? payload.timestamp
        : typeof parsed.timestamp === "string"
          ? parsed.timestamp
          : null,
  };
}

function resolveSession(sessionId, codexHome) {
  const roots = [join(codexHome, "sessions"), join(codexHome, "archived_sessions")];
  const existingRoots = roots.filter((root) => existsSync(root));

  if (existingRoots.length === 0) {
    throw new Error(`session roots not found: ${roots.join(", ")}`);
  }

  for (const root of existingRoots) {
    for (const rolloutPath of walkRolloutFiles(root)) {
      const firstLine = readFirstNonEmptyLine(rolloutPath);
      if (!firstLine) {
        continue;
      }

      const meta = parseSessionMeta(firstLine, rolloutPath);
      if (!meta) {
        continue;
      }
      if (meta.sessionId === sessionId) {
        return meta;
      }
    }
  }

  throw new Error(`session not found: ${sessionId}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const resolved = resolveSession(options.sessionId, options.codexHome);
  process.stdout.write(`${JSON.stringify(resolved, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}
