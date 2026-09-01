#!/usr/bin/env node
/**
 * proto-gen spec 注入脚本 —— 评审型原型的「需求真身」单源回填 + 双审计
 *
 * 用途：把 OpenSpec 变更包里 specs/<cap>/spec.md 的 Requirement + Scenario
 * 「逐字」注入到评审型原型的 prd-section 面板中，让「评审原型 = 评审 spec」。
 * spec 是唯一事实源，面板内容永远从 spec.md 现抽——结构上不可能走样。
 *
 * ── 原型侧约定 ─────────────────────────────────────────────
 *   每个评审型 prd-section 上打锚点 + 留一对注入标记：
 *
 *   <div class="prd-section" data-req="knowledge-tree#知识点 ID 由系统按规则生成、只读、永久稳定">
 *     <div class="prd-section__title">知识点 ID 规则</div>
 *     <!-- @proto-gen:spec:start -->
 *     <!-- 脚本按 data-req 注入 spec 真身，勿手改 -->
 *     <!-- @proto-gen:spec:end -->
 *   </div>
 *
 *   锚点格式：<cap>#<Requirement 标题>[§<切片>][@<组件key>]
 *     - cap        = specs/ 下的能力目录名（如 knowledge-tree）
 *     - Requirement 标题 = spec.md 里 `### Requirement:` 后的整句，逐字复制
 *     - 一个 section 挂多条：空格分隔
 *     - 可选 §<切片> 后缀：`cap#标题§判断题` → 只注入该 Requirement 正文里
 *       以 `**判断题**…` 领起的那一段（+ 总述 preamble + 全部 Scenario）。
 *       用于「一条需求罗列 N 种并列情形、每屏只对应一种」（如 7 个结构题型各一份
 *       JSON 示例）。标签前缀匹配；面板上会标出「切片 · X」以免误读为需求全文。
 *     - 可选 @<组件key> 后缀：`cap#标题@qtstruct` → 注入块带 data-target，
 *       hover 该需求块高亮对应原型组件（Requirement↔组件级联动）
 *       两者可叠加，顺序固定：`cap#标题§判断题@jopt`
 *
 * ── 用法 ───────────────────────────────────────────────────
 *   spec-inject.mjs <html文件或目录> --change <变更包目录> [--check]
 *
 *     --change   必填。指向含 specs/ 的变更包根目录（如 openspec/changes/02-content-taxonomy）
 *     --check    只校验不写：面板与 spec 不同步则 exit 1（供 CI / git hook）
 *
 * ── 四个审计（这才是「评审原型 = 评审 spec」的硬保证）────────
 *   1. 一致性：注入即从 spec.md 现抽，重跑即同步；--check 比对当前文件 vs 现抽，不一致报错
 *   2. 死锚点：data-req 指向 spec 中不存在的 Requirement → 报错；§ 指向不存在的切片同样报错
 *   3. 覆盖率：spec.md 里每条 Requirement 是否都被 ≥1 个 section 挂到；
 *              漏的报错。确属无 UI 的规则，写进 <变更包>/spec-coverage-ignore.txt 豁免
 *   4. 切片完整性：某条 Requirement 若只以切片形式出现（没有任何 section 整条挂它），
 *              则它的每个切片都必须被挂到——否则「走完所有 section = 看完这条需求」就破了
 *
 * 幂等：重复执行结果一致。
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

// ── 参数解析 ──────────────────────────────────────────────
const argv = process.argv.slice(2);
let changeDir = null;
let checkOnly = false;
const inputPaths = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--change') changeDir = argv[++i];
  else if (a === '--check') checkOnly = true;
  else inputPaths.push(a);
}
if (inputPaths.length === 0 || !changeDir) {
  console.error('用法: spec-inject.mjs <html文件或目录> --change <变更包目录> [--check]');
  process.exit(1);
}
if (!existsSync(join(changeDir, 'specs'))) {
  console.error(`✗ 变更包目录下没有 specs/：${changeDir}`);
  process.exit(1);
}

// ── 工具 ──────────────────────────────────────────────────
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const keyOf = (cap, title) => `${cap}#${norm(title)}`;

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// 极简 md 行内转换：先转义，再还原 **bold** / `code`
function mdInline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

// ── markdown 表格 ────────────────────────────────────────
// spec 里大量规则以表格承载（枚举值、字段矩阵、行为对照）。逐行当段落打出来
// 等于把表格打散成管道符噪音，故这里按块识别、还原成真表格。
const isTableRow = (t) => t.startsWith('|');
// 按未转义的 | 切列（cell 里 `\|` 是字面竖线，如 'exact'\|'normalized'）
function splitRow(t) {
  const cells = t.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim());
  if (cells.length && cells[0] === '') cells.shift();
  if (cells.length && cells[cells.length - 1] === '') cells.pop();
  return cells;
}
const isDivider = (cells) => cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
const alignOf = (c) =>
  c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : null;

// 连续表格行 → { type:'table', head, align, rows }；无分隔行则整块当数据行（无表头）
function makeTable(lines) {
  const grid = lines.map(splitRow);
  let head = null, align = [];
  if (grid.length >= 2 && isDivider(grid[1])) {
    head = grid[0];
    align = grid[1].map(alignOf);
    grid.splice(0, 2);
  }
  return { type: 'table', head, align, rows: grid.filter((r) => !isDivider(r)) };
}

// 把「行文本数组」按表格块切开：非表格行走 mk(text) 生成对应块
function foldTables(lines, mk) {
  const blocks = [];
  let buf = [];
  const flush = () => { if (buf.length) { blocks.push(makeTable(buf)); buf = []; } };
  for (const t of lines) {
    if (typeof t === 'string' && isTableRow(t)) buf.push(t);
    else { flush(); blocks.push(mk(t)); }
  }
  flush();
  return blocks;
}

function renderTable(tb) {
  const cell = (tag, c, i) => {
    const a = tb.align[i];
    return `<${tag}${a ? ` style="text-align:${a}"` : ''}>${mdInline(c)}</${tag}>`;
  };
  const parts = ['<div class="spec-table__wrap"><table class="spec-table">'];
  if (tb.head) parts.push('<thead><tr>' + tb.head.map((c, i) => cell('th', c, i)).join('') + '</tr></thead>');
  parts.push('<tbody>' + tb.rows.map((r) => '<tr>' + r.map((c, i) => cell('td', c, i)).join('') + '</tr>').join('') + '</tbody>');
  parts.push('</table></div>');
  return parts.join('');
}

// ── 切片：把 Requirement 正文按「**小标题** 领起的段」切开 ──
// 用途：一条 Requirement 罗列了 N 种并列情形（如 7 个结构题型各一份 JSON 示例），
// 而每屏原型只对应其中一种。锚点写 `cap#标题§单选题` 即只注入那一段。
// preamble（首个 **小标题** 之前的块）永远保留——它是这条需求的总述。
function sliceReq(req) {
  req.preamble = [];
  req.slices = [];
  let curSlice = null;
  for (const b of req.blocks) {
    const m = b.type === 'p' && b.text.match(/^\*\*(.+?)\*\*/);
    if (m) { curSlice = { label: m[1].trim(), blocks: [b] }; req.slices.push(curSlice); }
    else if (curSlice) curSlice.blocks.push(b);
    else req.preamble.push(b);
  }
}
// 切片标签匹配：前缀匹配（`§判断题` 命中 `**判断题**（看图判断 · HSK1 听力）`）
const matchSlices = (req, label) => req.slices.filter((s) => s.label.startsWith(label));

// ── 解析单个 spec.md → Requirement 列表 ───────────────────
function parseSpec(cap, text) {
  const reqs = [];
  let cur = null, sc = null, fence = null;
  for (const raw of text.split(/\r?\n/)) {
    let m;
    // 围栏代码块：整块原样留存（spec 里的 JSON 示例靠它，逐行当段落打出来会散架）
    if (fence) {
      if (/^\s*```/.test(raw)) { if (cur && !sc) cur.lines.push(fence); fence = null; }
      else fence.lines.push(raw);
      continue;
    }
    if (cur && !sc && /^\s*```/.test(raw)) {
      fence = { type: 'code', lang: raw.trim().slice(3).trim(), lines: [] };
      continue;
    }
    if ((m = raw.match(/^###\s+Requirement:\s*(.+?)\s*$/))) {
      cur = { cap, title: m[1].trim(), key: keyOf(cap, m[1]), lines: [], scenarios: [] };
      sc = null;
      reqs.push(cur);
    } else if (cur && (m = raw.match(/^####\s+Scenario:\s*(.+?)\s*$/))) {
      sc = { name: m[1].trim(), lines: [] };
      cur.scenarios.push(sc);
    } else if (/^#{1,3}\s/.test(raw)) {
      // 其他标题（## ADDED Requirements / ## MODIFIED 等）= 章节边界，退出当前需求
      cur = null; sc = null;
    } else if (cur) {
      const t = raw.trim();
      if (!t) continue;
      if (sc) { if (t.startsWith('- ') || isTableRow(t)) sc.lines.push(t); }
      else cur.lines.push(t.replace(/^>\s?/, '')); // 剥离 markdown 引用块标记
    }
  }
  // 行 → 块：语句块里连续的 | 行折成表格，Scenario 里连续的 - 行折成列表
  for (const req of reqs) {
    req.blocks = foldTables(req.lines, (t) => (typeof t === 'object' ? t : { type: 'p', text: t }));
    sliceReq(req);
    for (const s of req.scenarios) {
      s.blocks = [];
      for (const b of foldTables(s.lines, (t) => ({ type: 'li', text: t.slice(2).trim() }))) {
        const last = s.blocks[s.blocks.length - 1];
        if (b.type === 'li') {
          if (last && last.type === 'ul') last.items.push(b.text);
          else s.blocks.push({ type: 'ul', items: [b.text] });
        } else s.blocks.push(b);
      }
    }
  }
  return reqs;
}

// ── 建 spec 索引：遍历 specs/<cap>/spec.md ────────────────
function buildSpecIndex(dir) {
  const index = new Map(); // key -> req
  const specsRoot = join(dir, 'specs');
  for (const cap of readdirSync(specsRoot)) {
    const specFile = join(specsRoot, cap, 'spec.md');
    if (!existsSync(specFile)) continue;
    for (const req of parseSpec(cap, readFileSync(specFile, 'utf8'))) {
      if (index.has(req.key)) console.error(`⚠ 重复 Requirement 标题：${req.key}`);
      index.set(req.key, req);
    }
  }
  return index;
}

function renderBlock(b) {
  if (b.type === 'table') return renderTable(b);
  if (b.type === 'code') return `<pre class="spec-code"><code>${esc(b.lines.join('\n'))}</code></pre>`;
  return `<p class="spec-req__stmt">${mdInline(b.text)}</p>`;
}

// ── 渲染一条 Requirement → 面板 HTML ──────────────────────
// slice 非空时只渲染 preamble + 命中的切片，并在标题后标出「切片」以免误读为需求全文
function renderReq(req, compKey, slice) {
  const hit = slice ? matchSlices(req, slice) : null;
  const bodyBlocks = slice
    ? [...req.preamble, ...hit.flatMap((s) => s.blocks)]
    : req.blocks;
  const parts = [];
  parts.push(`<div class="spec-req"${compKey ? ` data-target="${esc(compKey)}"` : ''}>`);
  parts.push(`<div class="spec-req__title">${mdInline(req.title)}`
    + (slice ? `<span class="spec-req__slice">切片 · ${esc(slice)}</span>` : '')
    + `</div>`);
  for (const b of bodyBlocks) parts.push(renderBlock(b));
  for (const sc of req.scenarios) {
    parts.push(`<div class="spec-scenario"><div class="spec-scenario__name">${mdInline(sc.name)}</div>`);
    for (const b of sc.blocks) {
      parts.push(b.type === 'ul'
        ? '<ul>' + b.items.map((t) => `<li>${mdInline(t)}</li>`).join('') + '</ul>'
        : renderBlock(b));
    }
    parts.push('</div>');
  }
  parts.push('</div>');
  return parts.join('\n');
}

function renderMissing(key) {
  return `<div class="spec-req--missing">⚠ spec 中未找到需求：${esc(key)}</div>`;
}

// 解析单个锚点 token：`cap#标题§切片@compKey` → { key, slice, compKey }
function parseAnchor(token) {
  let compKey = null;
  const at = token.lastIndexOf('@');
  // @ 必须在 # 之后才算组件后缀（标题本身不含 @）
  const hash = token.indexOf('#');
  if (at > hash && hash !== -1) { compKey = token.slice(at + 1).trim(); token = token.slice(0, at); }
  let slice = null;
  const sec = token.indexOf('§');
  if (sec !== -1) { slice = norm(token.slice(sec + 1)); token = token.slice(0, sec); }
  return { key: normKey(token), slice, compKey };
}
function normKey(k) {
  const i = k.indexOf('#');
  return i === -1 ? norm(k) : `${k.slice(0, i)}#${norm(k.slice(i + 1))}`;
}

const SPEC_START = '<!-- @proto-gen:spec:start -->';
const SPEC_END = '<!-- @proto-gen:spec:end -->';

// ── 处理单个 html：返回 { html, anchors, errors } ─────────
function processHtml(html, specIndex, htmlPath) {
  const errors = [];
  const anchors = []; // 本文件用到的所有 key（覆盖率用）
  const sliceUse = []; // {key, slice}（切片完整性审计用）
  const fullUse = []; // 未切片引用的 key

  // 收集 data-req 位置 与 spec:start 位置，按序配对
  const reqRe = /data-req="([^"]*)"/g;
  const reqTokens = []; // {pos, value}
  let m;
  while ((m = reqRe.exec(html))) reqTokens.push({ pos: m.index, value: m[1] });

  // 逐个 data-req：其后、且在下一个 data-req 之前，必须有一对 spec 标记
  let out = '';
  let cursor = 0;
  for (let i = 0; i < reqTokens.length; i++) {
    const tk = reqTokens[i];
    const nextReqPos = i + 1 < reqTokens.length ? reqTokens[i + 1].pos : html.length;
    const startPos = html.indexOf(SPEC_START, tk.pos);
    if (startPos === -1 || startPos >= nextReqPos) {
      errors.push(`data-req="${tk.value}" 后缺少 ${SPEC_START} 注入槽`);
      continue;
    }
    const endPos = html.indexOf(SPEC_END, startPos + SPEC_START.length);
    if (endPos === -1) { errors.push(`${SPEC_START} 缺少配对的 ${SPEC_END}`); continue; }

    // 渲染该 section 的所有锚点
    // 分隔多个锚点：只在「空白且其后紧跟 cap#」处切分——因 Requirement 标题本身含空格
    // 但绝不含 `#`（`#` 是 cap 与标题的分隔符），故此切法不会误伤标题内空格
    const tokens = tk.value.trim().split(/\s+(?=[a-z0-9][a-z0-9-]*#)/).filter(Boolean);
    const blocks = [];
    for (const t of tokens) {
      const { key, slice, compKey } = parseAnchor(t);
      anchors.push(key);
      const req = specIndex.get(key);
      if (!req) { errors.push(`死锚点：${key}（spec 中不存在）`); blocks.push(renderMissing(key)); continue; }
      if (slice) {
        if (matchSlices(req, slice).length === 0) {
          errors.push(`死切片：${key}§${slice}（该 Requirement 下无此 **小标题**；可选：${req.slices.map((s) => s.label).join(' / ') || '无'}）`);
          blocks.push(renderMissing(`${key}§${slice}`));
          continue;
        }
        sliceUse.push({ key, slice });
      } else fullUse.push(key);
      blocks.push(renderReq(req, compKey, slice));
    }
    const injected = `\n${blocks.join('\n')}\n`;
    out += html.slice(cursor, startPos + SPEC_START.length) + injected;
    cursor = endPos;
  }
  out += html.slice(cursor);
  return { html: out, anchors, errors, sliceUse, fullUse };
}

// ── 收集 html 文件 ───────────────────────────────────────
function collectHtml(paths) {
  const files = [];
  const walk = (p) => {
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const e of readdirSync(p)) { if (!e.startsWith('.')) walk(join(p, e)); }
    } else if (extname(p).toLowerCase() === '.html') files.push(p);
  };
  for (const p of paths) walk(p);
  return files;
}

// ── 覆盖率豁免清单 ───────────────────────────────────────
function loadIgnore(dir) {
  const f = join(dir, 'spec-coverage-ignore.txt');
  const set = new Set();
  if (!existsSync(f)) return set;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    set.add(normKey(t));
  }
  return set;
}

// ── 主流程 ───────────────────────────────────────────────
const specIndex = buildSpecIndex(changeDir);
const ignore = loadIgnore(changeDir);
const htmlFiles = collectHtml(inputPaths);
if (htmlFiles.length === 0) { console.error('未找到任何 .html 文件'); process.exit(1); }

const coveredKeys = new Set();
const slicedKeys = new Map(); // key -> Set(切片标签)：被切片引用过的 Requirement
const fullKeys = new Set();   // 至少被一个 section 整条引用的 Requirement
let anyError = false;

for (const file of htmlFiles) {
  const src = readFileSync(file, 'utf8');
  const { html, anchors, errors, sliceUse, fullUse } = processHtml(src, specIndex, file);
  anchors.forEach((k) => coveredKeys.add(k));
  for (const { key, slice } of sliceUse) {
    if (!slicedKeys.has(key)) slicedKeys.set(key, new Set());
    for (const s of matchSlices(specIndex.get(key), slice)) slicedKeys.get(key).add(s.label);
  }
  fullUse.forEach((k) => fullKeys.add(k));

  for (const e of errors) { console.error(`✗ ${file}: ${e}`); anyError = true; }

  if (checkOnly) {
    if (html !== src) {
      console.error(`✗ ${file}: 面板与 spec 不同步，请重跑 spec-inject（不带 --check）`);
      anyError = true;
    } else if (errors.length === 0) {
      console.log(`✓ ${file} — 已同步`);
    }
  } else {
    if (html !== src) { writeFileSync(file, html); console.log(`✓ ${file} — 已注入 ${anchors.length} 条需求`); }
    else console.log(`- ${file} — 无变化（${anchors.length} 条需求）`);
  }
}

// ── 切片完整性审计 ───────────────────────────────────────
// 一条 Requirement 若只以切片形式出现，那么它的每个切片都必须在某处被挂到，
// 否则「走完所有 section = 逐字看完这条 Requirement」的承诺就破了。
for (const [key, used] of slicedKeys) {
  if (fullKeys.has(key)) continue; // 有整条引用，天然完整
  const missing = specIndex.get(key).slices.map((s) => s.label).filter((l) => !used.has(l));
  if (missing.length) {
    console.error(`\n✗ 切片缺口：${key} 有 ${missing.length} 个切片没被任何 section 挂到`);
    for (const l of missing) console.error(`    · §${l}`);
    anyError = true;
  }
}

// ── 覆盖率审计 ───────────────────────────────────────────
const uncovered = [];
for (const key of specIndex.keys()) {
  if (!coveredKeys.has(key) && !ignore.has(key)) uncovered.push(key);
}
if (uncovered.length) {
  console.error(`\n✗ 覆盖率缺口：${uncovered.length} 条 Requirement 未被任何 section 挂到`);
  for (const k of uncovered) console.error(`    · ${k}`);
  console.error(`  → 补原型 section 挂上，或写进 ${join(changeDir, 'spec-coverage-ignore.txt')} 豁免（确属无 UI 规则）`);
  anyError = true;
} else {
  console.log(`\n✓ 覆盖率：${specIndex.size} 条 Requirement 全部被覆盖${ignore.size ? `（${ignore.size} 条已豁免）` : ''}`);
}

process.exit(anyError ? 1 : 0);
