
import { authorize, clean } from "./add.js";

export async function onRequestPost({ request, env }) {
  const auth = authorize(request, env);
  if (auth) return auth;

  if (!env.VOUCHERS) {
    return json({ error: "VOUCHERS database binding မရှိပါ" }, 500);
  }

  let input;
  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");

      if (!file || typeof file.text !== "function") {
        return json({ error: "CSV ဖိုင်ကို ရွေးပါ" }, 400);
      }
      if (file.size > 2 * 1024 * 1024) {
        return json({ error: "CSV ဖိုင်သည် 2MB ထက်မကြီးရပါ" }, 413);
      }
      input = await file.text();
    } else {
      input = await request.text();
      if (input.length > 2 * 1024 * 1024) {
        return json({ error: "CSV သည် 2MB ထက်မကြီးရပါ" }, 413);
      }
    }
  } catch {
    return json({ error: "CSV ဖိုင်ကို ဖတ်မရပါ" }, 400);
  }

  const rows = parseCSV(input);
  if (!rows.length) {
    return json({ error: "CSV ထဲတွင် Voucher row မတွေ့ပါ" }, 400);
  }
  if (rows.length > 5000) {
    return json({ error: "တစ်ကြိမ်လျှင် 5000 row ထက်မပိုရပါ" }, 400);
  }

  const statements = [];
  let skipped = 0;

  for (const row of rows) {
    const code = clean(row.code, 120);
    let status = clean(row.status || "active", 20).toLowerCase();

    if (status === "not used" || status === "unused") status = "active";
    if (status === "in use") status = "used";

    if (!code || !["active", "used", "expired", "disabled"].includes(status)) {
      skipped++;
      continue;
    }

    statements.push(
      env.VOUCHERS.prepare(`
        INSERT INTO vouchers (code, status, period, expired_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(code) DO UPDATE SET
          status = excluded.status,
          period = excluded.period,
          expired_at = excluded.expired_at,
          updated_at = datetime('now')
      `).bind(
        code,
        status,
        clean(row.period, 120) || null,
        clean(row.expired_at, 40) || null
      )
    );
  }

  let count = 0;
  const batchSize = 50;

  try {
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize);
      await env.VOUCHERS.batch(batch);
      count += batch.length;
    }

    return json({
      ok: true,
      message: `CSV Import ပြီးပါပြီ။ သိမ်းဆည်း/Update: ${count} ခု၊ ကျော်သွား: ${skipped} ခု`
    });
  } catch (e) {
    console.error("CSV import database error:", e?.message || e);
    return json({
      error: "Import database အမှားဖြစ်ပါသည်။ Cloudflare Logs ထဲရှိ error ကို စစ်ဆေးရန်လိုပါသည်။",
      imported_before_error: count
    }, 500);
  }
}

function parseCSV(input) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  input = input.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(x => x !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }

  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some(x => x !== "")) rows.push(row);
  }

  if (!rows.length) return [];

  const norm = s =>
    String(s || "").toLowerCase().replace(/[\s_-]/g, "");

  const first = rows[0].map(norm);
  const hasHeader = first.includes("code") || first.includes("vouchercode");

  let indexes = { code: 0, status: 1, period: 2, expired_at: 3 };

  if (hasHeader) {
    indexes = {
      code: first.findIndex(x => x === "code" || x === "vouchercode"),
      status: first.findIndex(x => x === "status"),
      period: first.findIndex(x => x === "period" || x === "package"),
      expired_at: first.findIndex(
        x => ["expiredat", "expiry", "expirydate"].includes(x)
      )
    };
    rows.shift();
  }

  return rows.map(r => ({
    code: r[indexes.code] || "",
    status: indexes.status < 0 ? "active" : (r[indexes.status] || "active"),
    period: indexes.period < 0 ? "" : (r[indexes.period] || ""),
    expired_at: indexes.expired_at < 0 ? "" : (r[indexes.expired_at] || "")
  }));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
