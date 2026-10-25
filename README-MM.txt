NET WiFi Voucher Checker — Cloudflare Pages package

ပါဝင်သည်
- public/index.html : အသုံးပြုသူ Voucher စစ်ဆေးရန်
- public/admin.html : Voucher ကိုယ်တိုင်ထည့်ရန်၊ CSV import
- functions/api/check.js : Voucher စစ်ဆေး API
- functions/api/add.js : Admin manual-add API
- functions/api/import.js : CSV import API
- schema.sql : D1 table schema

အရေးကြီး
ဤ package သည် Ruijie API အလိုအလျောက်ချိတ်ဆက်မှု မပါသေးပါ။ Admin က ကိုယ်တိုင်ထည့်ခြင်း/CSV import ဖြင့် လုပ်ဆောင်ရန် ပြင်ဆင်ထားသည်။ Deploy မလုပ်မီ test လုပ်ပါ။ ရှိပြီးသား D1 database ကို မဖျက်ပါနှင့်။

Cloudflare Pages မှာ တင်ရန်
1. ZIP ကို Extract လုပ်ပါ။
2. GitHub ရှိ လက်ရှိ repository ထဲက project files ကို backup လုပ်ထားပြီးမှ package ထဲက files/folders ကို ထည့်ပါ။ လက်ရှိ files အားလုံးကို အစားထိုးမလုပ်ခင် backup မဖြစ်မနေယူပါ။
3. Cloudflare Pages project တွင် Build command ကို blank ထားပြီး Build output directory ကို public သတ်မှတ်ပါ။ Functions folder သည် project root အောက်ရှိ functions/ ဖြစ်ရမည်။
4. Settings > Functions > D1 database bindings တွင် binding name VOUCHERS ဖြင့် ရှိပြီးသား net-wifi-vouchers database ကို ချိတ်ပါ။ Database ကို delete မလုပ်ပါနှင့်။
5. Settings > Variables and Secrets တွင် ADMIN_TOKEN ကို secret အဖြစ် သတ်မှတ်ပါ။ Admin page ရှိ token field မှာ ထိုတန်ဖိုးကို ထည့်ရမည်။
6. D1 Console မှာ schema.sql ကို run လုပ်ပါ။ CREATE TABLE IF NOT EXISTS ဖြစ်သောကြောင့် ရှိပြီးသား table/data ကို မဖျက်ပါ။
7. Deploy ပြီးနောက် / နှင့် /admin.html ကိုစမ်းပါ။

CSV ဖိုင် format
code,status,period,expired_at
NET-123,active,1 Day,2026-12-31
NET-456,used,7 Days,

Header row မပါဘဲလည်း column အစီအစဉ်အတိုင်း import လုပ်နိုင်သည်။
Status တန်ဖိုးများ: active, used, expired, disabled
Code တူပြီးသားဖြစ်လျှင် import/add လုပ်သောတန်ဖိုးများဖြင့် update လုပ်မည်။

Admin URL: https://YOUR-PAGES-DOMAIN/admin.html
Public URL: https://YOUR-PAGES-DOMAIN/

လုံခြုံရေး
- ADMIN_TOKEN ကို public source code ထဲ မထည့်ပါနှင့်။
- Token ကို မျှဝေမထားပါနှင့်။
- ဒီ package က public UI/API အတွက်ဖြစ်ပြီး မူလ database ထဲက data ကို ဖျက်သည့် query မပါဝင်ပါ။
