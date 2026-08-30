# 邦拓 AI Sales Coach V8 — 多輪客戶模擬器

富邦人壽邦拓通訊處內部業務陪練工具的 **n8n 工作流程**。業務員透過 Webhook 與一個規則式的「虛擬客戶」多輪對話，結束後自動評分並（選用）寫入 Google Sheet，供業輔訓練使用。

- 檔案：[`banto-sales-coach-v8.json`](./banto-sales-coach-v8.json)（可直接匯入 n8n）
- 屬性：內部訓練工具，非對外行銷素材

## 流程一覽

```
Webhook（陪練訊息）
  → 整理陪練輸入（Set：帶預設值）
  → 客戶模擬器（規則式 Code）
  → 更新對話歷史（Code）
  → 是否結束本局（If）
       ├─ 未結束 → 回傳下一輪客戶回應
       └─ 已結束 → 結束後自動評分（Code）
                     ├─ Google Sheets：寫入陪練紀錄
                     └─ 回傳本局評分
```

## 匯入與設定

1. n8n → **Import from File**，選 `banto-sales-coach-v8.json`。
2. **Webhook 節點**：路徑為 `banto-roleplay-chat`，方法 `POST`。
3. **Google Sheets 節點**（選用，只在本局結束時寫入）：
   - `documentId` 目前是佔位字串「請替換為你的 Google Sheet ID」，請改成自己的試算表 ID。
   - 分頁名稱：`RolePlay紀錄`。
   - 重新綁定自己的 Google Sheets 憑證（工作流程內的憑證 id 只是佔位）。
   - 若暫時不需要紀錄，可停用此節點，其餘流程照常運作。
4. 工作流程預設 `active: false`，測試無誤後再啟用。

## API 介面

**Request（POST 到 webhook）**

| 欄位 | 說明 | 預設 |
|---|---|---|
| `session_id` | 對話識別碼 | 執行 id |
| `rep_name` | 業務員名稱 | `未命名業務` |
| `scenario` | 情境 | `家庭保障健檢` |
| `customer_type` | 客戶類型：`理性精算型` / `防備冷淡型` / `感性家庭型` / 其他 | `理性精算型` |
| `difficulty` | 難度：`基礎` / `中階` / `進階` | `基礎` |
| `round` | 目前回合數 | `1` |
| `rep_message` | 業務員這一輪說的話 | 空字串 |
| `history` | 先前對話歷史（前端保存後回傳） | 空字串 |

**Response（未結束）**

```json
{
  "ended": false,
  "session_id": "...",
  "round": 1,
  "next_round": 2,
  "customer_reply": "可以，但我想先看到具體數字…",
  "customer_mood": "開始投入",
  "objective_reached": false,
  "history": "業務：…\n客戶：…"
}
```

下一輪把回傳的 `history` 與 `next_round` 帶回請求即可延續對話。

**Response（已結束）** 會多回傳五維評分與弱項建議：

```json
{
  "ended": true,
  "total_score": 72,
  "scores": { "opening": 70, "questioning": 65, "needs": 55, "objection": 40, "closing": 65 },
  "weakest_skill": "異議處理",
  "improvement": "先確認異議真正原因，再回應。",
  "manager_required": false
}
```

## 機制說明

- **客戶模擬器（規則式）**：依 `customer_type` 給不同人格反應；難度越高（`中階`/`進階`）越會在後段注入價格異議、複合異議。全程為關鍵字規則比對，無外部 LLM。
- **達成下一步**：業務員在第 3 回合後提出約訪／給資料／盤點等，且客戶阻力低時，判定 `objective_reached = true` 提前結束。
- **回合上限**：基礎 5、中階 6、進階 8；達上限即結束。
- **評分**：五維（開場 15% / 提問 25% / 需求分析 25% / 異議處理 20% / 成交收口 15%）加權為總分；總分 < 65 或最弱維度 < 55 時 `manager_required = 是`。

## 合規備註

- 此工作流程屬**內部業輔訓練**用途，非對外行銷素材，虛擬客戶回應皆為一般業務對話語句。
- 對白未涉及保單轉換、貸款購買保險／投資、假設報酬率推導、收益保證或商品代號，符合專案合規紅線。
- Google Sheet 紀錄僅存業務員名稱與陪練分數等訓練資料；請勿在此表存放客戶個資，需要時另開私人 repo／試算表。
