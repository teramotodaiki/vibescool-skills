#!/usr/bin/env node

const { mkdirSync, writeFileSync, readFileSync, existsSync, createReadStream } = require("node:fs");
const { dirname, resolve } = require("node:path");
const readline = require("node:readline");

const RUBRIC = [
  { key: "goal_planning", label: "課題理解と計画性" },
  { key: "execution", label: "実装の実行力" },
  { key: "debugging", label: "問題解決力" },
  { key: "communication", label: "対話と伝達力" },
  { key: "reflection", label: "振り返りと改善意識" },
];

function parseArgs(argv) {
  const options = {
    sessionFile: "",
    reportJson: "",
    outputHtml: "",
    reportTitle: "Codexセッション振り返りレポート",
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
    if (arg === "--report-json") {
      const value = argv[index + 1];
      if (!value) throw new Error("missing value for --report-json");
      options.reportJson = value;
      index += 1;
      continue;
    }
    if (arg === "--output-html") {
      const value = argv[index + 1];
      if (!value) throw new Error("missing value for --output-html");
      options.outputHtml = value;
      index += 1;
      continue;
    }
    if (arg === "--report-title") {
      const value = argv[index + 1];
      if (!value) throw new Error("missing value for --report-title");
      options.reportTitle = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${arg}`);
  }

  if (!options.sessionFile) throw new Error("--session-file is required");
  if (!options.reportJson) throw new Error("--report-json is required");
  if (!options.outputHtml) throw new Error("--output-html is required");
  return options;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function requireStringArray(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty array`);
  }
  value.forEach((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`${field}[${index}] must be a non-empty string`);
    }
  });
}

function validateUrl(url, field) {
  requireNonEmptyString(url, field);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${field} must be a valid URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${field} must start with http:// or https://`);
  }
}

function validateReportShape(report) {
  requireNonEmptyString(report.sessionTitle, "sessionTitle");
  if (report.locale !== undefined) {
    requireNonEmptyString(report.locale, "locale");
  }
  requireNonEmptyString(report.overview, "overview");
  requireStringArray(report.doneActions, "doneActions");
  requireStringArray(report.userDirectives, "userDirectives");
  requireStringArray(report.codexLearnings, "codexLearnings");
  requireStringArray(report.improvementPoints, "improvementPoints");

  if (!Array.isArray(report.keywords)) throw new Error("keywords must be an array");
  if (report.keywords.length < 2 || report.keywords.length > 3) {
    throw new Error("keywords must contain 2-3 items");
  }
  report.keywords.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`keywords[${index}] must be an object`);
    }
    requireNonEmptyString(item.term, `keywords[${index}].term`);
    requireNonEmptyString(item.description, `keywords[${index}].description`);
  });

  if (!Array.isArray(report.scores)) throw new Error("scores must be an array");
  const scoreMap = new Map();
  for (const row of report.scores) {
    if (!row || typeof row !== "object") throw new Error("scores item must be an object");
    requireNonEmptyString(row.key, "scores.key");
    if (!Number.isInteger(row.score) || row.score < 1 || row.score > 5) {
      throw new Error(`scores.${row.key}.score must be integer 1-5`);
    }
    requireNonEmptyString(row.comment, `scores.${row.key}.comment`);
    if (scoreMap.has(row.key)) throw new Error(`duplicate score key: ${row.key}`);
    scoreMap.set(row.key, row);
  }
  for (const criterion of RUBRIC) {
    if (!scoreMap.has(criterion.key)) {
      throw new Error(`missing rubric score: ${criterion.key}`);
    }
  }
  for (const key of scoreMap.keys()) {
    if (!RUBRIC.some((criterion) => criterion.key === key)) {
      throw new Error(`unknown rubric key: ${key}`);
    }
  }

  if (report.screenshots !== undefined) {
    if (!Array.isArray(report.screenshots)) throw new Error("screenshots must be an array");
    report.screenshots.forEach((row, index) => {
      if (!row || typeof row !== "object") throw new Error(`screenshots[${index}] must be an object`);
      requireNonEmptyString(row.path, `screenshots[${index}].path`);
      if (row.caption !== undefined) {
        requireNonEmptyString(row.caption, `screenshots[${index}].caption`);
      }
    });
  }

  if (report.publishedUrls !== undefined) {
    if (!Array.isArray(report.publishedUrls)) throw new Error("publishedUrls must be an array");
    report.publishedUrls.forEach((row, index) => {
      if (!row || typeof row !== "object") throw new Error(`publishedUrls[${index}] must be an object`);
      validateUrl(row.url, `publishedUrls[${index}].url`);
      if (row.label !== undefined) {
        requireNonEmptyString(row.label, `publishedUrls[${index}].label`);
      }
    });
  }
}

function readReportJson(reportJsonPath) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(reportJsonPath, "utf8"));
  } catch (error) {
    throw new Error(`failed to parse report json: ${String(error)}`);
  }
  validateReportShape(parsed);
  return parsed;
}

function formatTimestampLocalized(timestamp, locale) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function readSessionPeriod(sessionFilePath) {
  let start = "";
  let end = "";
  const stream = createReadStream(sessionFilePath, { encoding: "utf8" });
  const reader = readline.createInterface({
    input: stream,
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  for await (const rawLine of reader) {
    const line = rawLine.trim();
    if (!line) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    const timestamp = typeof parsed.timestamp === "string" ? parsed.timestamp : "";
    if (!timestamp) continue;
    if (!start) start = timestamp;
    end = timestamp;
  }
  return { start, end };
}

function computeScoreSummary(scoreRows) {
  const total = scoreRows.reduce((acc, row) => acc + row.score, 0);
  const max = scoreRows.length * 5;
  const average = total / scoreRows.length;
  return { total, max, average };
}

function clamp(items, limit) {
  return Array.isArray(items) ? items.slice(0, limit) : [];
}

function joinList(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
}

function shorten(text, max) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function renderRadarChart(scoreRows) {
  const cx = 110;
  const cy = 110;
  const radius = 68;
  const levels = 5;
  const count = scoreRows.length;

  const polygonPoints = scoreRows
    .map((row, index) => {
      const angle = (-Math.PI / 2) + (2 * Math.PI * index) / count;
      const ratio = row.score / 5;
      const x = cx + Math.cos(angle) * radius * ratio;
      const y = cy + Math.sin(angle) * radius * ratio;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const grid = [];
  for (let level = 1; level <= levels; level += 1) {
    const r = (radius * level) / levels;
    const points = scoreRows
      .map((_, index) => {
        const angle = (-Math.PI / 2) + (2 * Math.PI * index) / count;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    grid.push(`<polygon points="${points}" fill="none" stroke="#d4deea" stroke-width="1" />`);
  }

  const axes = scoreRows
    .map((_, index) => {
      const angle = (-Math.PI / 2) + (2 * Math.PI * index) / count;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#d4deea" stroke-width="1" />`;
    })
    .join("\n");

  return `<svg viewBox="0 0 220 220" role="img" aria-label="評価スコアのレーダーチャート">
  ${grid.join("\n")}
  ${axes}
  <polygon points="${polygonPoints}" fill="rgba(29, 119, 197, 0.28)" stroke="#1d77c5" stroke-width="2.2" />
  <circle cx="${cx}" cy="${cy}" r="2.5" fill="#1d77c5" />
</svg>`;
}

function renderKeywordCards(keywords) {
  return keywords
    .map(
      (item) => `<div class="kw-card">
  <div class="kw-term">${escapeHtml(item.term)}</div>
  <div class="kw-desc">${escapeHtml(item.description)}</div>
</div>`,
    )
    .join("\n");
}

function renderUrls(urls) {
  return urls
    .map((row) => {
      const label = row.label || row.url;
      return `<div class="url-row">
  <div class="url-label">${escapeHtml(label)}</div>
  <div><a href="${escapeHtml(row.url)}">${escapeHtml(row.url)}</a></div>
</div>`;
    })
    .join("\n");
}

function renderScreenshots(screenshots) {
  return screenshots
    .map((row) => {
      const caption = row.caption ? `<div class="shot-cap">${escapeHtml(row.caption)}</div>` : "";
      return `<div class="shot">
  <img src="${escapeHtml(row.path)}" alt="${escapeHtml(row.caption || "screenshot")}" />
  ${caption}
</div>`;
    })
    .join("\n");
}

function icon(name) {
  return `<svg class="ic" aria-hidden="true"><use href="#${name}" /></svg>`;
}

function renderHtml(params) {
  const {
    reportTitle,
    report,
    scoreRows,
    scoreSummary,
    periodStartText,
    periodEndText,
    screenshots,
    publishedUrls,
  } = params;

  const hasScreenshots = screenshots.length > 0;
  const hasUrls = publishedUrls.length > 0;
  const overviewText = shorten(report.overview, 138);
  const doneActions = clamp(report.doneActions, 2).map((item) => shorten(item, 56));
  const userDirectives = clamp(report.userDirectives, 2).map((item) => shorten(item, 60));
  const codexLearnings = clamp(report.codexLearnings, 2).map((item) => shorten(item, 60));
  const improvementPoints = clamp(report.improvementPoints, 2).map((item) => shorten(item, 60));
  const keywords = clamp(report.keywords, 2).map((item) => ({
    term: shorten(item.term, 24),
    description: shorten(item.description, 60),
  }));

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    :root {
      --line: #d8e1ec;
      --ink: #111827;
      --muted: #425466;
      --accent: #1d77c5;
      --soft: #f4f8ff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: linear-gradient(180deg, #f8fbff 0%, #edf4fb 100%);
      color: var(--ink);
      font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif;
      line-height: 1.48;
    }
    .sheet {
      width: 100%;
      height: 297mm;
      padding: 12.5mm 13mm;
      overflow: hidden;
    }
    h1 { margin: 0 0 8px 0; font-size: 20px; }
    h2 { margin: 12px 0 7px 0; font-size: 14px; }
    p, li { margin: 4px 0; font-size: 12px; }
    ul { margin: 0; padding-left: 18px; }
    a { color: #0f5ea8; text-decoration: none; word-break: break-all; }
    .meta, .card { padding: 0; }
    .meta {
      display: grid;
      grid-template-columns: 130px 1fr;
      gap: 8px 12px;
      font-size: 12.5px;
      margin-bottom: 10px;
    }
    .key { color: var(--muted); }
    .grid-main {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 12px;
    }
    .col { min-width: 0; }
    .card + .card { margin-top: 8px; }
    .sec-title {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ic {
      width: 16px;
      height: 16px;
      color: var(--accent);
      flex: 0 0 auto;
    }
    .score-top {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 8px;
    }
    .score-total { font-size: 19px; font-weight: 700; color: var(--accent); }
    .score-note { font-size: 12px; color: var(--muted); }
    .score-wrap {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      align-items: start;
    }
    .radar-wrap { width: 120px; height: 120px; margin: 0 auto; }
    .score-legend { font-size: 11.5px; }
    .score-legend li { margin: 4px 0; list-style: none; padding-left: 0; }
    .legend-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #1d77c5;
      margin-right: 6px;
      vertical-align: baseline;
    }
    .kw-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 9px;
    }
    .kw-card {
      border: 0;
      border-radius: 0;
      padding: 0;
      background: transparent;
    }
    .kw-term {
      font-size: 12px;
      font-weight: 700;
      color: #0f5ea8;
      margin-bottom: 3px;
    }
    .kw-desc {
      font-size: 12px;
      color: var(--ink);
      line-height: 1.48;
    }
    .url-row {
      display: block;
      gap: 4px;
      align-items: start;
      border: 0;
      border-radius: 0;
      padding: 0;
      margin-top: 8px;
      background: transparent;
    }
    .url-label {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 3px;
    }
    .shot {
      margin-top: 8px;
      border: 0;
      border-radius: 0;
      padding: 0;
      background: transparent;
    }
    .shot img {
      width: 100%;
      max-height: 56px;
      object-fit: contain;
      display: block;
      border-radius: 6px;
      background: #f7fbff;
    }
    .shot-cap { margin-top: 4px; font-size: 11px; color: var(--muted); }
    .footnote { margin-top: 12px; color: var(--muted); font-size: 10px; }
    @page { size: A4; margin: 0; }
  </style>
</head>
<body>
  <svg width="0" height="0" style="position:absolute">
    <defs>
      <symbol id="i-info" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20m0 6a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 8m1.25 8h-2.5v-5h2.5z"/></symbol>
      <symbol id="i-radar" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3l7 4v10l-7 4l-7-4V7zm0 2.3L7 8v8l5 2.7L17 16V8z"/><path fill="currentColor" d="M12 7l3 1.7v3.6L12 14l-3-1.7V8.7zm0 2.3l-1 .6v1.2l1 .6l1-.6V9.9z"/></symbol>
      <symbol id="i-task" viewBox="0 0 24 24"><path fill="currentColor" d="M4 5h16v2H4zm0 6h10v2H4zm0 6h16v2H4zm14-7l3 3l-1.4 1.4L18 12.8l-1.6 1.6L15 13z"/></symbol>
      <symbol id="i-user" viewBox="0 0 24 24"><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5"/></symbol>
      <symbol id="i-learn" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3L1 9l11 6l9-4.9V17h2V9zm-7 9.2V16l7 3.8l7-3.8v-3.8l-7 3.8z"/></symbol>
      <symbol id="i-keyword" viewBox="0 0 24 24"><path fill="currentColor" d="M7 14a5 5 0 1 1 4.9-6h7.6v3h-2v2h-2v2h-3.6A5 5 0 0 1 7 14m0-2a3 3 0 1 0 0-6a3 3 0 0 0 0 6"/></symbol>
      <symbol id="i-link" viewBox="0 0 24 24"><path fill="currentColor" d="M10.6 13.4a1 1 0 0 0 1.4 1.4l4.6-4.6a3 3 0 1 0-4.2-4.2L10.9 7.5a1 1 0 1 0 1.4 1.4l1.5-1.5a1 1 0 1 1 1.4 1.4zm2.8-2.8a1 1 0 0 0-1.4-1.4l-4.6 4.6a3 3 0 1 0 4.2 4.2l1.5-1.5a1 1 0 1 0-1.4-1.4l-1.5 1.5a1 1 0 1 1-1.4-1.4z"/></symbol>
      <symbol id="i-shot" viewBox="0 0 24 24"><path fill="currentColor" d="M4 5h16v14H4zm2 2v10h12V7zm2 8l2.5-3l2 2.5L15 11l3 4z"/></symbol>
      <symbol id="i-growth" viewBox="0 0 24 24"><path fill="currentColor" d="M3 19h18v2H3zm3-3l3.5-4l2.8 3l4.2-6L21 12v4h-2v-1.8l-2.2-1.6l-4.4 6.3l-2.9-3.1L7.8 18z"/></symbol>
    </defs>
  </svg>
  <section class="sheet">
    <h1>${escapeHtml(reportTitle)}</h1>
    <div class="meta">
      <div class="key">対象セッション</div><div>${escapeHtml(report.sessionTitle)}</div>
      <div class="key">対象セッション期間</div><div>${escapeHtml(periodStartText)} 〜 ${escapeHtml(periodEndText)}</div>
    </div>

    <div class="grid-main">
      <div class="col">
        <h2><span class="sec-title">${icon("i-info")}総評</span></h2>
        <div class="card">
          <p>${escapeHtml(overviewText)}</p>
        </div>
        ${
          hasScreenshots
            ? `<h2><span class="sec-title">${icon("i-shot")}スクリーンショット</span></h2>
        <div class="card">${renderScreenshots(screenshots)}</div>`
            : ""
        }

        <h2><span class="sec-title">${icon("i-task")}やったこと</span></h2>
        <div class="card"><ul>${joinList(doneActions)}</ul></div>
        <h2><span class="sec-title">${icon("i-user")}ユーザーが指示したこと</span></h2>
        <div class="card"><ul>${joinList(userDirectives)}</ul></div>
        <h2><span class="sec-title">${icon("i-learn")}Codexから学んだこと</span></h2>
        <div class="card"><ul>${joinList(codexLearnings)}</ul></div>

        <h2><span class="sec-title">${icon("i-growth")}改善できるポイント</span></h2>
        <div class="card"><ul>${joinList(improvementPoints)}</ul></div>
      </div>

      <div class="col">
        <h2><span class="sec-title">${icon("i-radar")}評価スコア</span></h2>
        <div class="card">
          <div class="score-top">
            <div class="score-total">${scoreSummary.total} / ${scoreSummary.max}</div>
            <div class="score-note">平均 ${scoreSummary.average.toFixed(2)} / 5.00</div>
          </div>
          <div class="score-wrap">
            <div class="radar-wrap">${renderRadarChart(scoreRows)}</div>
            <ul class="score-legend">
              ${scoreRows
                .map(
                  (row) =>
                    `<li><span class="legend-dot"></span>${escapeHtml(row.label)}: ${row.score}/5（${escapeHtml(shorten(row.comment, 16))}）</li>`,
                )
                .join("\n")}
            </ul>
          </div>
        </div>

        <h2><span class="sec-title">${icon("i-keyword")}新しいキーワード</span></h2>
        <div class="card">
          <div class="kw-grid">
            ${renderKeywordCards(keywords)}
          </div>
        </div>

        ${
          hasUrls
            ? `<h2><span class="sec-title">${icon("i-link")}公開URL</span></h2>
        <div class="card">${renderUrls(publishedUrls)}</div>`
            : ""
        }
      </div>
    </div>

    <p class="footnote">このレポート本文は Codex が対象セッション全文を読んで作成し、レイアウトとチャート描画のみをスクリプトで行った。</p>
  </section>
</body>
</html>`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sessionFilePath = resolve(options.sessionFile);
  const reportJsonPath = resolve(options.reportJson);
  const outputHtmlPath = resolve(options.outputHtml);
  const outputDir = dirname(outputHtmlPath);

  if (!existsSync(sessionFilePath)) {
    throw new Error(`session file not found: ${sessionFilePath}`);
  }
  const report = readReportJson(reportJsonPath);
  const locale = report.locale || "ja-JP";
  const scoreRows = RUBRIC.map((criterion) => {
    const row = report.scores.find((item) => item.key === criterion.key);
    return {
      key: criterion.key,
      label: criterion.label,
      score: row.score,
      comment: row.comment,
    };
  });
  const period = await readSessionPeriod(sessionFilePath);

  const screenshots = (report.screenshots || [])
    .filter((item) => existsSync(item.path))
    .slice(0, 1);
  const publishedUrls = (report.publishedUrls || []).slice(0, 1);

  const html = renderHtml({
    reportTitle: options.reportTitle,
    report,
    scoreRows,
    scoreSummary: computeScoreSummary(scoreRows),
    periodStartText: formatTimestampLocalized(period.start, locale),
    periodEndText: formatTimestampLocalized(period.end, locale),
    screenshots,
    publishedUrls,
  });

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputHtmlPath, html, "utf8");
  process.stdout.write(`${outputHtmlPath}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
