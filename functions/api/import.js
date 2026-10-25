import { authorize, clean, upsert } from "./add.js";

export async function onRequestPost({ request, env }) {
  const auth = authorize(request, env);
  if (auth) return auth;
  if (!env.VOUCHERS) return json({ error: "VOUCHERS database binding မရှိပါ" }, 500);
  let text;
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file.text !== "function") return json({ error: "CSV ဖိုင်ကို ရွေးပါ" }, 400);
      if (file.size > 2 * 1024 * 1024) return json({ error: "CSV ဖိုင်သည် 2MB ထက်မကြီးရပါ" }, 413);
      text = await file.text();
    } else {
      text = await request.text();
      if (text.length > 2 * 1024 * 1024) return json({ error: "CSV သည် 2MB ထက်မကြီးရပါ" }, 413);
    }
  } catch { return json({ error: "CSV ဖိုင်ကို ဖတ်မရပါ" }, 400); }
  const parsed = parseCSV(text);
  if (!parsed.length) return json({ error: "CSV ထဲတွင် Voucher row မတွေ့ပါ" }, 400);
  if (parsed.length > 5000) return json({ error: "တစ်ကြိမ်လျှင် 5000 row ထက်မပိုရပါ" }, 400);
  let count = 0, skipped = 0;
  try {
    for (const row of parsed) {
      const code = clean(row.code, 120);
      const status = clean(row.status || "active", 20).toLowerCase();
      if (!code || !["active", "used", "expired", "disabled"].includes(status)) { skipped++; continue; }
      await upsert(env.VOUCHERS, { code, status, period: clean(row.period, 120), expired_at: clean(row.expired_at, 40) });
      count++;
    }
    return json({ ok: true, message: `CSV Import ပြီးပါပြီ။ သိမ်းဆည်း/Update: ${count} ခု၊ ကျော်သွား: ${skipped} ခု` });
  } catch (e) { return json({ error: "Import အတွင်း database အမှားဖြစ်ပါသည်။" }, 500); }
}
function parseCSV(input) {
  const rows = []; let row = [], cell = "", quoted = false;
  input = input.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(cell.trim()); if (row.some(x => x !== "")) rows.push(row);
      row = []; cell = "";
    } else cell += c;
  }
  if (cell.length || row.length) { row.push(cell.trim()); if (row.some(x => x !== "")) rows.push(row); }
  if (!rows.length) return [];
  const norm = s => String(s || "").toLowerCase().replace(/[\s_-]/g, "");
  const first = rows[0].map(norm);
  const hasHeader = first.includes("code") || first.includes("vouchercode");
  let indexes = { code: 0, status: 1, period: 2, expired_at: 3 };
  if (hasHeader) {
    indexes = { code: first.findIndex(x => x === "code" || x === "vouchercode"), status: first.findIndex(x => x === "status"), period: first.findIndex(x => x === "period" || x === "package"), expired_at: first.findIndex(x => x === "expiredat" || x === "expiry" || x === "expirydate") };
    rows.shift();
  }
  return rows.map(r => ({ code: r[indexes.code] || "", status: r[indexes.status] || "active", period: r[indexes.period] || "", expired_at: r[indexes.expired_at] || "" }));
}
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }); }