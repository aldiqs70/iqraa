/* استراتيجيات حصة القرآن: ألعاب جماعية للسبر والقراءة الجماعية، تُبنى أسئلتها من صفحات الأسبوع. */

const Q_CATS = {
  recite: 'تلاوة', group: 'تلاوة جماعية', rule: 'استخراج حكم', ruleOf: 'حكم كلمة', count: 'عدّ الأحكام',
  findWord: 'معاني الكلمات', meaning: 'معاني الكلمات', starts: 'حفظ ومتابعة', before: 'حفظ ومتابعة', complete: 'أكملي الآية', reflect: 'تدبّر',
};
const signed = n => `<bdi dir="ltr">${n > 0 ? '+' : n < 0 ? '−' : ''}${toAr(Math.abs(n))}</bdi>`;
const QW = t => `<span class="q-quran">${esc(t)}</span>`;

async function buildQuestionBank(keys) {
  const ay = [];
  for (const key of keys) {
    const [s, a] = key.split(':').map(Number);
    const words = await Q.ayahWords(key);
    const info = await Q.ayah(key);
    ay.push({ key, s, a, p: Q.pageOf(s, a), words, info, text: Q.ayahText(words) });
  }
  const bank = [];
  const loc = x => `${keys.some(k => +k.split(':')[0] !== ay[0].s) ? 'سورة ' + Q.suraName(x.s) + '، ' : ''}صفحة ${toAr(x.p)}`;
  const add = (type, html, answer, judge = false) => bank.push({ type, cat: Q_CATS[type], html, answer, judge });

  ay.forEach((x, i) => {
    // تلاوة
    add('recite', `اقرئي الآية ${toAr(x.a)} (${loc(x)}) قراءة سليمة مراعيةً أحكام التجويد`, QW(x.text + ' ﴿' + toAr(x.a) + '﴾'), true);
    const nx = ay[i + 1];
    if (nx && nx.s === x.s && i % 2 === 0) add('group', `اقرئي الآيتين ${toAr(x.a)} و${toAr(nx.a)} (${loc(x)}) جماعياً مع فريقك دون أخطاء`, QW(x.text + ' ﴿' + toAr(x.a) + '﴾ ' + nx.text + ' ﴿' + toAr(nx.a) + '﴾'), true);
    // أحكام
    const by = {};
    x.words.forEach(w => wordRules(w.j).forEach(r => { if (TEACH_RULES.includes(r) && r !== 1) (by[r] = by[r] || []).push(w); }));
    Object.keys(by).map(Number).forEach(r => {
      const ws = by[r];
      add('rule', `استخرجي من الآية ${toAr(x.a)} (${loc(x)}) موضعاً فيه حكم <b>${RULES[r].name}</b>`,
        `<div class="q-quran">${ws.map(w => tajweedHTML(w.t, w.j, r)).join(' ، ')}</div><div class="muted">${esc(RULES[r].desc)}</div>`);
      if (ws.length >= 2 && ws.length <= 5) add('count', `كم مرة ورد حكم <b>${RULES[r].name}</b> في الآية ${toAr(x.a)} (${loc(x)})؟`,
        `<b>${toAr(ws.length)} مرات</b><div class="q-quran">${ws.map(w => tajweedHTML(w.t, w.j, r)).join(' ، ')}</div>`);
      const LET = /[ء-يٱ]/;
      const vis = ws.filter(w => w.j.some(([a0, e0, rr]) => rr.includes(r) && LET.test(w.t.slice(a0, e0))));
      if (vis.length) { const w = pick(vis); add('ruleOf', `ما حكم التجويد في كلمة ${QW(w.t)} من الآية ${toAr(x.a)}؟`, `<b>${RULES[r].name}</b><div class="q-quran">${tajweedHTML(w.t, w.j, r)}</div>`); }
    });
    // معاني
    (x.info.g || []).forEach(g => {
      if (!g.w.length) return;
      const word = g.w.map(k => x.words[k]?.t).filter(Boolean).join(' ');
      const m = cleanMeaning(g.m);
      if (m.length <= 70) add('findWord', `أعطيني من الآية ${toAr(x.a)} (${loc(x)}) كلمة بمعنى «${esc(m)}»`, QW(word));
      add('meaning', `ما معنى ${QW(word)} في الآية ${toAr(x.a)}؟`, esc(m));
    });
    // حفظ ومتابعة
    if (x.words.length >= 6) {
      const start = x.words.slice(0, 3).map(w => w.t).join(' ');
      add('starts', `اقرئي الآية التي تبدأ بـ ${QW(start + ' …')} (${loc(x)})`, `الآية ${toAr(x.a)}: ${QW(x.text)}`, true);
      const half = Math.ceil(x.words.length / 2);
      add('complete', `أكملي الآية: ${QW(x.words.slice(0, half).map(w => w.t).join(' ') + ' …')}`, QW(x.words.slice(half).map(w => w.t).join(' ') + ' ﴿' + toAr(x.a) + '﴾'), true);
      const prev = ay[i - 1];
      if (prev && prev.s === x.s) add('before', `اقرئي الآية التي تسبق الآية التي تبدأ بـ ${QW(start + ' …')}`, `الآية ${toAr(prev.a)}: ${QW(prev.text)}`, true);
    }
  });
  // تدبّر
  const seen = new Set();
  ay.forEach(x => {
    if (x.info.d == null || seen.has(x.info.d) || !x.info.tad) return; seen.add(x.info.d);
    (x.info.tad.waqafat || []).forEach(w => { if (w.q) add('reflect', `<span class="q-quran" style="font-size:.9em">${esc(w.v)}</span><br>${esc(w.q)}`, `${esc(w.b)}${w.src ? ` <span class="muted">[${esc(w.src)}]</span>` : ''}`); });
  });
  return bank;
}

// balanced random pick of n questions across categories
function drawQuestions(bank, n, used = new Set()) {
  const groups = {};
  bank.forEach((q, i) => { if (!used.has(i)) (groups[q.type] = groups[q.type] || []).push(i); });
  Object.keys(groups).forEach(k => { groups[k] = shuffle(groups[k]); });
  const order = shuffle(Object.keys(groups));
  const out = [];
  while (out.length < n && order.some(k => groups[k].length)) {
    for (const k of order) { if (out.length >= n) break; if (groups[k].length) out.push(groups[k].pop()); }
  }
  return shuffle(out);
}

const TEAM_COLORS = ['#0e5a4b', '#a87a22', '#1f5fd1', '#b3261e', '#6b3db3'];
const TEAM_NAMES = ['الفريق الأول', 'الفريق الثاني', 'الفريق الثالث', 'الفريق الرابع', 'الفريق الخامس'];

const Strat = {
  host: null, bank: [], used: new Set(), teams: [], turn: 0,
  async mount(host, keys, label) {
    this.host = host; this.label = label;
    host.innerHTML = '<div class="muted">جارٍ تجهيز الأسئلة من صفحات الأسبوع…</div>';
    this.bank = await buildQuestionBank(keys);
    this.used = new Set();
    this.menu();
  },
  menu() {
    const games = [
      { id: 'box', name: 'الصندوق الغامض', desc: '١٨ صندوقاً خلف كل منها سؤال. أجيبي ثم قرّري: تحتفظين بالصندوق أم تعطينه لفريق آخر؟ النقاط قد تزيد أو تنقص!' },
      { id: 'snake', name: 'السلّم والحيّة', desc: 'ارمي النرد وأجيبي عن السؤال لتتقدّمي. السلالم ترفعك والحيّات تُنزلك. أول فريق يصل إلى ٣٠ يفوز.' },
      { id: 'xo', name: 'إكس – أو', desc: 'فريقان. خلف كل خانة سؤال، والإجابة الصحيحة تحجز الخانة. ثلاث خانات في صف واحد تعني الفوز.' },
      { id: 'bank', name: 'بنك الأسئلة', desc: 'كل الأسئلة المولَّدة من صفحات الأسبوع مع إجاباتها، لتراجعها المعلمة قبل الحصة.' },
    ];
    this.host.innerHTML = `<div class="game" style="gap:12px"><h2>استراتيجيات حصة القرآن</h2><div class="prompt">${esc(this.label)} · ${toAr(this.bank.length)} سؤالاً جاهزاً</div></div>
      <div class="game-menu">${games.map(g => `<button class="game-card" data-s="${g.id}"><b>${g.name}</b><span>${g.desc}</span></button>`).join('')}</div>`;
    this.host.querySelectorAll('[data-s]').forEach(b => b.onclick = () => b.dataset.s === 'bank' ? this.showBank() : this.setup(b.dataset.s));
  },
  setup(game) {
    const fixed = game === 'xo' ? 2 : null;
    const names = { box: 'الصندوق الغامض', snake: 'السلّم والحيّة', xo: 'إكس – أو' };
    let n = fixed || 3;
    const draw = () => {
      this.host.innerHTML = `<div class="game" style="max-width:640px"><h2>${names[game]}</h2><div class="prompt">جهّزي الفرق</div>
        ${fixed ? '' : `<div class="stepper"><button type="button" data-d="1" aria-label="فريق إضافي">+</button><output class="num">${toAr(n)}</output><button type="button" data-d="-1" aria-label="فريق أقل">−</button></div><div class="muted">عدد الفرق</div>`}
        <div style="display:grid;gap:8px;width:100%">${Array.from({ length: n }, (_, i) => `<div class="field"><label for="tn${i}" style="color:${TEAM_COLORS[i]}">${game === 'xo' ? (i ? 'فريق O' : 'فريق X') : 'اسم الفريق ' + toAr(i + 1)}</label><input id="tn${i}" value="${game === 'xo' ? (i ? 'فريق O' : 'فريق X') : TEAM_NAMES[i]}"></div>`).join('')}</div>
        <div style="display:flex;gap:10px"><button class="btn" data-back>رجوع</button><button class="btn gold" data-go style="min-height:54px;font-size:1.2rem;padding-inline:34px">ابدئي اللعب</button></div></div>`;
      this.host.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { n = Math.max(2, Math.min(5, n + +b.dataset.d)); draw(); });
      this.host.querySelector('[data-back]').onclick = () => this.menu();
      this.host.querySelector('[data-go]').onclick = () => {
        this.teams = Array.from({ length: n }, (_, i) => ({ name: $('#tn' + i, this.host).value.trim() || TEAM_NAMES[i], color: TEAM_COLORS[i], score: 0, pos: 0 }));
        this.turn = 0;
        ({ box: () => this.box(), snake: () => this.snake(), xo: () => this.xo() })[game]();
      };
    };
    draw();
  },
  nextQ() {
    let [i] = drawQuestions(this.bank, 1, this.used);
    if (i == null) { this.used = new Set(); [i] = drawQuestions(this.bank, 1, this.used); }
    this.used.add(i);
    return this.bank[i];
  },
  scoreboard(mode) {
    return `<div class="teams">${this.teams.map((t, i) => `<div class="team ${i === this.turn ? 'on' : ''}" style="--tc:${t.color}"><span class="dot"></span><b>${esc(t.name)}</b>${mode === 'points' ? `<span class="pts num">${signed(t.score)}</span>` : mode === 'pos' ? `<span class="pts num">المربع ${toAr(t.pos)}</span>` : ''}</div>`).join('')}</div>`;
  },
  // question card: resolves true (correct) / false (wrong)
  ask(q, team) {
    return new Promise(res => {
      const ov = document.createElement('div');
      ov.className = 'overlay qcard-ov';
      ov.innerHTML = `<div class="qcard" style="--tc:${team.color}"><div class="qhead"><span class="chip">${esc(q.cat)}</span><b style="color:${team.color}">دور ${esc(team.name)}</b></div>
        <div class="qtext">${q.html}</div>
        <div class="qans" hidden><div class="muted" style="font-size:.9rem">${q.judge ? 'النص الصحيح' : 'الإجابة'}</div>${q.answer}</div>
        <div class="qbtns"><button class="btn" data-a="show">إظهار الإجابة</button><button class="btn primary" data-a="ok">✓ إجابة صحيحة</button><button class="btn danger" data-a="no">✗ إجابة خاطئة</button></div></div>`;
      document.body.appendChild(ov);
      ov.querySelector('[data-a=show]').onclick = e => { ov.querySelector('.qans').hidden = false; e.target.remove(); };
      ov.querySelector('[data-a=ok]').onclick = () => { ov.remove(); res(true); };
      ov.querySelector('[data-a=no]').onclick = () => { ov.remove(); res(false); };
    });
  },
  banner(html, ms = 1800) {
    const b = document.createElement('div'); b.className = 'overlay'; b.innerHTML = `<div class="banner">${html}</div>`;
    document.body.appendChild(b);
    return new Promise(r => { const done = () => { b.remove(); r(); }; b.onclick = done; setTimeout(done, ms); });
  },

  /* ---------- الصندوق الغامض ---------- */
  box() {
    const pts = shuffle([100, -100, 1000, -500, 1, -200, 300, 50, 600, -1000, 200, 100, 200, -500, 700, 100, 400, -2000]);
    const boxes = pts.map((p, i) => ({ n: i + 1, p, open: false }));
    const draw = () => {
      this.host.innerHTML = `<div class="game wide"><h2>الصندوق الغامض</h2>${this.scoreboard('points')}
        <div class="boxes">${boxes.map(b => `<button class="mbox ${b.open ? 'open' : ''}" data-b="${b.n - 1}" ${b.open ? 'disabled' : ''}>${b.open ? `<span class="num ${b.p < 0 ? 'neg' : 'pos'}">${signed(b.p)}</span>` : `<span class="num">${toAr(b.n)}</span>`}</button>`).join('')}</div>
        <div class="muted">الفريق يختار رقم صندوق، ويجيب عن سؤاله، ثم يقرّر الاحتفاظ بالصندوق أو إعطاءه لفريق آخر.</div>
        <button class="btn" data-menu>كل الاستراتيجيات</button></div>`;
      this.host.querySelector('[data-menu]').onclick = () => this.menu();
      this.host.querySelectorAll('[data-b]').forEach(el => el.onclick = async () => {
        const b = boxes[+el.dataset.b], team = this.teams[this.turn];
        const ok = await this.ask(this.nextQ(), team);
        if (!ok) { await this.banner(`<b>إجابة غير صحيحة</b><span>يبقى الصندوق ${toAr(b.n)} مغلقاً وينتقل الدور</span>`); this.turn = (this.turn + 1) % this.teams.length; draw(); return; }
        const to = await this.keepOrGive(team);
        b.open = true;
        const target = this.teams[to];
        target.score += b.p;
        await this.banner(`<div class="big-pts ${b.p < 0 ? 'neg' : 'pos'} num">${signed(b.p)}</div><span>${b.p < 0 ? 'تُخصم من' : 'تُضاف إلى'} ${esc(target.name)}</span>`, 2400);
        this.turn = (this.turn + 1) % this.teams.length;
        if (boxes.every(x => x.open)) return this.finish('points');
        draw();
      });
    };
    draw();
  },
  keepOrGive(team) {
    return new Promise(res => {
      const ov = document.createElement('div'); ov.className = 'overlay';
      const me = this.teams.indexOf(team);
      ov.innerHTML = `<div class="qcard" style="--tc:${team.color};text-align:center"><div class="qtext">أحسنتِ! ماذا يقرّر ${esc(team.name)}؟</div>
        <div class="qbtns" style="justify-content:center"><button class="btn primary" data-k style="font-size:1.3rem;min-height:60px">الاحتفاظ بالصندوق</button></div>
        <div class="muted">أو أعطي الصندوق إلى:</div><div class="qbtns" style="justify-content:center">${this.teams.map((t, i) => i === me ? '' : `<button class="btn" data-g="${i}" style="border-color:${t.color};color:${t.color};min-height:54px">${esc(t.name)}</button>`).join('')}</div></div>`;
      document.body.appendChild(ov);
      ov.querySelector('[data-k]').onclick = () => { ov.remove(); res(me); };
      ov.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { ov.remove(); res(+b.dataset.g); });
    });
  },

  /* ---------- السلّم والحيّة ---------- */
  snake() {
    const N = 30;
    const ladders = { 3: 11, 8: 16, 14: 25, 19: 28 };
    const snakes = { 17: 6, 23: 12, 27: 18, 29: 20 };
    const cellPos = n => { const r = Math.floor((n - 1) / 6), c0 = (n - 1) % 6; const c = r % 2 === 0 ? c0 : 5 - c0; return { r: 4 - r, c }; }; // row 0 top; col 0 right (RTL)
    const center = n => { const { r, c } = cellPos(n); return { x: (5 - c) * 100 + 50, y: r * 100 + 50 }; }; // svg x from left
    const draw = (msg = '') => {
      const cells = [];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
        const n = Array.from({ length: N }, (_, i) => i + 1).find(k => { const p = cellPos(k); return p.r === r && p.c === c; });
        const here = this.teams.filter(t => t.pos === n);
        cells.push(`<div class="sq ${ladders[n] ? 'lad' : ''} ${snakes[n] ? 'snk' : ''}" style="grid-row:${r + 1};grid-column:${c + 1}"><span class="num">${toAr(n)}</span><div class="tokens">${here.map(t => `<i style="background:${t.color}" title="${esc(t.name)}"></i>`).join('')}</div></div>`);
      }
      const lines = Object.entries(ladders).map(([a, b]) => { const p = center(+a), q = center(+b); const dx = (q.y - p.y), dy = -(q.x - p.x); const L = Math.hypot(dx, dy) || 1; const ox = dx / L * 14, oy = dy / L * 14;
        let rungs = ''; for (let k = 1; k < 6; k++) { const t = k / 6; rungs += `<line x1="${p.x + (q.x - p.x) * t - ox}" y1="${p.y + (q.y - p.y) * t - oy}" x2="${p.x + (q.x - p.x) * t + ox}" y2="${p.y + (q.y - p.y) * t + oy}"/>`; }
        return `<g class="ladder"><line x1="${p.x - ox}" y1="${p.y - oy}" x2="${q.x - ox}" y2="${q.y - oy}"/><line x1="${p.x + ox}" y1="${p.y + oy}" x2="${q.x + ox}" y2="${q.y + oy}"/>${rungs}</g>`; }).join('')
        + Object.entries(snakes).map(([a, b]) => { const p = center(+a), q = center(+b); const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
          return `<g class="snake"><path d="M${p.x},${p.y} C${mx + 70},${p.y + 20} ${mx - 70},${q.y - 20} ${q.x},${q.y}"/><circle cx="${p.x}" cy="${p.y}" r="13"/></g>`; }).join('');
      this.host.innerHTML = `<div class="game wide"><h2>السلّم والحيّة</h2>${this.scoreboard('pos')}
        <div class="snake-wrap"><div class="board">${cells.join('')}</div><svg class="board-svg" viewBox="0 0 600 500" aria-hidden="true">${lines}</svg></div>
        ${this.teams.some(t => t.pos === 0) ? `<div class="muted">عند خط البداية: ${this.teams.filter(t => t.pos === 0).map(t => `<b style="color:${t.color}">${esc(t.name)}</b>`).join('، ')}</div>` : ''}
        <div class="dice-row"><div class="dice num" id="dice">؟</div><button class="btn gold" data-roll style="min-height:58px;font-size:1.3rem;padding-inline:30px">ارمي النرد – ${esc(this.teams[this.turn].name)}</button></div>
        ${msg ? `<div class="explain" style="text-align:center">${msg}</div>` : ''}<button class="btn" data-menu>كل الاستراتيجيات</button></div>`;
      this.host.querySelector('[data-menu]').onclick = () => this.menu();
      this.host.querySelector('[data-roll]').onclick = async e => {
        e.target.disabled = true;
        const team = this.teams[this.turn];
        const dice = $('#dice', this.host);
        let v = 1;
        for (let k = 0; k < 10; k++) { v = 1 + Math.floor(Math.random() * 6); dice.textContent = toAr(v); await new Promise(r => setTimeout(r, 70)); }
        const ok = await this.ask(this.nextQ(), team);
        let m;
        if (!ok) m = `إجابة غير صحيحة، يبقى ${esc(team.name)} في مكانه.`;
        else {
          team.pos = Math.min(N, team.pos + v);
          m = `تقدّم ${esc(team.name)} ${toAr(v)} خطوات إلى المربع ${toAr(team.pos)}.`;
          if (ladders[team.pos]) { team.pos = ladders[team.pos]; m += ` وصعد السلّم إلى ${toAr(team.pos)}!`; }
          else if (snakes[team.pos]) { team.pos = snakes[team.pos]; m += ` لكن الحيّة أنزلته إلى ${toAr(team.pos)}.`; }
          if (team.pos >= N) return this.finish('pos', team);
        }
        this.turn = (this.turn + 1) % this.teams.length;
        draw(m);
      };
    };
    draw();
  },

  /* ---------- إكس – أو ---------- */
  xo() {
    const cells = Array(9).fill(null);
    const qs = drawQuestions(this.bank, 9, this.used).map(i => { this.used.add(i); return this.bank[i]; });
    while (qs.length < 9) qs.push(this.nextQ());
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const sym = i => (i === 0 ? 'X' : 'O');
    const draw = (msg = '') => {
      this.host.innerHTML = `<div class="game wide"><h2>إكس – أو</h2>${this.scoreboard('')}
        <div class="xo">${cells.map((v, i) => `<button class="xcell ${v != null ? 'taken' : ''}" data-c="${i}" ${v != null ? 'disabled' : ''} style="${v != null ? `color:${this.teams[v].color}` : ''}">${v != null ? sym(v) : `<small>${esc(qs[i].cat)}</small>`}</button>`).join('')}</div>
        ${msg ? `<div class="explain" style="text-align:center">${msg}</div>` : ''}<div style="display:flex;gap:10px"><button class="btn" data-menu>كل الاستراتيجيات</button><button class="btn" data-new>لعبة جديدة</button></div></div>`;
      this.host.querySelector('[data-menu]').onclick = () => this.menu();
      this.host.querySelector('[data-new]').onclick = () => this.xo();
      this.host.querySelectorAll('[data-c]').forEach(el => el.onclick = async () => {
        const i = +el.dataset.c, team = this.teams[this.turn];
        const q = qs[i];
        const ok = await this.ask(q, team);
        let m = '';
        if (ok) {
          cells[i] = this.turn;
          if (LINES.some(l => l.every(k => cells[k] === this.turn))) return this.finish('xo', team);
          if (cells.every(v => v != null)) { draw('تعادل! كل الخانات امتلأت.'); return; }
        } else { qs[i] = this.nextQ(); m = `إجابة غير صحيحة، تبقى الخانة مفتوحة بسؤال جديد.`; }
        this.turn = 1 - this.turn;
        draw(m);
      });
    };
    draw();
  },

  finish(mode, winner) {
    let w = winner;
    if (mode === 'points') { const max = Math.max(...this.teams.map(t => t.score)); const ws = this.teams.filter(t => t.score === max); w = ws[0]; if (ws.length > 1) w = { name: ws.map(t => t.name).join(' و'), color: '#a87a22' }; }
    this.host.innerHTML = `<div class="game"><div class="win" style="--tc:${w.color}"><div class="muted">الفائز</div><div class="wname">${esc(w.name)}</div>${mode === 'points' ? `<div class="num">${signed(Math.max(...this.teams.map(t => t.score)))} نقطة</div>` : ''}</div>
      ${mode === 'points' ? this.scoreboard('points') : ''}<div style="display:flex;gap:10px"><button class="btn primary" data-menu>كل الاستراتيجيات</button></div></div>`;
    this.host.querySelector('[data-menu]').onclick = () => this.menu();
  },

  showBank() {
    const byCat = {};
    this.bank.forEach(q => (byCat[q.cat] = byCat[q.cat] || []).push(q));
    this.host.innerHTML = `<div class="game wide" style="justify-items:stretch"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h2>بنك الأسئلة – ${esc(this.label)}</h2><button class="btn" data-menu>كل الاستراتيجيات</button></div>
      ${Object.entries(byCat).map(([c, qs]) => `<details class="bank" ${c === 'استخراج حكم' ? 'open' : ''}><summary><b>${esc(c)}</b> <span class="muted">(${toAr(qs.length)})</span></summary><ol>${qs.map(q => `<li><div>${q.html}</div><div class="bank-ans">${q.answer}</div></li>`).join('')}</ol></details>`).join('')}</div>`;
    this.host.querySelector('[data-menu]').onclick = () => this.menu();
  },
};
