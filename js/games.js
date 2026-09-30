/* Class challenges built from the day's portion. */
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];

const GAMES = [
  { id: 'rule', name: 'ما الحكم؟', desc: 'كلمة من الصفحة ملوّن فيها موضع الحكم، اختاري اسمه الصحيح.', color: '#0e5a4b' },
  { id: 'hunt', name: 'صيّاد الأحكام', desc: 'ابحثي في الآيات عن كل المواضع التي فيها الحكم المطلوب.', color: '#a87a22' },
  { id: 'match', name: 'طابِق المعنى', desc: 'صِلي كل كلمة قرآنية بمعناها.', color: '#1f5fd1' },
  { id: 'tf', name: 'صح أم خطأ', desc: 'عبارات عن معاني الكلمات والأحكام، احكمي عليها.', color: '#8a2c0a' },
  { id: 'reflect', name: 'سؤال العبرة', desc: 'سؤال تدبّر للنقاش، ثم نكشف الفائدة من كتب التفسير.', color: '#6b3db3' },
];

async function gatherPortion(keys) {
  const words = [], gharib = [], waqafat = [], seenTad = new Set();
  for (const key of keys) {
    const ws = await Q.ayahWords(key);
    const info = await Q.ayah(key);
    ws.forEach((w, i) => words.push({ key, i, t: w.t, j: w.j }));
    (info.g || []).forEach(g => { if (g.w.length) gharib.push({ key, p: g.p, m: g.m, w: g.w, words: g.w.map(i => ws[i]?.t).filter(Boolean).join(' ') }); });
    if (info.tad && info.d != null && !seenTad.has(info.d)) {
      seenTad.add(info.d);
      (info.tad.waqafat || []).forEach(x => { if (x.q) waqafat.push(x); });
    }
  }
  return { keys, words, gharib, waqafat };
}

function ruleOccurrences(P) {
  const occ = {};
  P.words.forEach(w => wordRules(w.j).forEach(r => { if (TEACH_RULES.includes(r)) (occ[r] = occ[r] || []).push(w); }));
  return occ;
}
function cleanMeaning(m) { return m.replace(/^أي:\s*/, '').replace(/\s+/g, ' ').trim(); }

const Games = {
  host: null, P: null, score: 0,
  mount(host, P, onBack) { this.host = host; this.P = P; this.onBack = onBack; this.menu(); },
  shell(title, sub) {
    this.host.innerHTML = `<div class="game"><h2>${esc(title)}</h2>${sub ? `<div class="prompt">${sub}</div>` : ''}<div class="g-in" style="display:grid;gap:18px;justify-items:center;width:100%"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn" data-a="menu">كل التحديات</button><button class="btn primary" data-a="again">تحدٍّ جديد</button></div></div>`;
    this.host.querySelector('[data-a=menu]').onclick = () => this.menu();
    return this.host.querySelector('.g-in');
  },
  menu() {
    this.host.innerHTML = `<div class="wheel-wrap"><div class="wheel-box"><canvas width="840" height="840" aria-label="عجلة التحدي"></canvas><div class="wheel-pointer"></div></div>
      <button class="btn gold" data-a="spin" style="font-size:1.3rem;min-height:56px;padding-inline:34px">أدِر العجلة</button></div>
      <div class="game-menu">${GAMES.map(g => `<button class="game-card" data-g="${g.id}"><b>${g.name}</b><span>${g.desc}</span></button>`).join('')}</div>`;
    const cv = this.host.querySelector('canvas');
    drawWheel(cv);
    let angle = 0, busy = false;
    this.host.querySelector('[data-a=spin]').onclick = () => {
      if (busy) return; busy = true;
      const target = Math.floor(Math.random() * GAMES.length);
      const seg = 360 / GAMES.length;
      // pointer at top; segment i spans [i*seg, (i+1)*seg) clockwise from top
      const want = 360 - (target * seg + seg / 2);
      angle = angle - (angle % 360) + 360 * 5 + want;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      cv.style.transition = reduce ? 'none' : 'transform 3.6s cubic-bezier(.17,.67,.2,1)';
      cv.style.transform = `rotate(${angle}deg)`;
      setTimeout(() => { busy = false; toast('العجلة اختارت: ' + GAMES[target].name); this.open(GAMES[target].id); }, reduce ? 200 : 3800);
    };
    this.host.querySelectorAll('[data-g]').forEach(b => b.onclick = () => this.open(b.dataset.g));
  },
  open(id) { ({ rule: () => this.rule(), hunt: () => this.hunt(), match: () => this.match(), tf: () => this.tf(), reflect: () => this.reflect() })[id](); },

  rule() {
    const occ = ruleOccurrences(this.P);
    const rules = Object.keys(occ).map(Number);
    if (!rules.length) return this.empty('ما الحكم؟', 'لا توجد أحكام كافية في هذا المقطع.');
    const r = pick(rules);
    const LET = /[\u0621-\u064A\u0671]/;
    const visible = occ[r].filter(w => w.j.some(([s, e, rr]) => rr.includes(r) && LET.test(w.t.slice(s, e))));
    const w = pick(visible.length ? visible : occ[r]);
    const present = rules.filter(x => x !== r && !sameFamily(x, r));
    const others = shuffle(TEACH_RULES.filter(x => x !== r && !sameFamily(x, r)));
    const opts = shuffle([r, ...shuffle(present).slice(0, 2), ...others].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4));
    const box = this.shell('ما الحكم؟', 'ما حكم التجويد في الموضع الملوّن؟');
    box.innerHTML = `<div class="big-word">${tajweedHTML(w.t, w.j, r)}</div><div class="muted">${esc(Q.suraName(+w.key.split(':')[0]))} – الآية ${toAr(w.key.split(':')[1])}</div>
      <div class="opts">${opts.map(o => `<button class="opt" data-r="${o}">${RULES[o].name}</button>`).join('')}</div><div class="explain" hidden></div>`;
    box.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      if (box.dataset.done) return; box.dataset.done = 1;
      const ok = +b.dataset.r === r;
      b.classList.add(ok ? 'right' : 'wrong');
      box.querySelector(`[data-r="${r}"]`).classList.add('right');
      const ex = box.querySelector('.explain'); ex.hidden = false;
      ex.innerHTML = `<b>${ok ? 'أحسنتِ!' : 'الإجابة الصحيحة:'} ${RULES[r].name}</b><br>${esc(RULES[r].desc)}`;
    });
    this.host.querySelector('[data-a=again]').onclick = () => this.rule();
  },

  hunt() {
    const occ = ruleOccurrences(this.P);
    const cands = Object.keys(occ).map(Number).filter(r => occ[r].length >= 2 && r !== 1);
    if (!cands.length) return this.empty('صيّاد الأحكام', 'لا توجد مواضع كافية في هذا المقطع.');
    const r = pick(cands);
    const targets = new Set(occ[r].map(w => w.key + '/' + w.i));
    const box = this.shell('صيّاد الأحكام', `ابحثي عن مواضع <b style="color:${RULES[r].color}">${RULES[r].name}</b> واضغطي عليها`);
    let found = 0, missed = 0;
    let html = '';
    let last = null;
    this.P.words.forEach(w => {
      if (last && last !== w.key) html += ` <span class="end">﴿${toAr(last.split(':')[1])}﴾</span> `;
      html += `<span class="w" data-id="${w.key}/${w.i}">${esc(w.t)}</span> `;
      last = w.key;
    });
    if (last) html += `<span class="end">﴿${toAr(last.split(':')[1])}﴾</span>`;
    box.innerHTML = `<div class="score"><span data-f>٠</span> من ${toAr(targets.size)}</div><div class="hunt">${html}</div>
      <div style="display:flex;gap:10px"><button class="btn" data-a="reveal">إظهار المواضع</button></div><div class="explain">${esc(RULES[r].desc)}</div>`;
    box.querySelectorAll('.hunt .w').forEach(el => el.onclick = () => {
      if (el.classList.contains('found')) return;
      if (targets.has(el.dataset.id)) { el.classList.add('found'); found++; box.querySelector('[data-f]').textContent = toAr(found); if (found === targets.size) toast('ممتاز! وجدتنّ كل المواضع'); }
      else { el.classList.add('miss'); missed++; setTimeout(() => el.classList.remove('miss'), 900); }
    });
    box.querySelector('[data-a=reveal]').onclick = () => box.querySelectorAll('.hunt .w').forEach(el => { if (targets.has(el.dataset.id)) { el.classList.add('reveal'); el.innerHTML = tajweedHTML(el.textContent, this.P.words.find(w => w.key + '/' + w.i === el.dataset.id).j, r); } });
    this.host.querySelector('[data-a=again]').onclick = () => this.hunt();
  },

  match() {
    const uniq = [];
    shuffle(this.P.gharib).forEach(g => { if (!uniq.some(u => u.m === g.m || u.words === g.words)) uniq.push(g); });
    const set = uniq.slice(0, 5);
    if (set.length < 2) return this.empty('طابِق المعنى', 'لا توجد كلمات غريبة كافية في هذا المقطع.');
    const box = this.shell('طابِق المعنى', 'اضغطي على الكلمة ثم على معناها');
    const ms = shuffle(set.map((g, i) => ({ i, m: cleanMeaning(g.m) })));
    box.innerHTML = `<div class="score"><span data-f>٠</span> من ${toAr(set.length)}</div><div class="match"><div class="col">${set.map((g, i) => `<button class="opt qw" data-w="${i}">${esc(g.words)}</button>`).join('')}</div>
      <div class="col">${ms.map(x => `<button class="opt" data-m="${x.i}">${esc(x.m)}</button>`).join('')}</div></div>`;
    let sel = null, done = 0;
    box.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { if (b.classList.contains('done')) return; box.querySelectorAll('[data-w]').forEach(x => x.classList.remove('picked')); b.classList.add('picked'); sel = b; });
    box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      if (!sel || b.classList.contains('done')) return;
      if (sel.dataset.w === b.dataset.m) {
        sel.classList.remove('picked'); sel.classList.add('done', 'right'); b.classList.add('done', 'right'); sel = null; done++;
        box.querySelector('[data-f]').textContent = toAr(done);
        if (done === set.length) toast('أحسنتنّ! طابقتنّ كل المعاني');
      } else { b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 700); }
    });
    this.host.querySelector('[data-a=again]').onclick = () => this.match();
  },

  tf() {
    const st = [];
    const gs = shuffle(this.P.gharib.filter(g => g.words));
    gs.slice(0, 3).forEach((g, i) => {
      const other = gs.find(x => cleanMeaning(x.m) !== cleanMeaning(g.m) && x.words !== g.words);
      const truth = i % 2 === 0 || !other;
      st.push({ html: `معنى كلمة <span class="qw">${esc(g.words)}</span>: ${esc(cleanMeaning(truth ? g.m : other.m))}`, truth, why: `معنى <span class="qw">${esc(g.words)}</span>: ${esc(cleanMeaning(g.m))}` });
    });
    const occ = ruleOccurrences(this.P);
    const rules = Object.keys(occ).map(Number).filter(r => r !== 1);
    shuffle(rules).slice(0, 3).forEach((r, i) => {
      const w = pick(occ[r]);
      const truth = i % 2 === 1;
      const fake = pick(TEACH_RULES.filter(x => x !== r && !wordRules(w.j).includes(x) && !sameFamily(x, r)));
      st.push({ html: `في كلمة <span class="qw">${esc(w.t)}</span> حكم: ${RULES[truth ? r : fake].name}`, truth, why: `في كلمة <span class="qw">${tajweedHTML(w.t, w.j, r)}</span> حكم ${RULES[r].name}` });
    });
    if (!st.length) return this.empty('صح أم خطأ', 'لا توجد عبارات كافية لهذا المقطع.');
    const list = shuffle(st);
    let n = 0, right = 0;
    const box = this.shell('صح أم خطأ', '');
    const show = () => {
      if (n >= list.length) { box.innerHTML = `<div class="score">النتيجة: ${toAr(right)} من ${toAr(list.length)}</div>`; return; }
      const s = list[n];
      box.innerHTML = `<div class="muted">العبارة ${toAr(n + 1)} من ${toAr(list.length)}</div><div class="tf-statement">${s.html}</div>
        <div class="tf-btns"><button class="opt" data-v="1">صح</button><button class="opt" data-v="0">خطأ</button></div><div class="explain" hidden></div>`;
      box.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
        if (box.dataset.lock) return; box.dataset.lock = 1;
        const ok = (b.dataset.v === '1') === s.truth; if (ok) right++;
        b.classList.add(ok ? 'right' : 'wrong');
        const ex = box.querySelector('.explain'); ex.hidden = false;
        ex.innerHTML = `<b>${ok ? 'إجابة صحيحة' : 'إجابة غير صحيحة'}.</b> ${s.why}<div style="margin-top:10px"><button class="btn primary" data-a="next">${n + 1 < list.length ? 'العبارة التالية' : 'النتيجة'}</button></div>`;
        ex.querySelector('[data-a=next]').onclick = () => { delete box.dataset.lock; n++; show(); };
      });
    };
    show();
    this.host.querySelector('[data-a=again]').onclick = () => this.tf();
  },

  reflect() {
    const box = this.shell('سؤال العبرة', 'ناقشن السؤال أولاً، ثم اكشفن الفائدة');
    if (!this.P.waqafat.length) { box.innerHTML = `<div class="reflect"><div class="q">ماذا تعلّمنا من آيات اليوم؟ وكيف نعمل بها في حياتنا؟</div><div class="muted" style="text-align:center">لا يوجد سؤال تدبّر محفوظ لهذا المقطع في كتاب «تدبّر وعمل».</div></div>`; }
    else {
      const x = pick(this.P.waqafat);
      box.innerHTML = `<div class="reflect"><div class="qref" style="text-align:center">${esc(x.v)}</div><div class="q">${esc(x.q)}</div>
        <div style="text-align:center"><button class="btn gold" data-a="show">اكشفي الفائدة</button></div><div class="explain" hidden>${esc(x.b)}${x.src ? `<div class="muted" style="margin-top:6px">[${esc(x.src)}]</div>` : ''}</div>
        <div class="muted" style="text-align:center;font-size:.9rem">المصدر: كتاب «تدبّر وعمل»</div></div>`;
      box.querySelector('[data-a=show]').onclick = e => { box.querySelector('.explain').hidden = false; e.target.remove(); };
    }
    this.host.querySelector('[data-a=again]').onclick = () => this.reflect();
  },

  empty(title, msg) { const box = this.shell(title, ''); box.innerHTML = `<div class="explain">${esc(msg)}</div>`; this.host.querySelector('[data-a=again]').onclick = () => this.menu(); },
};
function sameFamily(a, b) {
  const fam = r => ([3, 4, 5, 6].includes(r) ? 'madd' : [15, 16].includes(r) ? 'mut' : r);
  return fam(a) === fam(b) && a !== b && fam(a) === 'mut';
}

function drawWheel(cv) {
  const ctx = cv.getContext('2d'), n = GAMES.length, R = cv.width / 2;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.translate(R, R);
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R - 8, a0, a1); ctx.closePath();
    ctx.fillStyle = GAMES[i].color; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#fdf9ec'; ctx.stroke();
    ctx.save(); ctx.rotate((a0 + a1) / 2);
    ctx.fillStyle = '#ffffff'; ctx.font = '700 44px "IBM Plex Sans Arabic", Tahoma, sans-serif'; ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.textBaseline = 'middle';
    ctx.fillText(GAMES[i].name, R * 0.58, 0);
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, R * 0.13, 0, Math.PI * 2); ctx.fillStyle = '#fdf9ec'; ctx.fill();
  ctx.lineWidth = 8; ctx.strokeStyle = '#a87a22'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, R - 8, 0, Math.PI * 2); ctx.lineWidth = 10; ctx.strokeStyle = '#a87a22'; ctx.stroke();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
