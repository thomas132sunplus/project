<?php
// 設定收件人信箱
$to = "thomas132sunplus@gmail.com"; // ← 請改成你自己的信箱

// 收集並清理表單資料（防止 header injection 與 XSS）
function sanitizeInput($input) {
    $input = trim($input);
    // 移除可能的 SMTP header 注入字元
    $input = str_replace(array("\r", "\n", "%0a", "%0d"), '', $input);
    return htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
}

$name = isset($_POST['name']) ? sanitizeInput($_POST['name']) : '';
$phone = isset($_POST['phone']) ? sanitizeInput($_POST['phone']) : '';
$product = isset($_POST['product']) ? sanitizeInput($_POST['product']) : '';
$quantity = isset($_POST['quantity']) ? sanitizeInput($_POST['quantity']) : '';
$delivery = isset($_POST['delivery']) ? sanitizeInput($_POST['delivery']) : '';

// 基本驗證
if (empty($name) || empty($product) || empty($quantity)) {
    http_response_code(400);
    echo "<h2>請填寫必要欄位（姓名、商品、數量）。</h2>";
    exit;
}

// 建立郵件內容
$subject = "新訂單通知 - 妹妹烘培工坊";
$message = "
您有一筆新訂單：

姓名：$name
電話：$phone
商品：$product
數量：$quantity
取貨方式：$delivery

請儘速處理，謝謝！
";

// 設定郵件標頭
$headers = "From: no-reply@meimeibakery.com\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8";

// 寄送郵件
if (mail($to, $subject, $message, $headers)) {
    echo "<h2>訂單已送出成功！我們將儘快與您聯繫。</h2>";
} else {
    echo "<h2>訂單送出失敗，請稍後再試或聯絡客服。</h2>";
}
?>