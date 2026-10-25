export async function onRequestPost({ request, env }) {
  const auth = authorize(request, env);
  if (auth) return auth;
  if (!env.VOUCHERS) return json({ error: "VOUCHERS database binding မရှိပါ" }, 500);
  let d;
  try { d = await request.json(); } catch { return json({ error: "JSON data မမှန်ပါ" }, 400); }
  const code = clean(d.code, 120);
  const status = clean(d.status || "active", 20).toLowerCase();
  const period = clean(d.period, 120);
  const expired_at = clean(d.expired_at, 40);
  if (!code) return json({ error: "Voucher Code မဖြစ်မနေ ထည့်ပါ" }, 400);
  if (!["active", "used", "expired", "disabled"].includes(status)) return json({ error: "Status သည် active, used, expired, disabled ဖြစ်ရပါမည်" }, 400);
  try {
    await upsert(env.VOUCHERS, { code, status, period, expired_at });
    return json({ ok: true, message: `Voucher ${code} ကို သိမ်းဆည်းပြီးပါပြီ။` });
  } catch (e) { return json({ error: "Database ထဲသို့ သိမ်းမရပါ။ Schema ကို စစ်ဆေးပါ။" }, 500); }
}
export function authorize(request, env) {
  if (!env.ADMIN_TOKEN) return json({ error: "Cloudflare ထဲတွင် ADMIN_TOKEN secret မသတ်မှတ်ရသေးပါ" }, 500);
  if (request.headers.get("Authorization") !== `Bearer ${env.ADMIN_TOKEN}`) return json({ error: "Admin Token မမှန်ပါ" }, 401);
  return null;
}
export function clean(v, max) { return String(v ?? "").trim().slice(0, max); }
export async function upsert(db, v) {
  await db.prepare(`INSERT INTO vouchers (code, status, period, expired_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(code) DO UPDATE SET status=excluded.status, period=excluded.period,
    expired_at=excluded.expired_at, updated_at=datetime('now')`)
    .bind(v.code, v.status, v.period || null, v.expired_at || null).run();
}
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }); }