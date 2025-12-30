const productPrices = {
  "milk-toast": 80,
  "caramel-tart": 65,
  "taro-bread": 70,
  "nut-cookie": 50,
  "mango-roll": 90
};

const productSelect = document.getElementById("product");
const quantityInput = document.getElementById("quantity");
const priceDisplay = document.getElementById("priceDisplay");

function updatePrice() {
  const product = productSelect.value;
  const quantity = parseInt(quantityInput.value) || 0;
  const price = productPrices[product] * quantity;
  priceDisplay.textContent = `預估金額：NT$${price}`;
}

productSelect.addEventListener("change", updatePrice);
quantityInput.addEventListener("input", updatePrice);

// 回到頂端按鈕
const backToTopBtn = document.getElementById("backToTop");
window.addEventListener("scroll", () => {
  backToTopBtn.style.display = window.scrollY > 300 ? "block" : "none";
});
backToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// 限時優惠倒數
const countdown = document.getElementById("countdown");
function updateCountdown() {
  const now = new Date();
  const deadline = new Date("2026-01-05T20:00:00");
  const diff = deadline - now;
  if (diff <= 0) {
    countdown.textContent = "🎉 活動已結束";
    return;
  }
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  countdown.textContent = `🎁 限時優惠倒數：${hours} 小時 ${minutes} 分 ${seconds} 秒`;
}
setInterval(updateCountdown, 1000);