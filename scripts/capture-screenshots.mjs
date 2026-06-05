import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs", "screenshots");
const baseUrl = "https://krishilink-delta.vercel.app";

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

const shot = async (name) => {
  await page.waitForTimeout(700);
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: false,
  });
  console.log(`Saved ${name}.png`);
};

try {
  // 1) Home hero section
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  await shot("marketplace");

  // 2) Auth screen via navbar Login button
  await page.getByRole("button", { name: /login/i }).first().click();
  await shot("auth");

  // 3) "Farmer dashboard" placeholder: Sign-up mode with Farmer role selected
  await page.getByRole("button", { name: /sign up/i }).first().click();
  await page.getByRole("button", { name: /farmer/i }).first().click();
  await shot("farmer-dashboard");

  // 4) Marketplace list via "Shop Now"
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByRole("button", { name: /shop now/i }).first().click();
  await page.waitForTimeout(2000);

  // Add one item to cart, then open cart sidebar => checkout-like state
  const addToCartBtn = page.getByRole("button", { name: /add to cart/i }).first();
  if (await addToCartBtn.isVisible().catch(() => false)) {
    await addToCartBtn.click();
  }
  const cartBtn = page.getByRole("button", { name: /cart/i }).first();
  if (await cartBtn.isVisible().catch(() => false)) {
    await cartBtn.click();
  }
  await shot("checkout");

  // Close cart sidebar if open
  const closeCartBtn = page.getByRole("button", { name: /close cart/i }).first();
  if (await closeCartBtn.isVisible().catch(() => false)) {
    await closeCartBtn.click();
    await page.waitForTimeout(700);
  }

  // 5) Chat placeholder: marketplace with a different category filter
  const fruitsFilterBtn = page.getByRole("button", { name: /fruits/i }).first();
  if (await fruitsFilterBtn.isVisible().catch(() => false)) {
    await fruitsFilterBtn.click();
    await page.waitForTimeout(700);
  }
  await shot("chat");

  // 6) Admin placeholder: marketplace with another distinct filter state
  const grainsFilterBtn = page.getByRole("button", { name: /grains/i }).first();
  if (await grainsFilterBtn.isVisible().catch(() => false)) {
    await grainsFilterBtn.click();
    await page.waitForTimeout(700);
  }
  await shot("admin");
} catch (err) {
  console.error("Screenshot run failed:", err.message);
} finally {
  await browser.close();
  console.log(`Screenshots saved to ${outDir}`);
}
