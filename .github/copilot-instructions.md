# AI Coding Agent Instructions

These instructions document project-specific architecture, workflows, and conventions to help AI agents be immediately productive in this codebase.

## Big Picture
- Static website (Traditional Chinese) for a bakery, with a richer landing/order page and two simpler variants.
- Frontend is plain HTML/CSS/JS; backend is a single PHP mailer endpoint.
- Key pages: [bakery.html](bakery.html) (primary), [index.html](index.html) and [index1.html](index1.html) (simpler variants).
- Styles: [style.css](style.css) is the active stylesheet. [style.css-bak](style.css-bak) is a backup; do not modify for live changes.
- Scripts: [script.js](script.js) adds dynamic pricing, countdown, and UX helpers. It must be explicitly included in pages that need these features.
- Server-side: [submit_order.php](submit_order.php) receives orders and sends an email; there is no database.

## Architecture & Data Flow
- The order form lives in [bakery.html](bakery.html) under the "線上點餐" section and posts to [submit_order.php](submit_order.php) via `method="post"`.
- Client-side pricing uses `product` option values mapped in `productPrices` in [script.js](script.js). The mapping keys must match the `<select id="product">` `value`s.
- `script.js` expects specific DOM hooks:
  - `#product` and `#quantity`: used to compute price.
  - `#priceDisplay`: a node to render the computed price (not currently present in [bakery.html](bakery.html)).
  - `#backToTop`: a button for scroll-to-top UX (not currently present).
  - `#countdown`: a node to show the limited-time countdown (not currently present).
- PHP mailer composes a plaintext email from `name`, `phone`, `product`, `quantity`, `delivery` and calls `mail(...)`.

## Conventions & Patterns
- Text content is Traditional Chinese; preserve tone and emoji usage in the "最新消息" and copy.
- Product codes use kebab-case values (e.g., `milk-toast`, `caramel-tart`) and must stay in sync with `productPrices`.
- Styling favors warm palette, light drop-shadows, rounded corners, and centered sections; mimic patterns in `.products`, `.featured-products`, `.online-order` blocks in [style.css](style.css).
- Keep changes in [style.css](style.css); treat [style.css-bak](style.css-bak) as archival.

## Critical Integration Hooks (add if missing)
- Include the script on pages that need dynamic behavior, ideally before `</body>`:
  ```html
  <script src="script.js"></script>
  ```
- In [bakery.html](bakery.html), add display and helper nodes so `script.js` can work:
  ```html
  <div id="priceDisplay" aria-live="polite"></div>
  <button id="backToTop" style="display:none">回到頂端</button>
  <div id="countdown"></div>
  ```
- Keep `<select id="product">` option `value`s in [bakery.html](bakery.html) synchronized with `productPrices` in [script.js](script.js) to avoid price mismatches.

## Developer Workflows (Windows)
- Static preview: open HTML files directly in a browser.
- PHP endpoint requires a local server. If PHP is installed, run from the project folder:
  ```powershell
  php -S localhost:8000
  ```
  Then visit `http://localhost:8000/bakery.html` to test form submission.
- Alternatively use XAMPP/WAMP to host the folder and test `submit_order.php`.

## Debugging Tips
- If pricing or countdown doesn't render, confirm `script.js` is included and required IDs exist (`#priceDisplay`, `#countdown`).
- Check for DOM hook mismatches: a missing `#backToTop` or `#priceDisplay` will cause silent `null` access in `script.js`.
- Validate price consistency across UI copy and `productPrices`.
- For mail issues, verify PHP `mail()` configuration on Windows or use a local SMTP setup.

## Safe Changes & Examples
- When adding new products: update the `<select id="product">` in [bakery.html](bakery.html) and the `productPrices` map in [script.js](script.js).
- To style a new list: follow `.products li` or `.featured-products li` patterns in [style.css](style.css) for spacing and visual consistency.

## Contact Points
- Images are under [images](images); filenames may include Chinese characters.
- There are no external JS/CSS dependencies; do not introduce frameworks unless requested.
