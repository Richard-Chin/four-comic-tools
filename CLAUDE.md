# four-comic-tools — 四格漫畫製作專案

## 對話開始時請先讀
進度與最近更動都在 Obsidian：`secondbrain/four-comic-tools/工作筆記.md`

## 這個專案在做什麼
製作四格漫畫。

## 工作模式
- **加新作品／工具**：對 Claude 說「我想做一個 XXX」→ Claude 會建 `tools/<名稱>/` 子資料夾，一步步帶著做
- **結束工作**：對 Claude 說「**收工**」→ 自動 commit + push + 更新 Obsidian 工作筆記
- **接續工作**：對 Claude 說「**開工**」→ 讀工作筆記、報告 git 狀態、建議下一步

## 工作桌 + 三個家
- 📋 雲端硬碟工作桌：`G:\我的雲端硬碟\four-comic-tools\`（自動跨電腦同步）
- 🐙 GitHub repo：`Richard-Chin/four-comic-tools`（公開，網頁的家）
- 📘 Obsidian 駕駛艙：`secondbrain/four-comic-tools/工作筆記.md`（想法的家）

## 作品清單
（之後加新作品時會自動更新）網址格式：`https://richard-chin.github.io/four-comic-tools/tools/<名稱>/`

## 工作注意事項
- 這是公開 repo：客戶／員工個資、佣金、薪資、健康、財務資料一律不可放進來，需要用到就另開私人 repo
- 客戶資料一律去識別化：不放真實姓名、身分證字號、電話、地址
- 行銷／話術內容遵守倫理鐵律：不用悲情、恐嚇、貶低式用語
- 素材要注意授權：字型、圖片、音樂確認可商用或自製，來源記在作品資料夾裡
- commit 訊息要寫清楚做了什麼 + 為什麼
- 收工前說「收工」讓 Claude 同步三方
