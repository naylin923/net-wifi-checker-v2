export async function onRequestGet({ request, env }) {
  if (!env.VOUCHERS) return json({ error: "Database binding VOUCHERS မသတ်မှတ်ရသေးပါ" }, 500);
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim();
  if (!code) return json({ error: "Voucher Code ထည့်ပါ" }, 400);
  if (code.length > 120) return json({ error: "Voucher Code အလွန်ရှည်နေပါသည်" }, 400);
  try {
    const row = await env.VOUCHERS.prepare(
      "SELECT code, status, period, expired_at FROM vouchers WHERE code = ? LIMIT 1"
    ).bind(code).first();
    if (!row) return json({ found: false });
    return json({ found: true, code: row.code, status: row.status, period: row.period, expired_at: row.expired_at });
  } catch (e) {
    return json({ error: "Database ကို ဖတ်မရပါ။ Table/schema ကို စစ်ဆေးပါ။" }, 500);
  }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}