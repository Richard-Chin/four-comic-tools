#!/usr/bin/env node
/**
 * four-comic-tools — Claude Code 自訂狀態列
 * ------------------------------------------------------------------
 * 顯示（由左到右）：
 *   🧋 模型名稱  ｜ 綠→黃→橘漸層進度條 + 內容視窗使用百分比
 *   ｜ ⏱ 本次耗時 + 花費金額  ｜ 專案資料夾 · git 分支(有改動打 *)
 *   ｜ +新增行 / -刪除行  ｜ 自訂招牌名稱
 *
 * Claude Code 會把一包 JSON 從 stdin 丟進來，本檔解析後輸出一行文字，
 * 該行就會顯示在終端機最底部。整段以 try/catch 包住，任何欄位讀不到
 * 也不會讓狀態列消失（頂多少顯示一段）。
 *
 * 招牌名稱可用環境變數覆寫：  CC_STATUS_LABEL="邦拓通訊處"
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');

// ---- 讀 stdin 的 JSON ----------------------------------------------------
function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8'); // fd 0 = stdin
  } catch {
    return '';
  }
}

// ---- ANSI 真彩色（24-bit）小工具 -----------------------------------------
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const fg = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;

// 顏色盤
const C = {
  boba: fg(210, 150, 90),      // 珍奶棕
  model: fg(120, 200, 255),    // 亮藍
  time: fg(150, 160, 175),     // 灰
  cost: fg(200, 190, 120),     // 淡金
  project: fg(160, 200, 160),  // 淡綠
  branch: fg(230, 200, 100),   // 黃（分支）
  dirty: fg(240, 100, 100),    // 紅（未提交）
  added: fg(90, 210, 120),     // 綠（+）
  removed: fg(235, 110, 110),  // 紅（-）
  label: fg(190, 160, 230),    // 淡紫（招牌名）
  track: fg(70, 75, 85),       // 進度條底色（暗灰）
  sep: fg(80, 85, 95),         // 分隔線
};

// 進度條漸層：綠 → 黃 → 橘 → 紅
function gradient(t) {
  // t: 0..1，回傳 [r,g,b]
  const stops = [
    [0.0, [70, 200, 90]],
    [0.4, [225, 200, 40]],
    [0.7, [240, 150, 40]],
    [1.0, [230, 70, 70]],
  ];
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const k = (t - t0) / (t1 - t0 || 1);
      return c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
    }
  }
  return stops[stops.length - 1][1];
}

// 畫一條漸層進度條
function progressBar(pct, width = 14) {
  const ratio = Math.max(0, Math.min(1, pct / 100));
  const filled = Math.round(ratio * width);
  let out = '';
  for (let i = 0; i < width; i++) {
    if (i < filled) {
      const [r, g, b] = gradient(width > 1 ? i / (width - 1) : 0);
      out += fg(r, g, b) + '█';
    } else {
      out += C.track + '░';
    }
  }
  return out + RESET;
}

// ---- git 資訊 -------------------------------------------------------------
function git(cmd, cwd) {
  try {
    return execSync(`git ${cmd}`, {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

function gitInfo(cwd) {
  const branch = git('rev-parse --abbrev-ref HEAD', cwd);
  if (!branch) return null;
  const dirty = git('status --porcelain', cwd).length > 0;
  return { branch, dirty };
}

// ---- 從 transcript 估算內容視窗（context）使用量 --------------------------
// Claude Code 會把整段對話寫成 JSONL，最後一筆 assistant 訊息的 usage
// 就是目前塞進模型的 token 量。加總 input + 兩種 cache 得到「已用內容」。
function contextPercent(transcriptPath, exceeds200k) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
    let usage = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }
      const u = obj?.message?.usage || obj?.usage;
      if (u && (u.input_tokens != null || u.cache_read_input_tokens != null)) {
        usage = u;
        break;
      }
    }
    if (!usage) return null;
    const used =
      (usage.input_tokens || 0) +
      (usage.cache_read_input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0);
    const limit = exceeds200k ? 1000000 : 200000;
    return Math.min(100, Math.round((used / limit) * 100));
  } catch {
    return null;
  }
}

// ---- 時間 / 金額格式 ------------------------------------------------------
function fmtDuration(ms) {
  if (!ms || ms < 0) return '';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h${m % 60}m`;
}

function fmtCost(usd) {
  if (usd == null) return '';
  return '$' + usd.toFixed(2);
}

// ---- 組裝 -----------------------------------------------------------------
function main() {
  const raw = readStdin();
  let data = {};
  try { data = JSON.parse(raw); } catch { /* 沒資料就用空物件 */ }

  const cwd =
    data?.workspace?.current_dir || data?.cwd || process.cwd();
  const projectDir = data?.workspace?.project_dir || cwd;

  const parts = [];
  const sep = ` ${C.sep}｜${RESET} `;

  // 1) 模型
  const model = data?.model?.display_name || data?.model?.id || 'Claude';
  parts.push(`${C.boba}🧋${RESET} ${C.model}${BOLD}${model}${RESET}`);

  // 2) 進度條 + 內容使用百分比
  const pct = contextPercent(data?.transcript_path, data?.exceeds_200k_tokens);
  if (pct != null) {
    const [r, g, b] = gradient(pct / 100);
    parts.push(`${progressBar(pct)} ${fg(r, g, b)}${pct}%${RESET}`);
  }

  // 3) 耗時 + 花費
  const dur = fmtDuration(data?.cost?.total_duration_ms);
  const cost = fmtCost(data?.cost?.total_cost_usd);
  const tc = [];
  if (dur) tc.push(`${C.time}⏱ ${dur}${RESET}`);
  if (cost) tc.push(`${C.cost}${cost}${RESET}`);
  if (tc.length) parts.push(tc.join(' '));

  // 4) 專案資料夾 · git 分支
  const folder = projectDir.split(/[\\/]/).filter(Boolean).pop() || '';
  const g = gitInfo(cwd);
  let repo = folder ? `${C.project}${folder}${RESET}` : '';
  if (g) {
    const star = g.dirty ? `${C.dirty}*${RESET}` : '';
    repo += ` ${C.sep}·${RESET} ${C.branch}${g.branch}${RESET}${star}`;
  }
  if (repo) parts.push(repo.trim());

  // 5) 新增 / 刪除行數
  const add = data?.cost?.total_lines_added;
  const del = data?.cost?.total_lines_removed;
  if (add != null || del != null) {
    parts.push(
      `${C.added}+${add || 0}${RESET}${C.sep}/${RESET}${C.removed}-${del || 0}${RESET}`
    );
  }

  // 6) 招牌名稱
  const label = process.env.CC_STATUS_LABEL || '邦拓通訊處';
  if (label) parts.push(`${C.label}${label}${RESET}`);

  process.stdout.write(parts.join(sep));
}

main();
