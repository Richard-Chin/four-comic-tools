# claude-statusline — Claude Code 自訂狀態列

把 Claude Code 終端機最底部那條狀態列，換成類似參考圖的樣式：

```
🧋 Opus 4.8 ｜ ████████░░░░░░ 64% ｜ ⏱ 8m12s $1.20 ｜ four-comic-tools · main* ｜ +132/-439 ｜ 邦拓通訊處
```

**由左到右顯示：**
| 區塊 | 內容 | 來源 |
|---|---|---|
| 🧋 模型 | 目前用的模型（Opus / Sonnet…） | Claude Code 提供 |
| 進度條 + % | 內容視窗（context）用了多少，綠→黃→橘→紅漸層 | 解析對話紀錄估算 |
| ⏱ 耗時 + 金額 | 本次工作累積時間與花費 | Claude Code 提供 |
| 專案 · 分支 | 資料夾名 + git 分支（有未提交改動打 `*`） | git |
| +/- 行數 | 本次新增／刪除的程式行數 | Claude Code 提供 |
| 招牌名 | 預設「邦拓通訊處」，可自訂 | 你自己設 |

> 參考圖右邊的 `1H8m 43%`、`19H8m 22%` 是**用量額度倒數視窗**，那份資料 Claude Code
> 沒有開放給自訂狀態列讀取，需要另外的專門工具才拿得到，所以這裡沒放。其餘欄位都是真實資料。

---

## 先預覽（不用安裝）
用瀏覽器打開同資料夾的 **`preview.html`**，就能看到不同百分比下的長相與配色。

---

## 安裝（3 步驟）

### 1. 把 `statusline.js` 放到固定位置
建議放在你家目錄的 `.claude` 資料夾裡。開 **Git Bash**（Windows）或**終端機**（Mac）貼上：

```bash
mkdir -p ~/.claude
cp statusline.js ~/.claude/statusline.js
```

> 你也可以直接指向雲端硬碟裡這個檔，但雲端同步偶爾會鎖檔，放本機 `~/.claude/` 最穩。

### 2. 告訴 Claude Code 要用它
編輯 `~/.claude/settings.json`（沒有就新建），加入 `statusLine` 這段：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/statusline.js",
    "padding": 0
  }
}
```

> 如果檔案裡已經有別的設定，只要**把 `statusLine` 這個鍵加進去**，別整個蓋掉。

### 3. 重開 Claude Code
重新啟動後，最底部就會變成新的狀態列。

---

## 改招牌名稱
預設是「邦拓通訊處」。想換字，兩種方式：

- **臨時**：啟動前設環境變數
  ```bash
  export CC_STATUS_LABEL="邦拓 AI 助理"
  ```
- **永久**：直接改 `statusline.js` 最後面那行的預設值
  ```js
  const label = process.env.CC_STATUS_LABEL || '邦拓通訊處';
  ```

---

## 沒有依賴、跨電腦通用
- 只用 **Node.js**（裝了 Claude Code 就一定有），不需要 `jq`、`python`。
- Windows（Git Bash）、Mac 都能跑。
- 讀不到某欄位時會自動略過，不會讓狀態列消失。

## 顏色沒出現？
極少數舊終端機不支援 24-bit 真彩色。改用 **Windows Terminal**（Win）或內建終端機（Mac）即可正常顯示漸層。
