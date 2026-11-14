// Shared, pure helpers for occasions: date rules (same as the app) and how an occasion's look is resolved.
// Used by the functions (grimLiveFor) and by scripts/seed-fun.js (the step-3 migration check).
const p2 = (n) => String(n).padStart(2, "0");
const WDAY = { sun: 0, dom: 0, mon: 1, seg: 1, tue: 2, ter: 2, wed: 3, qua: 3, thu: 4, qui: 4, fri: 5, sex: 5, sat: 6, sab: 6 };
function easterUTC(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}
function matchesPattern(pat, t) {
  pat = String(pat).trim().toLowerCase();
  if (!pat) return false;
  let m;
  if ((m = pat.match(/^(\d\d-\d\d)\.\.(\d\d-\d\d)$/))) { const [a, b] = [m[1], m[2]]; return a <= b ? t.md >= a && t.md <= b : t.md >= a || t.md <= b; }
  if ((m = pat.match(/^(\d{4}-\d\d-\d\d)\.\.(\d{4}-\d\d-\d\d)$/))) return t.key >= m[1] && t.key <= m[2];
  if ((m = pat.match(/^easter([+-]\d+)?\.\.easter([+-]\d+)?$/))) {
    const diff = Math.round((Date.UTC(t.y, t.m - 1, t.d) - easterUTC(t.y)) / 86400000);
    return diff >= Number(m[1] || 0) && diff <= Number(m[2] || 0);
  }
  if (/^\d{4}-\d\d-\d\d$/.test(pat)) return pat === t.key;
  if (/^\d\d-\d\d$/.test(pat)) return pat === t.md;
  if ((m = pat.match(/^([a-z]{3})-(\d\d?)$/)) && m[1] in WDAY) return t.weekday === WDAY[m[1]] && t.d === Number(m[2]);
  if ((m = pat.match(/^(\d|last)([a-z]{3})-(\d\d)$/)) && m[2] in WDAY) {
    if (t.m !== Number(m[3]) || t.weekday !== WDAY[m[2]]) return false;
    if (m[1] === "last") return t.d + 7 > new Date(Date.UTC(t.y, t.m, 0)).getUTCDate();
    return Math.ceil(t.d / 7) === Number(m[1]);
  }
  if ((m = pat.match(/^easter([+-]\d+)?$/))) {
    const tg = new Date(easterUTC(t.y) + Number(m[1] || 0) * 86400000);
    return `${tg.getUTCFullYear()}-${p2(tg.getUTCMonth() + 1)}-${p2(tg.getUTCDate())}` === t.key;
  }
  return false;
}

// ---------- Look: an occasion's look is its Tema, whole ----------
// An occasion has `tema` (a palette id, or "" = each person's own).
const occTema = (o) => String((o && typeof o === "object" && o.tema) || "");
// One occasion's effect: its tema's.
const occEffect = (o, pals) => ((pals[occTema(o)] || {}).effect) || "";

module.exports = { WDAY, easterUTC, matchesPattern, occTema, occEffect };
