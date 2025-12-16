<?php
// 設定收件人信箱
$to = "thomas132sunplus@gmail.com"; // ← 請改成你自己的信箱

// 收集表單資料
$name = $_POST['name'];
$phone = $_POST['phone'];
$product = $_POST['product'];
$quantity = $_POST['quantity'];
$delivery = $_POST['delivery'];

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