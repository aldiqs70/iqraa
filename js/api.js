/* Backend adapter: Google Apps Script web app, or a local demo store when no URL is configured. */
const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];
const GRADES = [
  { id: 'KG', name: 'الروضة', dept: 'basic' },
  { id: '1', name: 'الأول', dept: 'basic' },
  { id: '2', name: 'الثاني', dept: 'basic' },
  { id: '3', name: 'الثالث', dept: 'basic' },
  { id: '4', name: 'الرابع', dept: 'basic' },
  { id: '5', name: 'الخامس', dept: 'basic' },
  { id: '6', name: 'السادس', dept: 'sec' },
  { id: '7', name: 'السابع', dept: 'sec' },
  { id: '8', name: 'الثامن', dept: 'sec' },
  { id: '9', name: 'التاسع', dept: 'sec' },
  { id: '10', name: 'العاشر', dept: 'sec' },
  { id: '11', name: 'الأول الثانوي', dept: 'sec' },
  { id: '12', name: 'التوجيهي', dept: 'sec', free: true, noCompetition: true },
];
const SECTIONS = GRADES.flatMap(g => LETTERS.map(l => ({ id: g.id + '-' + l, grade: g.id, letter: l })));

const API = (() => {
  const url = ((window.IQRA_CONFIG || {}).apiUrl || '').trim();
  const demo = !url;
  const KEY = 'iqra-demo-v1';
  let mem = null;

  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { mem = null; }
    if (!mem) {
      mem = { plans: {}, errors: [], notes: {}, settings: {}, pw: { admin: '1234' } };
      SECTIONS.forEach(s => { mem.pw[s.id] = '1111'; });
    }
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* in-memory only */ } }
  function fail(msg) { const e = new Error(msg); e.userMessage = msg; throw e; }

  function checkCred(db, cred, sectionId) {
    if (!cred) fail('يلزم تسجيل الدخول');
    if (cred.role === 'admin') { if (cred.pw !== db.pw.admin) fail('كلمة مرور المديرة غير صحيحة'); return 'admin'; }
    if (cred.role === 'section') {
      if (db.pw[cred.id] !== cred.pw) fail('كلمة مرور الشعبة غير صحيحة');
      if (sectionId && sectionId !== cred.id) fail('هذا الحساب لا يملك صلاحية هذه الشعبة');
      return 'section';
    }
    fail('يلزم تسجيل الدخول');
  }
  function adminOnly(db, cred) { if (checkCred(db, cred) !== 'admin') fail('هذه العملية للمديرة فقط'); }

  const local = {
    bootstrap() {
      const db = load();
      return { plans: db.plans, errors: db.errors, notes: db.notes, settings: db.settings };
    },
    login({ cred }) { const db = load(); return { role: checkCred(db, cred) }; },
    saveError({ cred, rec }) {
      const db = load(); checkCred(db, cred, rec.section);
      const n = Math.max(0, Math.min(999, parseInt(rec.count, 10) || 0));
      let r = db.errors.find(x => x.section === rec.section && x.entryId === rec.entryId);
      if (!r) { r = { id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }; db.errors.push(r); }
      Object.assign(r, { section: rec.section, grade: rec.grade, entryId: rec.entryId, date: rec.date, type: rec.type, count: n, at: new Date().toISOString(), by: cred.role });
      save(); return { rec: r };
    },
    deleteError({ cred, id }) { const db = load(); adminOnly(db, cred); db.errors = db.errors.filter(x => x.id !== id); save(); return { ok: true }; },
    savePlan({ cred, grade, entries }) { const db = load(); adminOnly(db, cred); db.plans[grade] = entries; save(); return { ok: true }; },
    saveNote({ cred, key, text }) { const db = load(); adminOnly(db, cred); if (text) db.notes[key] = text; else delete db.notes[key]; save(); return { ok: true }; },
    saveSetting({ cred, key, value }) { const db = load(); adminOnly(db, cred); db.settings[key] = value; save(); return { ok: true }; },
    passwords({ cred }) { const db = load(); adminOnly(db, cred); return { pw: db.pw }; },
    setPassword({ cred, id, pw }) {
      const db = load(); adminOnly(db, cred);
      if (!pw || String(pw).length < 4) fail('كلمة المرور يجب أن تكون 4 خانات على الأقل');
      db.pw[id] = String(pw); save(); return { ok: true };
    },
  };

  async function call(action, payload = {}) {
    if (demo) {
      await new Promise(r => setTimeout(r, 60));
      return local[action](payload);
    }
    let res;
    try {
      res = await fetch(url, { method: 'POST', body: JSON.stringify({ action, ...payload }) });
    } catch (e) { fail('تعذّر الاتصال بقاعدة البيانات. تأكدي من الإنترنت ثم حاولي مرة أخرى.'); }
    let data;
    try { data = await res.json(); } catch (e) { fail('ردّ غير متوقع من قاعدة البيانات. راجعي رابط Apps Script في ملف config.js.'); }
    if (!data || data.ok === false) fail((data && data.error) || 'حدث خطأ في قاعدة البيانات');
    return data;
  }

  return { demo, call };
})();
