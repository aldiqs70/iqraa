/* اقرأ وارتقِ — main application */
const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const TYPE_NAMES = { new: 'مقطع جديد', group: 'قراءة جماعية', sabr: 'سبر', review: 'مراجعة جماعية', holiday: 'عطلة', other: 'نشاط' };
const SCORED = ['group', 'sabr'];

const S = { plans: {}, seed: {}, errors: [], notes: {}, settings: {}, admin: null, sec: {}, lesson: null };
const $ = (sel, root = document) => root.querySelector(sel);
const app = () => document.getElementById('app');
const gradeOf = id => GRADES.find(g => g.id === id);
const sectionName = id => { const [g, l] = id.split('-'); return `${gradeOf(g).name} ${l}`; };

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  sget(k, d) { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  sset(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
};

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

/* ---------- dates ---------- */
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseISO(s) { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function fmtDate(iso, withDay = true) {
  const d = parseISO(iso); if (!d) return '';
  return `${withDay ? WEEKDAYS[d.getDay()] + ' ' : ''}${toAr(d.getDate())} ${MONTHS[d.getMonth()]} ${toAr(d.getFullYear())}`;
}
function monthKey(iso) { return iso ? iso.slice(0, 7) : ''; }
function monthName(mk) { const [y, m] = mk.split('-').map(Number); return `${MONTHS[m - 1]} ${toAr(y)}`; }

/* ---------- plans ---------- */
function entries(grade) { const p = S.plans[grade]; return (p && p.length) ? p : (S.seed[grade] || []); }
function planIsSeed(grade) { return !(S.plans[grade] && S.plans[grade].length); }
function todayIndex(list) {
  const t = todayISO();
  let i = list.findIndex(e => e.date === t);
  if (i >= 0) return i;
  i = list.findIndex(e => e.date && e.date > t);
  if (i >= 0) return i;
  return list.length ? list.length - 1 : -1;
}
function weekParts(list, idx) {
  const parts = [];
  let i = idx - 1;
  while (i >= 0 && SCORED.includes(list[i].type)) i--;
  for (; i >= 0; i--) {
    const e = list[i];
    if (e.type === 'new') parts.unshift(e);
    else if (SCORED.includes(e.type) || e.type === 'review') break;
  }
  return parts;
}
function entrySegs(list, idx) {
  const e = list[idx];
  if (!e) return null;
  if (e.segs && e.segs.length) return e.segs;
  if (SCORED.includes(e.type)) { const parts = weekParts(list, idx); return parts.length ? parts.flatMap(p => p.segs) : null; }
  return null;
}
function scoredEntries(grade) { return entries(grade).filter(e => SCORED.includes(e.type)); }
function recOf(section, entryId) { return S.errors.find(r => r.section === section && r.entryId === entryId); }

/* ---------- boot ---------- */
async function boot() {
  app().innerHTML = `<div class="landing"><div></div><div class="picker" style="justify-items:center"><div class="brand">${logoSVG()}<div><h1>اقرأ وارتقِ</h1><p>جارٍ التحميل…</p></div></div></div><div></div></div>`;
  try {
    const [, seed, boot] = await Promise.all([Q.init(), fetch('data/plans.json').then(r => r.json()), API.call('bootstrap')]);
    S.seed = seed;
    S.plans = boot.plans || {};
    S.errors = boot.errors || [];
    S.notes = boot.notes || {};
    S.settings = boot.settings || {};
  } catch (e) {
    app().innerHTML = `<div class="landing"><div></div><div class="picker"><h2>تعذّر تحميل الموقع</h2><p>${esc(e.userMessage || 'تأكدي من الاتصال بالإنترنت ثم أعيدي تحميل الصفحة.')}</p><button class="btn primary" onclick="location.reload()">إعادة المحاولة</button></div><div></div></div>`;
    return;
  }
  S.admin = store.sget('iqra-admin', null);
  S.sec = store.sget('iqra-sec', {});
  Player.reciter = store.get('iqra-reciter', S.settings.reciter || RECITERS[0].id);
  const last = store.get('iqra-last', null);
  if (last && SECTIONS.some(s => s.id === last)) openLesson(last); else home();
}

function logoSVG(cls = 'brand-mark') {
  return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--gold)"><path d="M32 3l7.4 10.7L52 12l-1.7 12.6L61 32l-10.7 7.4L52 52l-12.6-1.7L32 61l-7.4-10.7L12 52l1.7-12.6L3 32l10.7-7.4L12 12l12.6 1.7z"/></g><path d="M20 40c4-3 8-4 12-4s8 1 12 4V24c-4-3-8-4-12-4s-8 1-12 4z" fill="var(--accent)"/><path d="M32 20v16" stroke="var(--surface)" stroke-width="1.6"/><path d="M26 16l6-5 6 5" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* ---------- landing & pickers ---------- */
function frame(inner, crumbs) {
  app().innerHTML = `<div class="landing">
    <div class="topline"><div class="brand">${logoSVG()}<div><h1>اقرأ وارتقِ</h1><p>صفحة كل يوم.. وأثرٌ كل عمر</p></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-go="board">لوحة الترتيب</button><button class="btn" data-go="admin">${S.admin ? 'لوحة الإدارة' : 'دخول الإدارة'}</button></div></div>
    <div class="picker">${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}${inner}</div>
    <div class="foot"><span>${toAr(fmtDate(todayISO()))}</span>${API.demo ? '<span class="demo-note">وضع التجربة: البيانات تُحفظ على هذا الجهاز فقط حتى يُربط الموقع بقاعدة البيانات.</span>' : ''}</div></div>`;
  app().querySelector('[data-go=board]').onclick = () => board();
  app().querySelector('[data-go=admin]').onclick = () => admin();
}
function home() {
  Player.stop(true);
  const last = store.get('iqra-last', null);
  frame(`<h2>أهلاً بكِ.. اختاري القسم</h2>
    ${last ? `<button class="btn primary" data-last style="justify-self:start;font-size:1.15rem;min-height:54px">متابعة صف ${esc(sectionName(last))}</button>` : ''}
    <div class="choice-grid two">
      <button class="choice big" data-d="basic"><b>القسم الأساسي</b><small>من الروضة إلى الصف الخامس</small></button>
      <button class="choice big" data-d="sec"><b>القسم الثانوي</b><small>من الصف السادس إلى التوجيهي</small></button>
    </div>`);
  app().querySelectorAll('[data-d]').forEach(b => b.onclick = () => grades(b.dataset.d));
  const lb = app().querySelector('[data-last]'); if (lb) lb.onclick = () => openLesson(last);
}
function grades(dept) {
  const gs = GRADES.filter(g => g.dept === dept);
  frame(`<h2>اختاري الصف</h2><div class="choice-grid">${gs.map(g => {
    const has = entries(g.id).length;
    return `<button class="choice" data-g="${g.id}">${g.free ? '<span class="tag">قراءة حرة</span>' : has ? '' : '<span class="tag">لا توجد خطة بعد</span>'}<b>${esc(g.name)}</b><small>${g.id === 'KG' ? '' : 'الصف'}</small></button>`;
  }).join('')}</div>`, `<button data-h>الرئيسية</button> › <span>${dept === 'basic' ? 'القسم الأساسي' : 'القسم الثانوي'}</span>`);
  app().querySelectorAll('[data-g]').forEach(b => b.onclick = () => sections(b.dataset.g));
  app().querySelector('[data-h]').onclick = home;
}
function sections(grade) {
  const g = gradeOf(grade);
  frame(`<h2>${esc(g.name)}.. اختاري الشعبة</h2><div class="choice-grid">${LETTERS.map(l => `<button class="choice section" data-s="${grade}-${l}"><b>${l}</b><small>شعبة ${l}</small></button>`).join('')}</div>`,
    `<button data-h>الرئيسية</button> › <button data-d>${g.dept === 'basic' ? 'القسم الأساسي' : 'القسم الثانوي'}</button> › <span>${esc(g.name)}</span>`);
  app().querySelectorAll('[data-s]').forEach(b => b.onclick = () => openLesson(b.dataset.s));
  app().querySelector('[data-h]').onclick = home;
  app().querySelector('[data-d]').onclick = () => grades(g.dept);
}

/* ---------- lesson ---------- */
function openLesson(sectionId) {
  store.set('iqra-last', sectionId);
  const grade = sectionId.split('-')[0];
  const list = entries(grade);
  const free = !!gradeOf(grade).free || !list.length;
  S.lesson = {
    sectionId, grade, free, idx: free ? -1 : todayIndex(list), freePage: store.get('iqra-free-' + grade, 1),
    part: -1, pages: [], pi: 0, portion: null, keys: [],
    tajweed: store.get('iqra-tj', false), gharib: store.get('iqra-gh', true), showAll: false,
    pen: null, hl: {}, sel: null, tab: 'tafsir', zoom: 1, seq: 0, page: null,
  };
  renderLesson();
}
function curEntry() { const L = S.lesson; return L.free ? null : entries(L.grade)[L.idx]; }

function computePortion() {
  const L = S.lesson;
  const list = entries(L.grade);
  L.parts = [];
  if (L.free) { L.segs = null; }
  else {
    const e = list[L.idx];
    L.segs = entrySegs(list, L.idx);
    if (e && SCORED.includes(e.type)) L.parts = weekParts(list, L.idx);
    if (L.part >= 0 && L.parts[L.part]) L.segs = L.parts[L.part].segs;
  }
  if (L.segs) {
    L.keys = Q.keysOf(L.segs);
    L.portion = new Set(L.keys);
    L.pages = Q.pagesOf(L.segs);
  } else {
    L.portion = null; L.keys = [];
    L.pages = [L.freePage];
  }
  L.pi = Math.min(L.pi, L.pages.length - 1);
  if (L.pi < 0) L.pi = 0;
}

function renderLesson() {
  const L = S.lesson;
  computePortion();
  const g = gradeOf(L.grade);
  const e = curEntry();
  const list = entries(L.grade);
  const canScore = !g.noCompetition && e && SCORED.includes(e.type);
  const when = L.free
    ? `<div class="daynav"><label class="muted" for="sura-pick">السورة</label><select id="sura-pick" class="btn sm">${Q.meta.suras.map(s => `<option value="${s.n}">${toAr(s.n)}. ${esc(s.name)}</option>`).join('')}</select>
       <label class="muted" for="page-pick">الصفحة</label><input id="page-pick" class="btn sm num" type="number" min="1" max="604" value="${L.freePage}" style="width:6em"></div>`
    : `<div class="daynav"><button class="btn ghost" data-a="prev" aria-label="اليوم السابق" ${L.idx <= 0 ? 'disabled' : ''}>${arrow('r')}</button>
       <div class="when"><b>${e ? `<span class="type-badge t-${e.type}">${TYPE_NAMES[e.type] || ''}</span>${esc(e.segs && e.segs.length ? Q.segLabel(e.segs) : e.label || '')}` : 'لا توجد خطة'}</b>
       <span>${e ? (e.date ? fmtDate(e.date) : esc((e.day || '') + ' ' + (e.dateText || ''))) : ''}${e && e.date === todayISO() ? ' · اليوم' : ''}</span></div>
       <button class="btn ghost" data-a="next" aria-label="اليوم التالي" ${L.idx >= list.length - 1 ? 'disabled' : ''}>${arrow('l')}</button>
       <button class="btn sm" data-a="today">اليوم</button></div>`;
  app().innerHTML = `<div class="lesson">
    <div class="bar">
      <div class="who">${logoSVG()}<span class="chip">${esc(sectionName(L.sectionId))}</span></div>
      ${when}
      <div class="actions">
        <button class="btn primary" data-a="games">${ico('spark')}التحديات</button>
        ${canScore ? `<button class="btn gold" data-a="errors">${ico('pen')}تسجيل الأخطاء</button>` : ''}
        ${g.noCompetition ? '' : `<button class="btn" data-a="board">${ico('trophy')}الترتيب</button>`}
        <button class="btn" data-a="home">تغيير الصف</button>
      </div>
    </div>
    <div class="stage">
      <div class="reader">
        <div class="tools">
          <select id="reciter" aria-label="القارئ">${RECITERS.map(r => `<option value="${r.id}" ${r.id === Player.reciter ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
          <button class="btn primary" data-a="play" id="play-btn">${ico('play')}استماع</button>
          <button class="btn" data-a="stop" aria-label="إيقاف">${ico('stop')}</button>
          <select id="repeat" aria-label="تكرار الآية"><option value="1">بدون تكرار</option><option value="2">تكرار الآية ×٢</option><option value="3">تكرار الآية ×٣</option></select>
          <span class="sep"></span>
          <button class="btn ${L.tajweed ? 'on' : ''}" data-a="tj">ألوان التجويد</button>
          <button class="btn ${L.gharib ? 'on' : ''}" data-a="gh">الكلمات الصعبة</button>
          ${L.portion ? `<button class="btn ${L.showAll ? 'on' : ''}" data-a="all">الصفحة كاملة</button>` : ''}
          <span class="sep"></span>
          <span class="pens" role="group" aria-label="التظليل المؤقت"><button class="pen y ${L.pen === 'y' ? 'on' : ''}" data-pen="y" aria-label="قلم أصفر"></button><button class="pen g ${L.pen === 'g' ? 'on' : ''}" data-pen="g" aria-label="قلم أخضر"></button><button class="pen p ${L.pen === 'p' ? 'on' : ''}" data-pen="p" aria-label="قلم وردي"></button>
          <button class="btn sm ghost" data-a="clearhl">مسح التظليل</button></span>
          <span class="sep"></span>
          <button class="btn sm" data-a="zout" aria-label="تصغير">−</button><button class="btn sm" data-a="zin" aria-label="تكبير">+</button>
          <button class="btn sm" data-a="fs">ملء الشاشة</button>
        </div>
        <div class="page-wrap" id="page-wrap">
          <div class="segtabs" id="segtabs"></div>
          <div id="mushaf-host" style="display:grid;justify-items:center"></div>
          <div class="pagenav" id="pagenav"></div>
        </div>
      </div>
      <aside class="side">
        <div class="tabs" role="tablist">${[['tafsir', 'التفسير'], ['rules', 'الأحكام'], ['meanings', 'معاني الكلمات'], ['lessons', 'دروس وعبر'], ['story', 'قصة وسبب نزول']].map(([k, n]) => `<button class="tab ${L.tab === k ? 'on' : ''}" data-tab="${k}" role="tab">${n}</button>`).join('')}</div>
        <div class="panel" id="panel"></div>
      </aside>
    </div></div>`;
  wireLesson();
  if (L.free) { $('#sura-pick').value = String(firstSuraOnPage(L.freePage)); }
  $('#repeat').value = String(Player.repeat);
  renderSegTabs();
  showPage();
}
function firstSuraOnPage(p) { let n = 1; Q.meta.suras.forEach(s => { if (s.page <= p) n = s.n; }); return n; }
function arrow(dir) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${dir === 'r' ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function ico(n) {
  const p = {
    play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
    pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
    spark: '<path d="M12 2l2.2 6.3L20 10l-5.8 1.7L12 18l-2.2-6.3L4 10l5.8-1.7z" fill="currentColor"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    trophy: '<path d="M7 4h10v4a5 5 0 01-10 0zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4M12 13v4M8 20h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  }[n];
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
}

function wireLesson() {
  const L = S.lesson;
  const act = {
    prev() { if (L.idx > 0) { L.idx--; resetEntry(); } },
    next() { if (L.idx < entries(L.grade).length - 1) { L.idx++; resetEntry(); } },
    today() { L.idx = todayIndex(entries(L.grade)); resetEntry(); },
    games() { openGames(); },
    errors() { openErrors(L.sectionId, curEntry()?.id); },
    board() { board(L.grade); },
    home() { Player.stop(true); home(); },
    play() {
      if (Player.playing) { Player.pause(); setPlayBtn(false); return; }
      if (Player.audio && Player.queue.length && Player.audio.paused && Player.idx >= 0) { Player.resume(); setPlayBtn(true); return; }
      const keys = L.portion ? L.keys : pageKeys();
      const start = L.sel && keys.includes(L.sel) ? L.sel : keys[0];
      Player.play(keys, start); setPlayBtn(true);
    },
    stop() { Player.stop(); },
    tj() { L.tajweed = !L.tajweed; store.set('iqra-tj', L.tajweed); renderLessonKeepPage(); },
    gh() { L.gharib = !L.gharib; store.set('iqra-gh', L.gharib); $('[data-a=gh]').classList.toggle('on', L.gharib); L.page && L.page.el.classList.toggle('no-gh', !L.gharib); },
    all() { L.showAll = !L.showAll; $('[data-a=all]').classList.toggle('on', L.showAll); L.page && L.page.el.classList.toggle('showall', L.showAll); },
    clearhl() { L.hl = {}; document.querySelectorAll('.hl-y,.hl-g,.hl-p').forEach(x => x.classList.remove('hl-y', 'hl-g', 'hl-p')); },
    zin() { L.zoom = Math.min(2.2, L.zoom + 0.15); fit(); },
    zout() { L.zoom = Math.max(0.6, L.zoom - 0.15); fit(); },
    fs() { const el = document.documentElement; (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen())?.catch?.(() => toast('ملء الشاشة غير متاح هنا')); },
  };
  app().querySelectorAll('[data-a]').forEach(b => { if (act[b.dataset.a]) b.onclick = act[b.dataset.a]; });
  app().querySelectorAll('[data-pen]').forEach(b => b.onclick = () => {
    L.pen = L.pen === b.dataset.pen ? null : b.dataset.pen;
    app().querySelectorAll('[data-pen]').forEach(x => x.classList.toggle('on', x.dataset.pen === L.pen));
    L.page && L.page.el.classList.toggle('pen-mode', !!L.pen);
    if (L.pen) toast('اضغطي على الكلمات لتظليلها، واضغطي القلم مرة أخرى لإيقافه');
  });
  app().querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { L.tab = b.dataset.tab; app().querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b)); renderPanel(); });
  $('#reciter').onchange = e => { Player.reciter = e.target.value; store.set('iqra-reciter', Player.reciter); if (Player.playing) { const k = Player.queue[Player.idx]?.key; Player.play(Player.queue.filter(x => !x.basmala).map(x => x.key), k); } };
  $('#repeat').onchange = e => { Player.repeat = +e.target.value; };
  if (L.free) {
    $('#sura-pick').onchange = e => { const s = Q.sura(+e.target.value); L.freePage = s.page; afterFreePage(); };
    $('#page-pick').onchange = e => { L.freePage = Math.max(1, Math.min(604, +e.target.value || 1)); afterFreePage(); };
  }
  Player.onAyah = key => markPlaying(key);
  Player.onStop = () => { markPlaying(null); setPlayBtn(false); };
  window.onresize = () => fit();
}
function afterFreePage() { const L = S.lesson; store.set('iqra-free-' + L.grade, L.freePage); L.pages = [L.freePage]; L.pi = 0; L.hl = {}; L.sel = null; if ($('#page-pick')) $('#page-pick').value = L.freePage; if ($('#sura-pick')) $('#sura-pick').value = firstSuraOnPage(L.freePage); showPage(); }
function resetEntry() { Player.stop(true); const L = S.lesson; L.part = -1; L.pi = 0; L.hl = {}; L.sel = null; renderLesson(); }
function renderLessonKeepPage() { const L = S.lesson; const pi = L.pi; renderLesson(); L.pi = pi; }
function pageKeys() { const L = S.lesson; return L.page ? [...new Set(L.page.tokens.filter(t => t.kind === 'w').map(t => t.key))] : []; }
function setPlayBtn(on) { const b = $('#play-btn'); if (b) b.innerHTML = on ? ico('pause') + 'إيقاف مؤقت' : ico('play') + 'استماع'; }

function renderSegTabs() {
  const L = S.lesson;
  const host = $('#segtabs');
  if (!L.parts || !L.parts.length) { host.innerHTML = ''; return; }
  host.innerHTML = `<button class="btn sm ${L.part < 0 ? 'on' : ''}" data-p="-1">صفحات الأسبوع كاملة</button>` +
    L.parts.map((p, i) => `<button class="btn sm ${L.part === i ? 'on' : ''}" data-p="${i}">${esc(WEEKDAYS[parseISO(p.date)?.getDay()] || p.day || '')}: ${esc(Q.segLabel(p.segs))}</button>`).join('');
  host.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { L.part = +b.dataset.p; L.pi = 0; computePortion(); renderSegTabs(); showPage(); });
}

async function showPage() {
  const L = S.lesson;
  const seq = ++L.seq;
  const host = $('#mushaf-host');
  const pageNo = L.pages[L.pi];
  const nav = $('#pagenav');
  if (!pageNo) {
    const e = curEntry();
    host.innerHTML = `<div class="card" style="max-width:520px;text-align:center"><h3>${esc(e ? (TYPE_NAMES[e.type] || '') : '')}</h3><p>${esc(e ? (e.label || '') : 'لا توجد خطة لهذا الصف بعد.')}</p>
      <p class="muted">لا توجد صفحة محددة لهذا اليوم. يمكنكِ الانتقال إلى يوم آخر من الأسهم في الأعلى.</p></div>`;
    nav.innerHTML = ''; L.page = null; renderPanel(); return;
  }
  host.innerHTML = '<div class="muted" style="padding:40px">جارٍ تحميل الصفحة…</div>';
  let page;
  try { page = await renderMushafPage(document.createElement('div'), pageNo, { portion: L.portion, tajweed: L.tajweed }); }
  catch (e) { host.innerHTML = '<div class="card">تعذّر تحميل صفحة المصحف. تأكدي من الاتصال ثم أعيدي المحاولة.</div>'; return; }
  if (seq !== L.seq || !host.isConnected) return;
  host.replaceChildren(page.el);
  L.page = page;
  page.el.classList.toggle('no-gh', !L.gharib);
  page.el.classList.toggle('showall', L.showAll);
  page.el.classList.toggle('pen-mode', !!L.pen);
  const hl = L.hl[pageNo] || {};
  Object.entries(hl).forEach(([t, c]) => page.tokens[t]?.el.classList.add('hl-' + c));
  if (!L.sel || !page.tokens.some(t => t.key === L.sel)) L.sel = (L.keys.find(k => page.tokens.some(t => t.key === k))) || page.tokens.find(t => t.kind === 'w')?.key || null;
  markSelected();
  page.el.onclick = ev => onWordClick(ev);
  if (L.pages.length > 1 || L.free) {
    const prevOk = L.free ? L.freePage > 1 : L.pi > 0;
    const nextOk = L.free ? L.freePage < 604 : L.pi < L.pages.length - 1;
    nav.innerHTML = `<button class="btn" data-n="-1" ${prevOk ? '' : 'disabled'}>${arrow('r')}الصفحة السابقة</button><span class="pg num">${L.free ? 'صفحة ' + toAr(L.freePage) : `صفحة ${toAr(L.pi + 1)} من ${toAr(L.pages.length)}`}</span><button class="btn" data-n="1" ${nextOk ? '' : 'disabled'}>الصفحة التالية${arrow('l')}</button>`;
    nav.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
      if (L.free) { L.freePage += +b.dataset.n; afterFreePage(); }
      else { L.pi += +b.dataset.n; showPage(); }
    });
  } else nav.innerHTML = '';
  fit();
  renderPanel();
  if (Player.playing) markPlaying(Player.queue[Player.idx]?.key);
}
function fit() {
  const L = S.lesson; if (!L || !L.page) return;
  const wrap = $('#page-wrap');
  if (!wrap || !L.page.el.isConnected) return;
  const availW = wrap.clientWidth - 40;
  const narrow = window.innerWidth <= 1000;
  const availH = narrow ? 99999 : wrap.clientHeight - ($('#segtabs').offsetHeight + $('#pagenav').offsetHeight + 60);
  let w = Math.max(280, Math.min(availW, availH / 1.62) * L.zoom);
  fitMushaf(L.page.el, w);
  const h = L.page.el.offsetHeight;
  if (L.zoom === 1 && !narrow && h > availH + 4) { w = Math.max(280, w * availH / h); fitMushaf(L.page.el, w); }
}
function markSelected() {
  const L = S.lesson; if (!L.page) return;
  L.page.tokens.forEach(t => t.el.classList.toggle('sel-ayah', t.key === L.sel && t.kind !== 'hz'));
}
function markPlaying(key) {
  const L = S.lesson; if (!L || !L.page) return;
  L.page.tokens.forEach(t => t.el.classList.toggle('playing', !!key && t.key === key));
  if (key && !L.page.tokens.some(t => t.key === key) && !L.free) {
    const [s, a] = key.split(':').map(Number); const p = Q.pageOf(s, a); const i = L.pages.indexOf(p);
    if (i >= 0 && i !== L.pi) { L.pi = i; showPage(); }
  }
}
function onWordClick(ev) {
  const L = S.lesson;
  const el = ev.target.closest('.w, .end, .hz');
  if (!el || el.classList.contains('bs')) return;
  const tok = L.page.tokens[+el.dataset.t];
  if (!tok) return;
  if (L.pen) {
    const pg = L.pages[L.pi]; const map = L.hl[pg] = L.hl[pg] || {};
    ['hl-y', 'hl-g', 'hl-p'].forEach(c => el.classList.remove(c));
    if (map[el.dataset.t] === L.pen) delete map[el.dataset.t];
    else { map[el.dataset.t] = L.pen; el.classList.add('hl-' + L.pen); }
    return;
  }
  L.sel = tok.key; markSelected(); renderPanel();
  wordPopover(tok, el);
}
async function wordPopover(tok, el) {
  closePop();
  const info = await Q.ayah(tok.key);
  const [s, a] = tok.key.split(':').map(Number);
  let body = '';
  if (tok.kind === 'w') {
    const idx = +tok.el.dataset.i;
    const gs = (info.g || []).filter(g => g.w.includes(idx));
    const rules = wordRules(tok.j).filter(r => r > 2);
    body += `<div class="qw">${tajweedHTML(tok.text, tok.j)}</div>`;
    if (gs.length) body += gs.map(g => `<div><b style="color:var(--gharib)">المعنى:</b> ${esc(cleanMeaning(g.m))}</div>`).join('');
    if (rules.length) body += `<div><b>الأحكام:</b> ${rules.map(r => `<span style="color:${RULES[r].color};font-weight:700">${RULES[r].name}</span>`).join('، ')}</div>`;
    if (!gs.length && !rules.length) body += `<div class="muted">لا يوجد حكم أو معنى خاص لهذه الكلمة.</div>`;
  } else body += `<div><b>سورة ${esc(Q.suraName(s))} – الآية ${toAr(a)}</b></div>`;
  body += `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm primary" data-pa>${ico('play')}استماع للآية</button><button class="btn sm" data-pt>تفسير الآية</button></div>`;
  const pop = document.createElement('div');
  pop.className = 'pop'; pop.id = 'pop';
  pop.innerHTML = `<button class="btn sm ghost close" aria-label="إغلاق">✕</button>${body}`;
  document.body.appendChild(pop);
  const r = el.getBoundingClientRect(), pr = pop.getBoundingClientRect();
  let top = r.bottom + 8; if (top + pr.height > innerHeight - 8) top = Math.max(8, r.top - pr.height - 8);
  let left = r.left + r.width / 2 - pr.width / 2; left = Math.max(8, Math.min(innerWidth - pr.width - 8, left));
  pop.style.top = top + 'px'; pop.style.left = left + 'px';
  pop.querySelector('.close').onclick = closePop;
  pop.querySelector('[data-pa]').onclick = () => { Player.play([tok.key], tok.key); setPlayBtn(true); closePop(); };
  pop.querySelector('[data-pt]').onclick = () => { S.lesson.tab = 'tafsir'; app().querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === 'tafsir')); renderPanel(); closePop(); };
  setTimeout(() => document.addEventListener('pointerdown', outsidePop), 0);
}
function outsidePop(e) { const p = document.getElementById('pop'); if (p && !p.contains(e.target)) closePop(); }
function closePop() { document.getElementById('pop')?.remove(); document.removeEventListener('pointerdown', outsidePop); }

/* ---------- side panel ---------- */
async function renderPanel() {
  const L = S.lesson; const panel = $('#panel'); if (!panel) return;
  const tab = L.tab, seq = L.seq, sel = L.sel;
  const keys = L.portion ? L.keys : pageKeys();
  let html = '';
  try {
    if (tab === 'tafsir') html = await panelTafsir(sel, keys);
    else if (tab === 'rules') html = await panelRules(sel);
    else if (tab === 'meanings') html = await panelMeanings(keys);
    else if (tab === 'lessons') html = await panelLessons(keys);
    else if (tab === 'story') html = panelStory();
  } catch (e) { html = '<p class="muted">تعذّر تحميل المحتوى.</p>'; }
  if (seq !== L.seq || tab !== L.tab || sel !== L.sel) return;
  panel.innerHTML = html;
  panel.querySelectorAll('[data-go-ayah]').forEach(b => b.onclick = () => { L.sel = b.dataset.goAyah; gotoAyah(L.sel); });
  panel.querySelectorAll('[data-flash]').forEach(b => b.onclick = () => flashWords(b.dataset.flash));
  const ed = panel.querySelector('[data-edit-note]');
  if (ed) ed.onclick = () => { if (!S.admin) { adminLoginModal(() => renderPanel()); } else editNote(); };
}
function gotoAyah(key) {
  const L = S.lesson; const [s, a] = key.split(':').map(Number); const p = Q.pageOf(s, a);
  if (L.free) { if (p !== L.freePage) { L.freePage = p; afterFreePage(); L.sel = key; return; } }
  else { const i = L.pages.indexOf(p); if (i >= 0 && i !== L.pi) { L.pi = i; L.sel = key; showPage(); return; } }
  markSelected(); renderPanel();
}
async function panelTafsir(sel, keys) {
  if (!sel) return '<p class="muted">اضغطي على أي آية في المصحف لعرض تفسيرها.</p>';
  const [s, a] = sel.split(':').map(Number);
  const info = await Q.ayah(sel);
  const words = await Q.ayahWords(sel);
  const i = keys.indexOf(sel);
  return `<h3>سورة ${esc(Q.suraName(s))} – الآية ${toAr(a)}</h3><div class="qref">${esc(Q.ayahText(words))}</div>
    <p style="margin:0">${esc(info.f || '')}</p><p class="muted" style="margin:0;font-size:.85rem">المصدر: التفسير الميسّر – مجمع الملك فهد لطباعة المصحف الشريف</p>
    <div style="display:flex;justify-content:space-between;gap:8px"><button class="btn sm" ${i > 0 ? `data-go-ayah="${keys[i - 1]}"` : 'disabled'}>${arrow('r')}الآية السابقة</button><button class="btn sm" ${i >= 0 && i < keys.length - 1 ? `data-go-ayah="${keys[i + 1]}"` : 'disabled'}>الآية التالية${arrow('l')}</button></div>`;
}
async function panelRules(sel) {
  const legend = `<div class="legend">${TEACH_RULES.filter(r => r > 2).map(r => `<span><i style="background:${RULES[r].color}"></i>${RULES[r].name}</span>`).join('')}<span><i style="background:#9a9a9a"></i>لا يُنطق</span></div>`;
  if (!sel) return '<p class="muted">اضغطي على أي آية لعرض أحكامها.</p>' + legend;
  const [s, a] = sel.split(':').map(Number);
  const words = await Q.ayahWords(sel);
  const by = {};
  words.forEach(w => wordRules(w.j).forEach(r => { (by[r] = by[r] || []).push(w); }));
  const order = RULE_PRIORITY.filter(r => by[r]);
  const rows = order.map(r => `<div class="rule-row"><span class="rule-dot" style="background:${RULES[r].color}"></span><b>${RULES[r].name}</b>
    <div class="words">${by[r].map(w => `<span>${tajweedHTML(w.t, w.j, r)}</span>`).join('')}</div><p>${esc(RULES[r].desc)}</p></div>`).join('');
  return `<h3>أحكام الآية ${toAr(a)} من سورة ${esc(Q.suraName(s))}</h3>${rows || '<p class="muted">لا توجد أحكام مميزة في هذه الآية.</p>'}
    <p class="muted" style="font-size:.85rem;margin:0">فعّلي «ألوان التجويد» لتلوين الأحكام في الصفحة كلها.</p>${legend}`;
}
async function panelMeanings(keys) {
  const rows = [];
  for (const k of keys) {
    const info = await Q.ayah(k); const words = await Q.ayahWords(k);
    (info.g || []).forEach(g => { if (g.w.length) rows.push({ k, w: g.w.map(i => words[i]?.t).filter(Boolean).join(' '), m: cleanMeaning(g.m), idx: g.w }); });
  }
  if (!rows.length) return '<p class="muted">لا توجد كلمات غريبة في هذا المقطع.</p>';
  return `<h3>ركّزي على هذه الكلمات</h3><p class="muted" style="margin:0">اضغطي على الكلمة لتظهر في المصحف.</p>` + rows.map(r => `<div class="mean-row" data-flash="${r.k}|${r.idx.join(',')}"><span class="qw">${esc(r.w)}</span><span>${esc(r.m)}</span><span class="muted" style="font-size:.8rem">${esc(Q.suraName(+r.k.split(':')[0]))} ${toAr(r.k.split(':')[1])}</span></div>`).join('') +
    `<p class="muted" style="font-size:.85rem;margin:0">المصدر: كتاب «الميسّر في غريب القرآن الكريم»</p>`;
}
function flashWords(spec) {
  const L = S.lesson; const [key, idxs] = spec.split('|'); const set = idxs.split(',');
  const [s, a] = key.split(':').map(Number); const p = Q.pageOf(s, a);
  const run = () => L.page.tokens.forEach(t => { if (t.key === key && t.kind === 'w' && set.includes(t.el.dataset.i)) { t.el.classList.remove('flash'); void t.el.offsetWidth; t.el.classList.add('flash'); t.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } });
  if (L.pages[L.pi] === p || (L.free && L.freePage === p)) run();
  else { const i = L.pages.indexOf(p); if (i >= 0) { L.pi = i; showPage().then(run); } }
}
async function panelLessons(keys) {
  const seen = new Set(); let tw = [], am = [];
  for (const k of keys) { const info = await Q.ayah(k); if (info.tad && !seen.has(info.d)) { seen.add(info.d); tw = tw.concat(info.tad.tawjihat || []); am = am.concat(info.tad.amal || []); } }
  tw = [...new Set(tw)]; am = [...new Set(am)];
  if (!tw.length && !am.length) return '<p class="muted">لا توجد دروس محفوظة لهذا المقطع.</p>';
  return `${tw.length ? `<h3>دروس وتوجيهات</h3><ol class="lesson-list">${tw.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
    ${am.length ? `<h3>كيف نعمل بالآيات؟</h3><ol class="lesson-list">${am.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
    <p class="muted" style="font-size:.85rem;margin:0">المصدر: كتاب «تدبّر وعمل» – مركز تدبّر. الدروس مكتوبة لصفحات المصحف كاملة، فقد تشمل آيات قبل مقطع اليوم أو بعده.</p>`;
}
function panelStory() {
  const L = S.lesson; const p = L.pages[L.pi];
  const text = S.notes['p' + p];
  return `<h3>قصة الصفحة ${toAr(p || '')} وسبب النزول</h3>${text ? `<div class="note-box">${esc(text)}</div>` : '<p class="muted">لم تُضف قصة أو سبب نزول لهذه الصفحة بعد.</p>'}
    <button class="btn sm" data-edit-note>${S.admin ? (text ? 'تعديل النص' : 'إضافة قصة أو سبب نزول') : 'إضافة (للمديرة)'}</button>`;
}
function editNote() {
  const L = S.lesson; const p = L.pages[L.pi]; const key = 'p' + p;
  const panel = $('#panel');
  panel.innerHTML = `<h3>قصة الصفحة ${toAr(p)} وسبب النزول</h3><div class="field"><label for="note-ta">اكتبي القصة أو سبب النزول من مصدر موثوق، واذكري المصدر في آخر النص.</label><textarea id="note-ta">${esc(S.notes[key] || '')}</textarea></div>
    <div style="display:flex;gap:8px"><button class="btn primary" data-s>حفظ</button><button class="btn" data-c>إلغاء</button></div>`;
  panel.querySelector('[data-c]').onclick = () => renderPanel();
  panel.querySelector('[data-s]').onclick = async () => {
    const text = $('#note-ta').value.trim();
    try { await API.call('saveNote', { cred: S.admin, key, text }); if (text) S.notes[key] = text; else delete S.notes[key]; toast('تم الحفظ'); renderPanel(); }
    catch (e) { toast(e.userMessage || 'تعذّر الحفظ'); }
  };
}

/* ---------- games ---------- */
async function openGames() {
  const L = S.lesson;
  const keys = L.portion ? L.keys : pageKeys();
  if (!keys.length) { toast('لا توجد آيات لهذا اليوم'); return; }
  Player.stop();
  const ov = document.createElement('div');
  ov.className = 'games';
  ov.innerHTML = `<div class="bar"><div class="who">${logoSVG()}<span class="chip">تحديات ${esc(sectionName(L.sectionId))}</span></div><div class="daynav"><div class="when"><b>${esc(Q.segLabel(L.segs) || 'صفحة ' + toAr(L.pages[L.pi]))}</b></div></div><div class="actions"><button class="btn" data-x>العودة إلى المصحف</button></div></div><div class="gbody"><div class="muted">جارٍ تجهيز التحديات…</div></div>`;
  app().appendChild(ov);
  ov.querySelector('[data-x]').onclick = () => ov.remove();
  const P = await gatherPortion(keys);
  Games.mount(ov.querySelector('.gbody'), P);
}

/* ---------- auth ---------- */
function modal(html, cls = '') {
  closeModal();
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'modal';
  ov.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  ov.addEventListener('pointerdown', e => { if (e.target === ov) closeModal(); });
  document.body.appendChild(ov);
  ov.querySelector('[data-close]')?.addEventListener('click', closeModal);
  return ov;
}
function closeModal() { document.getElementById('modal')?.remove(); }
function adminLoginModal(after) {
  const ov = modal(`<header><h2>دخول المديرة</h2><button class="btn ghost" data-close aria-label="إغلاق">✕</button></header>
    <form id="adm-f" class="field"><label for="adm-pw">كلمة مرور الإدارة</label><input id="adm-pw" type="password" autocomplete="current-password" required>
    <div class="err-msg" id="adm-err" hidden></div><button class="btn primary" type="submit">دخول</button></form>${API.demo ? '<p class="muted" style="margin:0">في وضع التجربة كلمة المرور: 1234</p>' : ''}`);
  $('#adm-pw', ov).focus();
  $('#adm-f', ov).onsubmit = async e => {
    e.preventDefault();
    const cred = { role: 'admin', pw: $('#adm-pw', ov).value };
    try { await API.call('login', { cred }); S.admin = cred; store.sset('iqra-admin', cred); closeModal(); toast('تم تسجيل الدخول'); after && after(); }
    catch (err) { const m = $('#adm-err', ov); m.hidden = false; m.textContent = err.userMessage || 'تعذّر الدخول'; }
  };
}

/* ---------- error registration ---------- */
function openErrors(sectionId, entryId) {
  const grade = sectionId.split('-')[0];
  const t = todayISO();
  const list = scoredEntries(grade).filter(e => !e.date || e.date <= t);
  if (!list.length) { toast('لا توجد أيام قراءة جماعية أو سبر حتى الآن'); return; }
  let chosen = list.find(e => e.id === entryId) || list.find(e => !recOf(sectionId, e.id)) || list[list.length - 1];
  const needLogin = !S.admin && !S.sec[sectionId];
  const ov = modal(`<header><h2>تسجيل أخطاء ${esc(sectionName(sectionId))}</h2><button class="btn ghost" data-close aria-label="إغلاق">✕</button></header>
    <div class="field"><label>اليوم</label><div class="day-list" id="days"></div></div>
    <div class="stepper"><button type="button" data-d="1" aria-label="زيادة">+</button><output id="cnt" class="num">٠</output><button type="button" data-d="-1" aria-label="إنقاص">−</button></div>
    <p class="muted" style="text-align:center;margin:0">عدد أخطاء الشعبة كاملة في هذه القراءة</p>
    ${needLogin ? `<div class="field"><label for="sec-pw">كلمة مرور شعبة ${esc(sectionName(sectionId))}</label><input id="sec-pw" type="password" inputmode="numeric" autocomplete="off">${API.demo ? '<span class="muted">في وضع التجربة: 1111</span>' : ''}</div>` : ''}
    <div class="err-msg" id="e-err" hidden></div>
    <button class="btn primary" id="e-save" style="min-height:54px;font-size:1.15rem">حفظ الأخطاء</button>`);
  let count = 0;
  const cnt = $('#cnt', ov);
  const setCount = n => { count = Math.max(0, Math.min(999, n)); cnt.textContent = toAr(count); };
  const drawDays = () => {
    $('#days', ov).innerHTML = list.slice().reverse().map(e => {
      const r = recOf(sectionId, e.id);
      const st = r ? `<span class="st done">مسجّل: ${toAr(r.count)}</span>` : (e.date && e.date < t ? '<span class="st late">متأخرة</span>' : '<span class="st soon">اليوم</span>');
      return `<button type="button" class="day-opt ${e === chosen ? 'on' : ''}" data-id="${e.id}"><span><b>${TYPE_NAMES[e.type]}</b> · ${esc(e.date ? fmtDate(e.date) : (e.day + ' ' + e.dateText))}</span>${st}</button>`;
    }).join('');
    $('#days', ov).querySelectorAll('[data-id]').forEach(b => b.onclick = () => { chosen = list.find(e => e.id === b.dataset.id); const r = recOf(sectionId, chosen.id); setCount(r ? r.count : 0); drawDays(); });
    $('#days', ov).querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  };
  const r0 = recOf(sectionId, chosen.id); setCount(r0 ? r0.count : 0);
  drawDays();
  ov.querySelectorAll('[data-d]').forEach(b => b.onclick = () => setCount(count + +b.dataset.d));
  $('#e-save', ov).onclick = async () => {
    const cred = S.admin || S.sec[sectionId] || { role: 'section', id: sectionId, pw: $('#sec-pw', ov)?.value || '' };
    const btn = $('#e-save', ov); btn.disabled = true;
    try {
      const res = await API.call('saveError', { cred, rec: { section: sectionId, grade, entryId: chosen.id, date: chosen.date || '', type: chosen.type, count } });
      if (cred.role === 'section') { S.sec[sectionId] = cred; store.sset('iqra-sec', S.sec); }
      const i = S.errors.findIndex(x => x.section === sectionId && x.entryId === chosen.id);
      if (i >= 0) S.errors[i] = res.rec; else S.errors.push(res.rec);
      closeModal(); toast(`تم الحفظ: ${toAr(count)} لشعبة ${sectionName(sectionId)}`);
    } catch (e) { const m = $('#e-err', ov); m.hidden = false; m.textContent = e.userMessage || 'تعذّر الحفظ'; btn.disabled = false; }
  };
}

/* ---------- leaderboard ---------- */
function competitionGrades() { return GRADES.filter(g => !g.noCompetition && scoredEntries(g.id).length); }
function monthsOf(grade) { return [...new Set(scoredEntries(grade).map(e => monthKey(e.date)).filter(Boolean))].sort(); }
function standings(grade, mk) {
  const t = todayISO();
  const ents = scoredEntries(grade).filter(e => monthKey(e.date) === mk);
  const due = ents.filter(e => e.date <= t);
  const rows = LETTERS.map(l => {
    const id = grade + '-' + l;
    const recs = ents.map(e => recOf(id, e.id)).filter(Boolean);
    const total = recs.reduce((a, r) => a + (+r.count || 0), 0);
    return { id, letter: l, total, recorded: recs.length, due: due.length, late: due.filter(e => !recOf(id, e.id)).length };
  });
  const active = rows.filter(r => r.recorded > 0);
  const best = active.length ? Math.min(...active.map(r => r.total)) : null;
  rows.forEach(r => { r.winner = r.recorded > 0 && r.total === best; });
  rows.sort((a, b) => (b.recorded > 0) - (a.recorded > 0) || a.total - b.total || a.letter.localeCompare(b.letter));
  let rank = 0, prev = null;
  rows.forEach((r, i) => { if (r.recorded === 0) { r.rank = null; return; } if (r.total !== prev) { rank = i + 1; prev = r.total; } r.rank = rank; });
  return { rows, dueCount: due.length, entries: ents };
}
function board(grade) {
  Player.stop(true);
  const cg = competitionGrades();
  if (!cg.length) { frame('<h2>لوحة الترتيب</h2><p class="muted">لا توجد خطط فيها أيام قراءة جماعية أو سبر بعد.</p>'); return; }
  grade = grade && cg.some(g => g.id === grade) ? grade : cg[0].id;
  const months = monthsOf(grade);
  const cur = monthKey(todayISO());
  let mk = months.includes(cur) ? cur : months.filter(m => m <= cur).pop() || months[0];
  const draw = () => {
    const st = standings(grade, mk);
    const max = Math.max(1, ...st.rows.map(r => r.total));
    const winners = st.rows.filter(r => r.winner);
    const late = st.rows.filter(r => r.late > 0);
    $('#board-body').innerHTML = `
      ${late.length ? `<div class="warn-box">شعب لم تُسجّل كل أيامها بعد: ${late.map(r => `${r.letter} (${toAr(r.late)})`).join('، ')}. الترتيب يُحسب من الأيام المسجّلة.</div>` : ''}
      <div class="bars">${st.rows.map(r => `<div class="barrow ${r.winner ? 'best' : ''}"><b class="rank">${r.letter}</b><div class="track"><div class="fill" style="width:${r.recorded ? Math.max(3, r.total / max * 100) : 0}%"></div></div><span class="num">${r.recorded ? toAr(r.total) : '—'}</span></div>`).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th>الترتيب</th><th>الشعبة</th><th>مجموع الأخطاء</th><th>الأيام المسجّلة</th><th>الحالة</th><th></th></tr></thead><tbody>
      ${st.rows.map(r => `<tr class="${r.winner ? 'winner' : ''}"><td class="rank">${r.rank ? toAr(r.rank) : '—'}</td><td><b>${esc(gradeOf(grade).name)} ${r.letter}</b></td><td class="num">${r.recorded ? toAr(r.total) : '—'}</td>
        <td class="num">${toAr(r.recorded)} من ${toAr(r.due)}</td><td>${r.late ? `<span class="st late">متأخرة ${toAr(r.late)}</span>` : r.recorded ? '<span class="st done">مكتملة</span>' : '<span class="st soon">لا تسجيل</span>'}</td>
        <td>${r.winner ? `<button class="btn sm gold" data-cert="${r.letter}">${ico('trophy')}الشهادة</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>
      ${winners.length ? `<p class="muted" style="margin:0">الأقل أخطاءً في ${monthName(mk)}: ${winners.map(w => 'شعبة ' + w.letter).join(' و')} ${winners.length > 1 ? '(تعادل، تُمنح الشهادة للشعبتين)' : ''}</p>` : '<p class="muted" style="margin:0">لم تُسجّل أخطاء لهذا الشهر بعد.</p>'}`;
    $('#board-body').querySelectorAll('[data-cert]').forEach(b => b.onclick = () => {
      const r = st.rows.find(x => x.letter === b.dataset.cert);
      certificate({ grade, letter: r.letter, mk, total: r.total });
    });
  };
  const allWinners = () => competitionGrades().map(g => {
    const st = standings(g.id, mk); const w = st.rows.filter(r => r.winner);
    return `<div class="pod"><span class="muted">${esc(g.name)}</span><b>${w.length ? w.map(x => 'شعبة ' + x.letter).join(' و') : '—'}</b><span class="num">${w.length ? toAr(w[0].total) + ' أخطاء' : 'لا تسجيل بعد'}</span></div>`;
  }).join('');
  app().innerHTML = `<div class="page-screen"><div class="bar"><div class="who">${logoSVG()}<span class="chip">لوحة الترتيب الشهرية</span></div><div class="actions" style="margin-inline-start:auto">
    ${S.lesson ? '<button class="btn" data-back>العودة إلى المصحف</button>' : ''}<button class="btn" data-home>الرئيسية</button></div></div>
    <div class="content"><div class="filters"><div class="field"><label for="b-grade">الصف</label><select id="b-grade">${cg.map(g => `<option value="${g.id}" ${g.id === grade ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="b-month">الشهر</label><select id="b-month">${months.map(m => `<option value="${m}" ${m === mk ? 'selected' : ''}>${monthName(m)}</option>`).join('')}</select></div></div>
    <h2 id="b-title"></h2><div id="board-body" style="display:grid;gap:16px"></div>
    <h2>الأوائل في كل الصفوف</h2><div class="podium" id="podium"></div></div></div>`;
  const title = () => { $('#b-title').textContent = `شعب ${gradeOf(grade).name} – ${monthName(mk)}`; $('#podium').innerHTML = allWinners(); };
  $('#b-grade').onchange = e => board(e.target.value);
  $('#b-month').onchange = e => { mk = e.target.value; title(); draw(); };
  app().querySelector('[data-home]').onclick = home;
  const bk = app().querySelector('[data-back]'); if (bk) bk.onclick = () => openLesson(S.lesson.sectionId);
  title(); draw();
}

/* ---------- certificate ---------- */
function errWords(n) {
  if (n === 0) return 'دون أي خطأ';
  if (n === 1) return 'بخطأ واحد فقط';
  if (n === 2) return 'بخطأين فقط';
  if (n <= 10) return `بمجموع ${toAr(n)} أخطاء`;
  return `بمجموع ${toAr(n)} خطأً`;
}
async function certificate({ grade, letter, mk, total }) {
  const words = await Q.ayahWords('73:4').catch(() => []);
  const verse = words.slice(-3).map(w => w.t).join(' ');
  const corner = `<svg class="corner CL" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#b58a2e" stroke-width="2"><path d="M5 5h60M5 5v60"/><path d="M14 14h36M14 14v36"/><path d="M30 30l10-10 10 10-10 10z" fill="#0e5a4b" stroke="none"/><circle cx="30" cy="30" r="16"/></g></svg>`;
  const ov = document.createElement('div');
  ov.className = 'cert-screen';
  ov.innerHTML = `<div class="cert-actions"><button class="btn primary" data-print>طباعة الشهادة</button><button class="btn" data-x>إغلاق</button></div>
    <div class="cert">${['tl', 'tr', 'bl', 'br'].map(c => corner.replace('CL', c)).join('')}
      <div class="c-brand">اقرأ وارتقِ</div>
      <div class="c-title">شهادة تكريم</div>
      <div class="c-body">تُمنح هذه الشهادة لطالبات</div>
      <div class="c-name">الصف ${esc(gradeOf(grade).name)} – الشعبة ${letter}</div>
      <div class="c-body">تقديراً لتميّزهنّ في حصة القرآن الكريم خلال شهر ${monthName(mk)}، إذ كُنّ الأقل أخطاءً بين شعب الصف ${errWords(total)}.</div>
      ${verse ? `<div class="c-verse">﴿${esc(verse)}﴾</div>` : ''}
      <div class="c-sign"><div><span>معلمة الشعبة</span><i></i></div><div><span>مديرة المدرسة</span><i></i></div></div>
    </div>`;
  app().appendChild(ov);
  ov.querySelector('[data-x]').onclick = () => ov.remove();
  ov.querySelector('[data-print]').onclick = () => { window.print(); };
}

/* ---------- admin ---------- */
function admin(tab = 'plans') {
  Player.stop(true);
  if (!S.admin) { home(); adminLoginModal(() => admin(tab)); return; }
  app().innerHTML = `<div class="page-screen"><div class="bar"><div class="who">${logoSVG()}<span class="chip">لوحة الإدارة</span></div>
    <div class="actions" style="margin-inline-start:auto"><button class="btn" data-home>الرئيسية</button><button class="btn danger" data-out>تسجيل الخروج</button></div></div>
    <div class="content"><div class="admin-tabs">${[['plans', 'الخطط'], ['errors', 'الأخطاء المسجّلة'], ['pw', 'كلمات المرور'], ['notes', 'القصص وأسباب النزول'], ['settings', 'الإعدادات']].map(([k, n]) => `<button class="btn ${k === tab ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}</div><div id="adm"></div></div></div>`;
  app().querySelector('[data-home]').onclick = home;
  app().querySelector('[data-out]').onclick = () => { S.admin = null; store.sset('iqra-admin', null); home(); };
  app().querySelectorAll('[data-t]').forEach(b => b.onclick = () => admin(b.dataset.t));
  ({ plans: adminPlans, errors: adminErrors, pw: adminPw, notes: adminNotes, settings: adminSettings })[tab]();
}

function dayName(iso) { const d = parseISO(iso); return d ? WEEKDAYS[d.getDay()] : ''; }
function validateEntry(e) {
  const issues = [];
  if (!e.date) issues.push('التاريخ غير محدد');
  if (['new', 'review'].includes(e.type)) {
    if (!e.segs || !e.segs.length) issues.push('لم يُحدَّد المقطع');
    else if (!e.segs.every(([s, a1, a2]) => s >= 1 && s <= 114 && a1 >= 1 && a1 <= a2 && a2 <= Q.ayahCount(s))) issues.push('أرقام الآيات تحتاج مراجعة');
  }
  return issues.join('، ');
}
function adminPlans() {
  const host = $('#adm');
  let grade = store.get('iqra-adm-grade', '6');
  let onlyIssues = false;
  let list = JSON.parse(JSON.stringify(entries(grade)));
  let dirty = false;
  const suraOpts = Q.meta.suras.map(s => `<option value="${s.n}">${toAr(s.n)}. ${esc(s.name)}</option>`).join('');
  const draw = () => {
    const g = gradeOf(grade);
    const rows = list.map((e, i) => ({ e, i })).filter(({ e }) => !onlyIssues || e.issue);
    host.innerHTML = `<div class="filters"><div class="field"><label for="p-grade">الصف</label><select id="p-grade">${GRADES.map(x => `<option value="${x.id}" ${x.id === grade ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <label style="display:flex;gap:6px;align-items:center;min-height:46px"><input type="checkbox" id="p-only" ${onlyIssues ? 'checked' : ''}> الأيام التي تحتاج مراجعة فقط (${toAr(list.filter(e => e.issue).length)})</label>
      <div style="display:flex;gap:8px;margin-inline-start:auto;flex-wrap:wrap"><button class="btn" data-add>إضافة يوم في آخر الخطة</button>${S.seed[grade] ? '<button class="btn" data-reset>استرجاع الخطة الأصلية</button>' : ''}<button class="btn primary" data-save>حفظ الخطة</button></div></div>
      ${planIsSeed(grade) && list.length ? '<div class="warn-box">هذه الخطة الأصلية المستوردة من ملفات الخطط. أي تعديل تحفظينه يُخزَّن في قاعدة البيانات ويظهر لكل الشعب.</div>' : ''}
      ${g.free ? '<div class="warn-box">التوجيهي قراءة حرة وخارج المنافسة، ولا يحتاج خطة.</div>' : ''}
      <div class="table-wrap"><table class="plan-table"><thead><tr><th>#</th><th>التاريخ</th><th>النوع</th><th>المقطع أو الوصف</th><th></th></tr></thead><tbody>
      ${rows.map(({ e, i }) => `<tr data-i="${i}"><td class="num">${toAr(i + 1)}</td>
        <td><input type="date" value="${e.date || ''}" data-f="date"><div class="muted" style="font-size:.8rem">${e.date ? dayName(e.date) : esc(e.day + ' ' + e.dateText)}</div></td>
        <td><select data-f="type">${Object.entries(TYPE_NAMES).map(([k, n]) => `<option value="${k}" ${k === e.type ? 'selected' : ''}>${n}</option>`).join('')}</select></td>
        <td>${['new', 'review'].includes(e.type) ? `<div class="segs">${(e.segs || []).map((s, j) => `<div class="seg" data-j="${j}"><select data-sf="s">${suraOpts.replace(`value="${s[0]}"`, `value="${s[0]}" selected`)}</select> من <input type="number" min="1" value="${s[1]}" data-sf="a1"> إلى <input type="number" min="1" value="${s[2]}" data-sf="a2"><button class="btn sm ghost danger" data-rmseg="${j}" aria-label="حذف المقطع">✕</button></div>`).join('')}
          <button class="btn sm ghost" data-addseg>+ سورة أخرى</button></div>` : `<input type="text" value="${esc(e.label || '')}" data-f="label" style="width:100%">`}
          ${e.issue ? `<div class="issue">${esc(e.issue)}</div>` : ''}</td>
        <td><button class="btn sm ghost" data-ins aria-label="إضافة يوم بعده">+ يوم</button><button class="btn sm ghost danger" data-del>حذف</button></td></tr>`).join('')}
      </tbody></table></div>`;
    $('#p-grade', host).onchange = ev => { if (dirty) toast('لم تُحفظ تعديلات الصف السابق'); grade = ev.target.value; store.set('iqra-adm-grade', grade); list = JSON.parse(JSON.stringify(entries(grade))); dirty = false; draw(); };
    $('#p-only', host).onchange = ev => { onlyIssues = ev.target.checked; draw(); };
    host.querySelector('[data-add]').onclick = () => { list.push(newEntry()); dirty = true; draw(); };
    const rs = host.querySelector('[data-reset]'); if (rs) rs.onclick = () => { list = JSON.parse(JSON.stringify(S.seed[grade])); dirty = true; draw(); toast('استُرجعت الخطة الأصلية. اضغطي حفظ لاعتمادها.'); };
    host.querySelector('[data-save]').onclick = save;
    host.querySelectorAll('tr[data-i]').forEach(tr => {
      const e = list[+tr.dataset.i];
      const upd = () => { e.issue = validateEntry(e); if (!e.issue) delete e.issue; dirty = true; };
      tr.querySelectorAll('[data-f]').forEach(inp => inp.onchange = () => {
        const f = inp.dataset.f;
        if (f === 'date') { e.date = inp.value || null; e.day = dayName(e.date); e.dateText = e.date ? e.date.split('-').reverse().join('/') : ''; }
        else if (f === 'type') { e.type = inp.value; if (['new', 'review'].includes(e.type) && !e.segs) e.segs = [[1, 1, 7]]; if (!['new', 'review'].includes(e.type)) { delete e.segs; e.label = e.label || TYPE_NAMES[e.type]; } }
        else e[f] = inp.value;
        if (e.segs && e.segs.length) e.label = Q.segLabel(e.segs);
        upd(); draw();
      });
      tr.querySelectorAll('.seg').forEach(sg => sg.querySelectorAll('[data-sf]').forEach(inp => inp.onchange = () => {
        const s = e.segs[+sg.dataset.j]; const k = { s: 0, a1: 1, a2: 2 }[inp.dataset.sf]; s[k] = parseInt(inp.value, 10) || 1;
        e.label = Q.segLabel(e.segs); upd(); draw();
      }));
      tr.querySelectorAll('[data-rmseg]').forEach(b => b.onclick = () => { e.segs.splice(+b.dataset.rmseg, 1); e.label = Q.segLabel(e.segs); upd(); draw(); });
      const as = tr.querySelector('[data-addseg]'); if (as) as.onclick = () => { const l = e.segs?.[e.segs.length - 1]; (e.segs = e.segs || []).push([l ? Math.min(114, l[0] + 1) : 1, 1, 1]); upd(); draw(); };
      tr.querySelector('[data-del]').onclick = () => { list.splice(+tr.dataset.i, 1); dirty = true; draw(); };
      tr.querySelector('[data-ins]').onclick = () => { list.splice(+tr.dataset.i + 1, 0, newEntry()); dirty = true; draw(); };
    });
  };
  const newEntry = () => ({ id: grade + '-n' + Date.now().toString(36), day: '', dateText: '', date: null, type: 'new', segs: [[1, 1, 7]], label: Q.segLabel([[1, 1, 7]]), issue: 'التاريخ غير محدد' });
  const save = async () => {
    try { await API.call('savePlan', { cred: S.admin, grade, entries: list }); S.plans[grade] = JSON.parse(JSON.stringify(list)); dirty = false; toast('تم حفظ خطة ' + gradeOf(grade).name); draw(); }
    catch (err) { toast(err.userMessage || 'تعذّر الحفظ'); }
  };
  draw();
}

function adminErrors() {
  const host = $('#adm');
  const cg = competitionGrades();
  let grade = cg[0]?.id || '6';
  let mk = monthKey(todayISO());
  const draw = () => {
    const ents = entries(grade);
    const byId = Object.fromEntries(ents.map(e => [e.id, e]));
    const recs = S.errors.filter(r => r.grade === grade && monthKey(r.date || byId[r.entryId]?.date) === mk)
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.section.localeCompare(b.section));
    const months = [...new Set([...monthsOf(grade), mk])].sort();
    host.innerHTML = `<div class="filters"><div class="field"><label for="x-grade">الصف</label><select id="x-grade">${cg.map(g => `<option value="${g.id}" ${g.id === grade ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="x-month">الشهر</label><select id="x-month">${months.map(m => `<option value="${m}" ${m === mk ? 'selected' : ''}>${monthName(m)}</option>`).join('')}</select></div></div>
      <div class="table-wrap"><table><thead><tr><th>الشعبة</th><th>اليوم</th><th>النوع</th><th>عدد الأخطاء</th><th>وقت التسجيل</th><th></th></tr></thead><tbody>
      ${recs.length ? recs.map(r => `<tr data-id="${r.id}"><td><b>${esc(sectionName(r.section))}</b></td><td>${esc(r.date ? fmtDate(r.date) : '')}</td><td>${TYPE_NAMES[r.type] || ''}</td>
        <td><input type="number" min="0" value="${r.count}" style="width:6em;min-height:38px;border:1px solid var(--line);border-radius:8px;padding:0 8px;background:var(--surface)"> <button class="btn sm" data-s>حفظ</button></td>
        <td class="muted num">${r.at ? new Date(r.at).toLocaleString('ar-JO', { dateStyle: 'short', timeStyle: 'short' }) : ''}</td><td><button class="btn sm ghost danger" data-d>حذف</button></td></tr>`).join('') : '<tr><td colspan="6" class="muted">لا توجد أخطاء مسجّلة لهذا الشهر.</td></tr>'}</tbody></table></div>`;
    $('#x-grade', host).onchange = e => { grade = e.target.value; draw(); };
    $('#x-month', host).onchange = e => { mk = e.target.value; draw(); };
    host.querySelectorAll('tr[data-id]').forEach(tr => {
      const r = S.errors.find(x => x.id === tr.dataset.id);
      tr.querySelector('[data-s]').onclick = async () => {
        const n = +tr.querySelector('input').value;
        try { const res = await API.call('saveError', { cred: S.admin, rec: { ...r, count: n } }); Object.assign(r, res.rec); toast('تم التعديل'); draw(); } catch (e) { toast(e.userMessage || 'تعذّر الحفظ'); }
      };
      tr.querySelector('[data-d]').onclick = () => confirmBox(`حذف أخطاء ${sectionName(r.section)} ليوم ${fmtDate(r.date)}؟`, async () => {
        try { await API.call('deleteError', { cred: S.admin, id: r.id }); S.errors = S.errors.filter(x => x.id !== r.id); toast('تم الحذف'); draw(); } catch (e) { toast(e.userMessage || 'تعذّر الحذف'); }
      });
    });
  };
  draw();
}
function confirmBox(msg, onYes) {
  const ov = modal(`<header><h2>تأكيد</h2></header><p style="margin:0">${esc(msg)}</p><div style="display:flex;gap:8px"><button class="btn danger" data-y>نعم، احذفي</button><button class="btn" data-close>إلغاء</button></div>`);
  ov.querySelector('[data-y]').onclick = () => { closeModal(); onYes(); };
}

async function adminPw() {
  const host = $('#adm');
  host.innerHTML = '<p class="muted">جارٍ التحميل…</p>';
  let pw;
  try { pw = (await API.call('passwords', { cred: S.admin })).pw; } catch (e) { host.innerHTML = `<p class="err-msg">${esc(e.userMessage || 'تعذّر التحميل')}</p>`; return; }
  host.innerHTML = `<p class="muted" style="margin:0">لكل شعبة حساب واحد تستخدمه معلمتها لتسجيل الأخطاء. إذا تغيّرت المعلمة يكفي إعطاء كلمة المرور للمعلمة الجديدة أو تغييرها.</p>
    <div class="table-wrap"><table><thead><tr><th>الحساب</th><th>كلمة المرور الحالية</th><th>كلمة مرور جديدة</th><th></th></tr></thead><tbody>
    <tr data-id="admin"><td><b>المديرة</b></td><td class="pw">${esc(pw.admin)}</td><td><input type="text" style="min-height:38px;border:1px solid var(--line);border-radius:8px;padding:0 8px;background:var(--surface)"></td><td><button class="btn sm">تغيير</button></td></tr>
    ${SECTIONS.map(s => `<tr data-id="${s.id}"><td>${esc(sectionName(s.id))}</td><td class="pw">${esc(pw[s.id] || '')}</td><td><input type="text" inputmode="numeric" style="min-height:38px;border:1px solid var(--line);border-radius:8px;padding:0 8px;background:var(--surface)"></td><td><button class="btn sm">تغيير</button></td></tr>`).join('')}
    </tbody></table></div>`;
  host.querySelectorAll('tr[data-id]').forEach(tr => tr.querySelector('button').onclick = async () => {
    const v = tr.querySelector('input').value.trim();
    try {
      await API.call('setPassword', { cred: S.admin, id: tr.dataset.id, pw: v });
      if (tr.dataset.id === 'admin') { S.admin = { role: 'admin', pw: v }; store.sset('iqra-admin', S.admin); }
      tr.querySelector('.pw').textContent = v; tr.querySelector('input').value = ''; toast('تم تغيير كلمة المرور');
    } catch (e) { toast(e.userMessage || 'تعذّر التغيير'); }
  });
}
function adminNotes() {
  const host = $('#adm');
  const keys = Object.keys(S.notes).sort((a, b) => +a.slice(1) - +b.slice(1));
  host.innerHTML = `<p class="muted" style="margin:0">تُضاف القصة أو سبب النزول من تبويب «قصة وسبب نزول» بجانب صفحة المصحف، أو من هنا برقم الصفحة.</p>
    <div class="filters"><div class="field"><label for="n-page">رقم الصفحة</label><input id="n-page" type="number" min="1" max="604" value="${S.lesson?.pages?.[S.lesson.pi] || 1}"></div><button class="btn primary" data-open>فتح للكتابة</button></div>
    <div id="n-edit"></div>
    <div class="table-wrap"><table><thead><tr><th>الصفحة</th><th>النص</th><th></th></tr></thead><tbody>${keys.length ? keys.map(k => `<tr><td class="num">${toAr(k.slice(1))}</td><td style="white-space:pre-wrap">${esc(S.notes[k].slice(0, 220))}${S.notes[k].length > 220 ? '…' : ''}</td><td><button class="btn sm" data-e="${k}">تعديل</button></td></tr>`).join('') : '<tr><td colspan="3" class="muted">لا توجد قصص مضافة بعد.</td></tr>'}</tbody></table></div>`;
  const edit = key => {
    const p = key.slice(1);
    $('#n-edit').innerHTML = `<div class="card"><b>صفحة ${toAr(p)}</b><textarea id="n-ta">${esc(S.notes[key] || '')}</textarea><div style="display:flex;gap:8px"><button class="btn primary" data-s>حفظ</button><button class="btn" data-c>إغلاق</button></div></div>`;
    $('#n-edit [data-c]').onclick = () => { $('#n-edit').innerHTML = ''; };
    $('#n-edit [data-s]').onclick = async () => {
      const text = $('#n-ta').value.trim();
      try { await API.call('saveNote', { cred: S.admin, key, text }); if (text) S.notes[key] = text; else delete S.notes[key]; toast('تم الحفظ'); adminNotes(); } catch (e) { toast(e.userMessage || 'تعذّر الحفظ'); }
    };
  };
  host.querySelector('[data-open]').onclick = () => edit('p' + Math.max(1, Math.min(604, +$('#n-page').value || 1)));
  host.querySelectorAll('[data-e]').forEach(b => b.onclick = () => edit(b.dataset.e));
}
function adminSettings() {
  const host = $('#adm');
  host.innerHTML = `<div class="card" style="max-width:560px"><div class="field"><label for="st-rec">القارئ الافتراضي لكل الشاشات</label><select id="st-rec">${RECITERS.map(r => `<option value="${r.id}" ${r.id === (S.settings.reciter || RECITERS[0].id) ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
    <button class="btn primary" data-s style="justify-self:start">حفظ</button></div>
    <div class="card" style="max-width:560px"><b>حالة الربط</b><span class="muted">${API.demo ? 'وضع التجربة: البيانات محفوظة على هذا الجهاز فقط. لربط الموقع بقاعدة البيانات المشتركة اتبعي دليل الإعداد وضعي رابط Apps Script في ملف js/config.js.' : 'الموقع مربوط بقاعدة البيانات المشتركة (Google Sheets).'}</span></div>`;
  host.querySelector('[data-s]').onclick = async () => {
    const v = $('#st-rec').value;
    try { await API.call('saveSetting', { cred: S.admin, key: 'reciter', value: v }); S.settings.reciter = v; toast('تم الحفظ'); } catch (e) { toast(e.userMessage || 'تعذّر الحفظ'); }
  };
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePop(); closeModal(); } });
boot();
