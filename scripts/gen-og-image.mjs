// One-off: renders public/og-default.png (1200x630) with Playwright. Run when the brand or tagline changes:
//   PW_CHANNEL=msedge node scripts/gen-og-image.mjs
import { chromium } from "@playwright/test";

const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;width:1200px;height:630px;display:flex;flex-direction:column;justify-content:center;padding:0 96px;box-sizing:border-box;background:#0b1120;color:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif">
<div style="display:flex;align-items:center;gap:28px"><svg width="132" height="132" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#818cf8"/><path d="M26 20 14 32l12 12M38 20l12 12-12 12" fill="none" stroke="#0b1120" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div style="font-size:112px;font-weight:800;letter-spacing:-2px">KunKit</div></div>
<div style="margin-top:36px;font-size:44px;line-height:1.3;color:#cbd5e1;max-width:900px">Bộ công cụ cho developer: JSON, XML, JWT, Base64, Markdown, màu sắc và hơn thế nữa.</div>
<div style="margin-top:28px;font-size:32px;color:#94a3b8">Xử lý ngay trên trình duyệt. Không gửi dữ liệu đi đâu.</div></body>`;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: "public/og-default.png" });
await browser.close();
console.log("wrote public/og-default.png");
