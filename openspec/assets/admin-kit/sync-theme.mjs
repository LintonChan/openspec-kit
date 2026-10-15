#!/usr/bin/env node
/*
 * admin-kit 主题同步器
 * ---------------------------------------------------------------------------
 * 把 admin-theme.css 的内容注入后台原型 HTML 的标记块之间：
 *
 *   <!-- @admin-theme:start -->
 *   <style> ...自动注入，勿手改... </style>
 *   <!-- @admin-theme:end -->
 *
 * 用法：
 *   ./sync-theme.mjs                 # 刷新本目录下全部 .html
 *   ./sync-theme.mjs a.html b.html   # 只刷新指定文件
 *
 * 为什么不用 proto-gen 的 inject-assets.mjs：
 *   那个脚本的资产路径硬编码为 skill 自身的 assets/，只能注入全局默认主题。
 *   本脚本只管 @admin-theme 这一个块，与 proto-gen 的三个块（theme/shared/
 *   highlight）互不干扰——两者可对同一文件先后运行，顺序无关。
 *
 * 注入顺序要求：@admin-theme 块必须排在 @proto-gen:theme 块【之后】，
 * 靠 CSS 后来者胜覆盖默认紫主题。脚本会校验，顺序不对会报错。
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname, basename, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// 注入块清单：块名 → 资产文件
const BLOCKS = [
  { name: 'admin-theme', file: 'admin-theme.css' },  // 主题 token（须在 @proto-gen:theme 之后）
  { name: 'admin-shell', file: 'admin-shell.css' },  // yudao 外壳组件（须在 admin-theme 之后）
];

function collect(paths) {
  const out = [];
  const walk = (p) => {
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const e of readdirSync(p)) { if (!e.startsWith('.')) walk(join(p, e)); }
    } else if (extname(p).toLowerCase() === '.html') out.push(p);
  };
  paths.forEach(walk);
  return out;
}

// 默认扫描范围：本目录（模板）+ openspec/prototypes/ 下全部原型，但跳过 archive/
// 原型按规范独立存放于 openspec/prototypes/<change-name>/，底座在 assets/admin-kit/
//
// 为什么默认跳过 archive/：已归档原型是签字时的冻结快照，底座却会持续演进——
// 新增的通用类可能与归档页面里的同名私有类撞车（如 06 的 .yd-drawer 被底座的
// min-width 撑宽），重刷等于回改已归档包。确需重刷就显式点名该文件。
const PROTO = join(here, '..', '..', 'prototypes');
const DEFAULTS = [here, PROTO];
const inputs = process.argv.slice(2);
const files = collect(inputs.length ? inputs : DEFAULTS.filter((d) => { try { statSync(d); return true; } catch { return false; } }))
  .filter((f) => inputs.length || !relative(PROTO, f).startsWith('archive' + sep));
if (!inputs.length) console.log('  （默认跳过 prototypes/archive/：已归档原型是冻结快照，要重刷请显式点名文件）');

let ok = 0, skipped = 0, failed = 0;

for (const f of files) {
  let html = readFileSync(f, 'utf8');
  let touched = false, broke = false;
  const refreshed = [];

  for (const blk of BLOCKS) {
    const START = `<!-- @${blk.name}:start -->`;
    const END = `<!-- @${blk.name}:end -->`;
    const s = html.indexOf(START), e = html.indexOf(END);
    if (s === -1 && e === -1) continue;                       // 该文件不用这个块
    if (s === -1 || e === -1 || e < s) {
      console.error(`  ✗ ${basename(f)}：${blk.name} 标记块残缺或顺序颠倒`); broke = true; continue;
    }
    // 顺序校验：admin-* 必须排在 proto-gen:theme 之后，否则覆盖不生效
    const pg = html.indexOf('<!-- @proto-gen:theme:start -->');
    if (pg !== -1 && pg > s) {
      console.error(`  ✗ ${basename(f)}：@${blk.name} 排在 @proto-gen:theme 之前，覆盖不会生效`); broke = true; continue;
    }
    const css = readFileSync(join(here, blk.file), 'utf8').trimEnd();
    const block = `${START}\n<style>\n/* 由 sync-theme.mjs 自动注入自 ${blk.file} —— 勿手改，改源文件后重跑脚本 */\n${css}\n</style>\n${END}`;
    html = html.slice(0, s) + block + html.slice(e + END.length);
    refreshed.push(blk.name); touched = true;
  }

  if (broke) { failed++; continue; }
  if (!touched) { console.log(`  跳过  ${basename(f)}（无 admin-kit 标记）`); skipped++; continue; }

  // 中和 proto-gen 默认主题带来的 Google Fonts @import：
  // 后台主题已把字体覆盖为 EP 系统字体栈，该 @import 永远用不上，
  // 留着只会在离线打开时发起一次失败的网络请求。注释掉即可（幂等）。
  html = html.replace(
    /@import url\((['"])https:\/\/fonts\.googleapis\.com[^)]*\1\);/g,
    '/* [admin-kit] 已停用 proto-gen 默认字体 import：后台用 EP 系统字体栈，保证离线可开 */'
  );

  const prev = readFileSync(f, 'utf8');
  if (html !== prev) { writeFileSync(f, html, 'utf8'); console.log(`  ✓ 刷新 ${basename(f)} [${refreshed.join(', ')}]`); }
  else console.log(`  · 无变化 ${basename(f)}`);
  ok++;
}

console.log(`\n完成：${ok} 个已处理，${skipped} 个跳过，${failed} 个失败`);
process.exit(failed ? 1 : 0);
