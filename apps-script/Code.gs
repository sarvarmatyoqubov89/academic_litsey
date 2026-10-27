/**
 * Informatika testi — Google Sheets + Telegram backend (Google Apps Script)
 * Savollar va toʻgʻri javoblar alohida "Savollar.gs" faylida (GitHub'da YOʻQ).
 * Parol va Telegram sozlamalari (PASSWORD, TG_TOKEN, TG_CHAT_ID) — "Sozlamalar.gs" faylida (GitHub'da YOʻQ,
 * namunasi: apps-script/Sozlamalar.example.gs).
 * Sahifa toʻgʻri javoblarni umuman koʻrmaydi: baholash shu yerda bajariladi.
 */

// ===== SOZLAMALAR =====
const MAX_ATT    = 2;
const PLAN       = [["easy", 10], ["medium", 13], ["hard", 7]]; // 1–10 oson, 11–23 oʻrtacha, 24–30 murakkab
const PER_Q_SEC  = 60;
const TZ         = "Asia/Tashkent";
// ======================

const RES_HEAD = ["№", "Familiya", "Ism", "Guruh", "Urinish", "Savollar", "Toʻgʻri", "Xato", "Javobsiz",
  "Ball", "Foiz", "Sarflangan vaqt (s)", "Yakunlanish sababi", "Tugagan vaqt", "ID"];
const ATT_HEAD = ["Kalit", "Familiya", "Ism", "Guruh", "Urinish", "Vaqt", "Qurilma"];

/** Bir marta qoʻlda ishga tushiring: varaqlar, maxfiy kalit va ruxsatlar. */
function setup() {
  if (typeof PASSWORD !== "string" || PASSWORD.length < 6 || PASSWORD === "PAROLNI_OZGARTIRING")
    throw new Error("Sozlamalar faylida PASSWORD ni oʻrnating (kamida 6 belgi)");
  sheet_("Natijalar", RES_HEAD);
  sheet_("Urinishlar", ATT_HEAD);
  secret_();
  PLAN.forEach(([lvl, n]) => { if (!BANK[lvl] || BANK[lvl].length < n) throw new Error(lvl + " darajasida savol yetarli emas"); });
  Object.keys(BANK).forEach(lvl => BANK[lvl].forEach((b, i) => {
    if (b.o && b.ru && b.ru.o && b.ru.o.length !== b.o.length) throw new Error(`${lvl}[${i}]: ruscha variantlar soni mos emas`);
  }));
  if (TG_TOKEN && TG_CHAT_ID) telegram_("✅ Test backendi ulandi.");
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === "start") return json_(start_(p));
  if (p.action === "xls") {
    if (p.key !== PASSWORD) return json_({ ok: false, error: "parol notoʻgʻri" });
    return ContentService.createTextOutput(xls_())
      .setMimeType(ContentService.MimeType.XML)
      .downloadAsFile("natijalar_" + Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd") + ".xls");
  }
  return json_({ ok: true, msg: "Backend ishlayapti" });
}

/* ---------- Testni boshlash: urinishni tekshirish + savollarni tanlash ---------- */
function start_(p) {
  const fam = txt_(p.fam, 40), ism = txt_(p.ism, 40), guruh = txt_(p.guruh, 20);
  if (fam.trim().length < 2 || ism.trim().length < 2 || guruh.trim().length < 1) return { ok: false, error: "Maʼlumotlar toʻliq emas" };
  const k = key_(fam, ism, guruh);
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  let attempt;
  try {
    const sh = sheet_("Urinishlar", ATT_HEAD);
    const last = sh.getLastRow();
    const used = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().filter(r => r[0] === k).length : 0;
    if (used >= MAX_ATT) return { ok: false, used };
    attempt = used + 1;
    sh.appendRow([k, fam, ism, guruh, attempt, now_(), txt_(p.deviceId, 40)]);
  } finally { lock.releaseLock(); }

  const questions = [], ref = [];
  const ru = p.lang === "ru";
  PLAN.forEach(([lvl, n]) => {
    shuffle_(BANK[lvl].map((_, i) => i)).slice(0, n).forEach(i => {
      const b = BANK[lvl][i];
      const tr = ru && b.ru ? b.ru : {};   // ruscha matn boʻlmasa — oʻzbekcha
      const q = { t: b.t, q: tr.q || b.q, lvl };
      if (b.img) q.img = b.img;
      if (b.audio) q.audio = b.audio;
      let ord = "";
      if (b.o) { const src = tr.o || b.o, o = shuffle_(b.o.map((_, j) => j)); ord = o.join(""); q.o = o.map(j => src[j]); }
      questions.push(q);
      ref.push([lvl, i, ord]);
    });
  });
  const token = sign_({ f: fam, i: ism, g: guruh, a: attempt, t: Date.now(), q: ref });
  return { ok: true, attempt, token, questions };
}

/* ---------- Javoblarni qabul qilish va baholash ---------- */
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "notoʻgʻri soʻrov" }); }
  const v = verify_(d && d.token);
  if (!v) return json_({ ok: false, error: "token yaroqsiz" });
  const s = v.data, id = v.sig.slice(0, 24);

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const sh = sheet_("Natijalar", RES_HEAD);
    const last = sh.getLastRow();
    if (last > 1) {   // bir test faqat bir marta qabul qilinadi (birinchisi hisoblanadi)
      const ids = sh.getRange(2, 15, last - 1, 1).getValues();
      for (let r = 0; r < ids.length; r++) {
        if (ids[r][0] === id) return json_(fromRow_(sh.getRange(r + 2, 1, 1, 15).getValues()[0]));
      }
    }
    const ans = Array.isArray(d.answers) ? d.answers : [];
    let correct = 0, unanswered = 0;
    s.q.forEach(([lvl, i, ord], n) => {
      const b = BANK[lvl] && BANK[lvl][i], a = ans[n];
      if (a == null || a === "" || (Array.isArray(a) && !a.length)) { unanswered++; return; }
      if (b && grade_(b, ord, a)) correct++;
    });
    const total = s.q.length;
    const elapsed = Math.round((Date.now() - s.t) / 1000);
    let reason = txt_(d.reason, 80);
    if (elapsed > total * PER_Q_SEC + 120) reason += " (vaqtdan kech yuborildi)";
    const row = [last, s.f, s.i, s.g, s.a, total, correct, total - correct, unanswered, correct,
      Math.round(correct / total * 1000) / 10, elapsed, reason, now_(), id];
    sh.appendRow(row);
    if (TG_TOKEN && TG_CHAT_ID) {
      telegram_(`📝 ${s.f} ${s.i} (${s.g})\nUrinish: ${s.a}/${MAX_ATT}\n` +
        `Toʻgʻri: ${correct}/${total} · Xato: ${total - correct}\nNatija: ${row[10]}%\nSabab: ${reason}`);
    }
    return json_(fromRow_(row));
  } finally { lock.releaseLock(); }
}

function grade_(b, ord, a) {
  if (b.t === "s") { const k = Number(a); return Number.isInteger(k) && Number(ord[k]) === b.a; }
  if (b.t === "m") {
    if (!Array.isArray(a)) return false;
    const got = [...new Set(a.map(k => Number(ord[Number(k)])))].filter(x => !isNaN(x)).sort();
    const need = b.a.slice().sort();
    return got.length === need.length && got.every((x, j) => x === need[j]);
  }
  return b.a.concat((b.ru && b.ru.a) || []).map(norm_).includes(norm_(a));
}
function fromRow_(r) {
  return { ok: true, fam: r[1], ism: r[2], guruh: r[3], attempt: r[4], total: r[5], correct: r[6], wrong: r[7],
    unanswered: r[8], percent: r[10], reason: r[12] };
}

/* ---------- Imzolangan token (soxtalashtirib boʻlmaydi) ---------- */
function secret_() {
  const pr = PropertiesService.getScriptProperties();
  let s = pr.getProperty("SECRET");
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); pr.setProperty("SECRET", s); }
  return s;
}
function hmac_(str) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(str, secret_())); }
function sign_(obj) {
  const p = Utilities.base64EncodeWebSafe(JSON.stringify(obj), Utilities.Charset.UTF_8);
  return p + "." + hmac_(p);
}
function verify_(token) {
  if (typeof token !== "string" || token.indexOf(".") < 0) return null;
  const [p, sig] = token.split(".");
  if (hmac_(p) !== sig) return null;
  try {
    const data = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(p)).getDataAsString("UTF-8"));
    return { data, sig };
  } catch (e) { return null; }
}

/* ---------- Oʻqituvchi uchun .xls ---------- */
function xls_() {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const val = v => v instanceof Date ? Utilities.formatDate(v, TZ, "dd.MM.yyyy HH:mm:ss") : v;
  const cell = (v, h) => `<Cell${h ? ' ss:StyleID="h"' : ""}><Data ss:Type="${typeof v === "number" ? "Number" : "String"}">${esc(val(v))}</Data></Cell>`;
  const ws = (name, data) => `<Worksheet ss:Name="${name}"><Table>\n` +
    data.map((r, i) => "<Row>" + r.map(v => cell(v, i === 0)).join("") + "</Row>").join("\n") + "\n</Table></Worksheet>";
  const res = sheet_("Natijalar", RES_HEAD).getDataRange().getValues().map(r => r.slice(0, 14));   // ID ustunisiz
  const att = sheet_("Urinishlar", ATT_HEAD).getDataRange().getValues().map(r => r.slice(1));       // Kalit ustunisiz
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#C8ECCB" ss:Pattern="Solid"/></Style></Styles>
${ws("Natijalar", res)}
${ws("Urinishlar", att)}
</Workbook>`;
}

/* ---------- Yordamchilar ---------- */
function telegram_(text) {
  try {
    UrlFetchApp.fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "post", contentType: "application/json", muteHttpExceptions: true,
      payload: JSON.stringify({ chat_id: TG_CHAT_ID, text })
    });
  } catch (e) { console.error(e); }
}
function sheet_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(head);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight("bold").setBackground("#c8eccb");
  }
  return sh;
}
function shuffle_(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function norm_(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/[ʻʼ‘’`´']/g, "'").replace(/["«»“”\s]/g, "").replace(/;/g, ",");
}
function key_(f, i, g) {
  return [f, i, g].map(x => String(x || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[ʻʼ‘’`´']/g, "'")).join("|");
}
function txt_(v, n) { return String(v == null ? "" : v).slice(0, n); }
function now_() { return Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm:ss"); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
