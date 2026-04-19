# Security Rotation Checklist

## 目前已確認

- Firestore 匿名讀取 users、teams、tournaments、activities 已封鎖。
- Production build 已停用 source map。
- Hosting 已加上安全標頭，且不存在的 `.map` 會回 404。
- 本機 service account 檔案已被 `.gitignore` 忽略，admin 腳本改為讀取環境變數憑證路徑。
- Firebase Browser key 已完成 HTTP referrer 限制，且未使用的舊 Browser key 已刪除。
- 存活中的 Firebase Browser key 已縮到最小可用 API allowlist，目前只保留 5 個 API。
- Cloud Audit Logs 的 `管理員讀取`、`資料讀取`、`資料寫入` 已全部啟用。
- logs-based metric `sensitive_iam_changes` 已建立。
- logs-based alert policy `Sensitive IAM, API key, and service changes` 已建立。
- Git 歷史中存在一筆與敏感憑證移除相關的提交：`3291f50 chore: 移除敏感憑證檔案並更新 .gitignore`。
- 此 repo 有 GitHub 遠端：`origin https://github.com/thomas132sunplus/project.git`。
- 目前 `HEAD` 與 `origin/main` 都不包含 `3291f50` 這筆提交；但這不代表私鑰未曾在其他分支、PR、備份或外部通道曝光。

## 你現在必做

1. 在 Google Cloud Console 刪除目前 service account 的舊金鑰。
2. 重新建立新的 service account 金鑰，存放在版本庫外的位置。
3. 更新本機或 CI 的 `GOOGLE_APPLICATION_CREDENTIALS` 或 `FIREBASE_SERVICE_ACCOUNT_PATH`。
4. 刪除本機舊的 `serviceAccountKey.json`。
5. 確認目前存活的 Firebase Web API key 仍維持既有 HTTP referrer 與 API restrictions。
6. 確認團隊成員沒有在聊天、雲端硬碟、email、備份資料夾中保留舊私鑰。
7. 確認 Cloud Audit Logs、logs-based metric 與 alert policy 沒有被關閉或移除。

## Google Cloud Console 逐步操作

### A. 旋轉 service account 金鑰

1. 前往 Google Cloud Console。
2. 右上角確認目前 project 是 `edgewalker-6c6ac`。
3. 前往 `IAM & Admin` → `Service Accounts`。
4. 找到 `firebase-adminsdk-fbsvc@edgewalker-6c6ac.iam.gserviceaccount.com`。
5. 點進該 service account → `Keys` 分頁。
6. 先建立新金鑰：`Add Key` → `Create new key` → 選 `JSON`。
7. 將新下載的 JSON 放到版本庫外的位置，例如 `C:\secure\edgewalker-service-account.json`。
8. 更新本機或 CI：
   - `GOOGLE_APPLICATION_CREDENTIALS`
   - 或 `FIREBASE_SERVICE_ACCOUNT_PATH`
9. 確認 admin 腳本可用後，回到同一個 `Keys` 分頁，刪除舊金鑰。
10. 刪除本機舊的 `serviceAccountKey.json`。

### B. 限制 Firebase Web API key

1. 前往 `APIs & Services` → `Credentials`。
2. 找到前端使用的 Browser key（通常名稱是 `Browser key (auto created by Firebase)`，且要對應 `src/firebase/config.js` 的 `apiKey`）。
3. 點 `Edit`。
4. `Application restrictions` 選 `HTTP referrers (web sites)`。
5. 加入：
   - `https://edgewalker-6c6ac.web.app/*`
   - `https://edgewalker-6c6ac.firebaseapp.com/*`
   - `https://edgewalker-6c6ac-staging.web.app/*`
   - `http://localhost:5173/*`
   - `http://127.0.0.1:5173/*`
6. `API restrictions` 選 `Restrict key`。
7. 只保留 Firebase 相關 API。此專案目前已確認前端只使用 Firebase Auth、Cloud Firestore、Cloud Storage，因此正式環境目前保留：
   - Cloud Firestore API
   - Identity Toolkit API
   - Token Service API
   - Firebase Installations API
   - Cloud Storage for Firebase API
8. 不要保留任何非 Firebase 服務的 API，特別是 `Generative Language API`。
9. 如果後續產品功能新增前端 Google API 呼叫，必須先驗證需求，再手動擴充 allowlist；不要為了省事改回 unrestricted。
10. 存檔，等待數分鐘生效。

### C. Browser key 收尾結果（2026-04-19）

- 目前正式站與前端設定實際使用的 Browser key，已確認對應 `src/firebase/config.js` 中的 `apiKey`。
- 正式站 bundle 抽樣結果與前端設定一致，代表 production 站目前只在用這一把 Browser key。
- 建立於 2026-02-06 的舊 Browser key 已自 Google Cloud Console 刪除；目前 Credentials 清單只剩建立於 2026-02-10 的 Browser key。
- 存活 Browser key 的 API allowlist 已縮到 5 個 API：
   - Cloud Firestore API
   - Cloud Storage for Firebase API
   - Firebase Installations API
   - Identity Toolkit API
   - Token Service API
- 生效中的 HTTP referrers 為：
   - `https://edgewalker-6c6ac.web.app/*`
   - `https://edgewalker-6c6ac.firebaseapp.com/*`
   - `https://edgewalker-6c6ac-staging.web.app/*`
   - `http://localhost:5173/*`
   - `http://127.0.0.1:5173/*`
- 正式站最短驗證結果：
   - Auth 端點回 `400 INVALID_LOGIN_CREDENTIALS`，表示請求已通過 referrer 限制並抵達 Identity Toolkit API。
   - Firestore 端點回 `403 PERMISSION_DENIED`，表示目前是 Firestore 規則在拒絕，而不是 Browser key 被擋。
   - Storage 端點用實際 bucket 路徑測試回 `403 Permission denied`，表示目前是 Storage 權限在拒絕，而不是 Browser key 被擋。
- localhost:5173 最短驗證結果與正式站一致：
   - Auth 端點回 `400 INVALID_LOGIN_CREDENTIALS`。
   - Firestore 端點回 `403 PERMISSION_DENIED`。
   - Storage 端點回 `403 Permission denied`。
   - 三者都沒有出現 `API_KEY_HTTP_REFERRER_BLOCKED`，表示 localhost referrer allowlist 已正確生效。
- 若需要再驗一次本機開發環境，請固定使用 Vite 預設埠 `5173`，不要改成其他埠，否則不會命中目前的 localhost referrer allowlist。

### D. 稽核日誌與告警收尾結果（2026-04-19）

- Cloud Audit Logs 的 `管理員讀取`、`資料讀取`、`資料寫入` 已全部啟用。
- logs-based metric `sensitive_iam_changes` 已建立，用於彙整敏感 IAM / API key / service usage 變更事件。
- logs-based alert policy `Sensitive IAM, API key, and service changes` 已建立。
- alert filter 目前涵蓋下列敏感操作：
   - service account key 建立 / 刪除
   - API key 建立 / 更新 / 刪除
   - `SetIamPolicy`
   - service enable / disable
- alert policy 目前使用最小可用設定：
   - 通知間隔：1 小時
   - 事件自動關閉：7 天
   - 通知管道：已綁定 Email `Edgewalker Security Alerts (L515151527777@gmail.com)`
- 已完成一次實際告警演練：
   - 透過編輯 Browser key 名稱觸發 `google.api.apikeys.v2.ApiKeys.UpdateKey`。
   - Policy `Sensitive IAM, API key, and service changes` 已成功產生 incident。
   - 測試後 Browser key 名稱已還原為 `Browser key (auto created by Firebase)`。

## GitHub / 遠端倉庫檢查

1. 已確認 GitHub 遠端為公開 repo：`https://github.com/thomas132sunplus/project`。
2. 本機目前狀態：
   - `serviceAccountKey.json` 不存在。
   - `.gitignore` 已忽略 `serviceAccountKey.json`、`service-account*.json`、`*-service-account.json`。
   - 掃描未發現 `BEGIN PRIVATE KEY`、`private_key`、`client_email` 等 service account 私鑰內容殘留。
3. 目前程式中可見 `src/firebase/config.js` 的 Firebase Web API key（Browser key）；此類 key 屬前端公開憑證，風險控制依賴 referrer/API allowlist，非私鑰外洩。
4. `git log --all -- serviceAccountKey.json.json` 顯示曾有移除敏感檔案的歷史提交（`3291f50`），但目前 `HEAD` 與 `origin/main` 皆不包含該提交。
5. 仍需人工補查外部通道（PR 留言、雲端附件、聊天工具、備份）是否曾分享過舊私鑰檔。

## PowerShell 範例

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\edgewalker-service-account.json"
node scripts/fixMissingInviteCodes.admin.js
```

刪除本機舊私鑰：

```powershell
Remove-Item .\serviceAccountKey.json -Force
```

## 建議補做

1. 已完成通知送達驗證：`Edgewalker Security Alerts` 信箱已確認收到告警通知。
2. 到遠端 Git 平台與外部通道補查是否曾分享過舊私鑰檔或截圖。
3. 若曾推送到 GitHub 或其他遠端，視情況做歷史清理，但不要把歷史清理當成取代金鑰輪替。
4. 定期實際觸發一次測試事件，確認 alert 能持續送達。
5. 盤點 users collection 是否要進一步拆成公開檔案與私密檔案，降低登入使用者彼此可見的個資範圍。
6. 補一份內部事件時間線，記錄發現時間、修補時間、部署時間、輪替時間與通知範圍。
7. 需要通報時，可直接參考 [INCIDENT_COMMUNICATION_TEMPLATES.md](INCIDENT_COMMUNICATION_TEMPLATES.md)。
