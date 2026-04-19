export function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">隱私權政策</h1>
      <p className="text-sm text-gray-500 mb-8">最後更新日期：2026 年 4 月 19 日</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">一、收集的個人資料</h2>
          <p>當您註冊並使用「邊境之外」辯論活動媒合平台（以下簡稱「本平台」）時，我們會收集以下資料：</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>電子郵件地址（Email）</li>
            <li>自設定的顯示名稱</li>
            <li>學校名稱、字頭</li>
            <li>在平台上的活動記錄（所屬隊伍、參加賽事等）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">二、收集目的</h2>
          <p>上述資料用於以下目的：</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>驗證帳號身分、登入授權</li>
            <li>辯論活動媒合、練習賽安排</li>
            <li>平台功能運作（通知、討論、賽事等）</li>
            <li>系統安全維護、異常偵測</li>
          </ul>
          <p className="mt-2">我們不會將個人資料於上述用途以外使用，亦不會販售或提供給第三方。</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">三、資料保存期限</h2>
          <p>您的個人資料將保存至用戶申請刪除帳號為止。系統作業日誌在 Google Cloud 端保留 90 天後自動清除。</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">四、安全防護措施</h2>
          <p>本平台採取以下技術措施保護您的個人資料：</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>使用 Firebase Authentication 管理帳號，密碼以加密形式儲存，平台方無法得知您的密碼</li>
            <li>資料存取由 Firestore 安全規則控制，未登入者無法讀取任何資料</li>
            <li>網站通訊使用 HTTPS 加密傳輸</li>
            <li>部署 Content Security Policy 等標頭防範常見攻擊</li>
            <li>利用 Cloud 稽核日誌偵測異常流量</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">五、您的權利</h2>
          <p>依據《個人資料保護法》，您享有以下權利：</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>查閱</strong>：您可在個人主頁查看自己的資料</li>
            <li><strong>更正</strong>：您可在個人主頁自行編輯更新</li>
            <li><strong>刪除</strong>：您可在個人主頁申請刪除帳號，我們將於 7 個工作天內處理</li>
            <li><strong>停止使用</strong>：您可隨時停止使用本平台</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">六、Cookie 與追蹤技術</h2>
          <p>本平台使用 Microsoft Clarity 進行匿名使用行為分析，以改善使用者體驗。Clarity 不會收集可直接識別個人身分的資訊。您可透過瀏覽器設定拒絕追蹤。</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">七、政策變更</h2>
          <p>本政策如有重大變更，將於平台上公告通知。繼續使用本平台表示您同意更新後的條款。</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">八、聯絡我們</h2>
          <p>如有任何隱私相關問題，或欲行使上述各項權利，請透過平台內的討論中心與管理員聯繫。</p>
        </section>

      </div>
    </div>
  );
}