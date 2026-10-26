/* Regneark for FOV (26.10.2026). Formler som i Excel/Google Regneark, med norske funksjonsnavn.
   Lagres i nettleseren. Ingen eksterne biblioteker. */
(function () {
  'use strict';
  const KOLONNER = 26, RADER = 100, LAGER = 'fov_regneark_v1';
  const $ = s => document.querySelector(s);
  const kolNavn = c => String.fromCharCode(65 + c);
  const adr = (r, c) => kolNavn(c) + (r + 1);
  let data = {};                      // "A1" -> rå innhold (tekst)
  let verdier = {};                   // "A1" -> beregnet verdi
  let aktiv = { r: 0, c: 0 }, anker = { r: 0, c: 0 }, redigerer = null, zoom = 1;
  try { const l = JSON.parse(localStorage.getItem(LAGER) || 'null'); if (l && l.data) { data = l.data; zoom = l.zoom || 1; } } catch (e) {}

  // ---------------------------------------------------------------- tall og tekst
  function tolkTall(s) {
    const t = String(s).trim().replace(/\s/g, '');
    if (/^[-+]?\d+([.,]\d+)?%$/.test(t)) return parseFloat(t.replace(',', '.')) / 100;
    if (/^[-+]?(\d+([.,]\d*)?|[.,]\d+)$/.test(t)) return parseFloat(t.replace(',', '.'));
    return null;
  }
  function visTall(v) {
    if (typeof v !== 'number') return v;
    if (!isFinite(v)) return '#DIV/0!';
    let s = Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-6 && v !== 0) ? v.toExponential(4) : String(Math.round(v * 1e10) / 1e10);
    return s.replace('.', ',');
  }

  // ---------------------------------------------------------------- formler
  class Feil { constructor(k) { this.k = k; } toString() { return this.k; } }
  const FUNK = {
    SUMMER: a => flat(a).filter(x => typeof x === 'number').reduce((s, x) => s + x, 0),
    GJENNOMSNITT: a => { const t = flat(a).filter(x => typeof x === 'number'); if (!t.length) throw new Feil('#DIV/0!'); return t.reduce((s, x) => s + x, 0) / t.length; },
    MIN: a => { const t = flat(a).filter(x => typeof x === 'number'); return t.length ? Math.min(...t) : 0; },
    MAKS: a => { const t = flat(a).filter(x => typeof x === 'number'); return t.length ? Math.max(...t) : 0; },
    ANTALL: a => flat(a).filter(x => typeof x === 'number').length,
    ANTALLA: a => flat(a).filter(x => x !== '' && x != null).length,
    MEDIAN: a => { const t = flat(a).filter(x => typeof x === 'number').sort((x, y) => x - y); if (!t.length) throw new Feil('#TALL!'); const m = t.length >> 1; return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2; },
    PRODUKT: a => flat(a).filter(x => typeof x === 'number').reduce((s, x) => s * x, 1),
    AVRUND: a => { const n = tall(a[1] ?? 0), f = 10 ** n; return Math.round(tall(a[0]) * f) / f; },
    ABS: a => Math.abs(tall(a[0])),
    ROT: a => { const x = tall(a[0]); if (x < 0) throw new Feil('#TALL!'); return Math.sqrt(x); },
    POTENS: a => tall(a[0]) ** tall(a[1]),
    HVIS: a => (sann(a[0]) ? (a[1] ?? true) : (a[2] ?? false)),
    PI: () => Math.PI,
    HELTALL: a => Math.floor(tall(a[0])),
    REST: a => { const d = tall(a[1]); if (!d) throw new Feil('#DIV/0!'); return tall(a[0]) - d * Math.floor(tall(a[0]) / d); },
    TYPETALL: a => { const t = flat(a).filter(x => typeof x === 'number'), n = {}; let best = null, bn = 0; t.forEach(x => { n[x] = (n[x] || 0) + 1; if (n[x] > bn) { bn = n[x]; best = x; } }); if (bn < 2) throw new Feil('#I/T'); return best; },
    VARIASJONSBREDDE: a => { const t = flat(a).filter(x => typeof x === 'number'); return t.length ? Math.max(...t) - Math.min(...t) : 0; },
  };
  const ALIAS = { SUM: 'SUMMER', AVERAGE: 'GJENNOMSNITT', SNITT: 'GJENNOMSNITT', MAX: 'MAKS', COUNT: 'ANTALL', COUNTA: 'ANTALLA', ROUND: 'AVRUND', SQRT: 'ROT', IF: 'HVIS', PRODUCT: 'PRODUKT', POWER: 'POTENS', INT: 'HELTALL', MOD: 'REST', MODE: 'TYPETALL' };
  function flat(a) { return a.flat(Infinity); }
  function tall(x) {
    if (Array.isArray(x)) x = flat(x)[0];
    if (x instanceof Feil) throw x;
    if (typeof x === 'number') return x;
    if (typeof x === 'boolean') return x ? 1 : 0;
    if (x === '' || x == null) return 0;
    const t = tolkTall(x); if (t === null) throw new Feil('#VERDI!'); return t;
  }
  function sann(x) { if (typeof x === 'boolean') return x; return tall(x) !== 0; }

  function tokens(s) {
    const ut = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      let m;
      const rest = s.slice(i);
      if ((m = rest.match(/^\$?[A-Za-z]\$?\d+(:\$?[A-Za-z]\$?\d+)?(?![A-Za-z(])/))) { ut.push({ t: 'ref', v: m[0].toUpperCase() }); i += m[0].length; continue; }
      if ((m = rest.match(/^[A-Za-zÆØÅæøå_][A-Za-zÆØÅæøå_0-9.]*(?=\s*\()/))) { ut.push({ t: 'fn', v: m[0].toUpperCase() }); i += m[0].length; continue; }
      if ((m = rest.match(/^(SANN|USANN|TRUE|FALSE)\b/i))) { ut.push({ t: 'num', v: /^(SANN|TRUE)$/i.test(m[0]) }); i += m[0].length; continue; }
      if ((m = rest.match(/^\d+([.,]\d+)?%?/)) || (m = rest.match(/^[.,]\d+%?/))) {
        let v = parseFloat(m[0].replace(',', '.').replace('%', '')); if (m[0].endsWith('%')) v /= 100;
        ut.push({ t: 'num', v }); i += m[0].length; continue;
      }
      if (c === '"') { const j = s.indexOf('"', i + 1); if (j < 0) throw new Feil('#NAVN?'); ut.push({ t: 'str', v: s.slice(i + 1, j) }); i = j + 1; continue; }
      if ((m = rest.match(/^(<=|>=|<>)/))) { ut.push({ t: 'op', v: m[0] }); i += 2; continue; }
      if ('+-*/^()<>=&;,'.includes(c)) { ut.push({ t: c === ';' || c === ',' ? 'sep' : 'op', v: c }); i++; continue; }
      throw new Feil('#NAVN?');
    }
    return ut;
  }
  function refTilRC(r) { const m = r.replace(/\$/g, '').match(/^([A-Z])(\d+)$/); return { c: m[1].charCodeAt(0) - 65, r: Number(m[2]) - 1 }; }
  function regnUt(formel, stakk) {
    const tk = tokens(formel); let p = 0;
    const se = () => tk[p], ta = () => tk[p++];
    const forvent = v => { const t = ta(); if (!t || t.v !== v) throw new Feil('#NAVN?'); };
    function sammenlign() {
      let a = sammensett();
      while (se() && se().t === 'op' && ['=', '<', '>', '<=', '>=', '<>'].includes(se().v)) {
        const o = ta().v, b = sammensett();
        const x = typeof a === 'string' || typeof b === 'string' ? [String(a), String(b)] : [tall(a), tall(b)];
        a = { '=': x[0] === x[1], '<>': x[0] !== x[1], '<': x[0] < x[1], '>': x[0] > x[1], '<=': x[0] <= x[1], '>=': x[0] >= x[1] }[o];
      }
      return a;
    }
    function sammensett() { let a = sum(); while (se() && se().v === '&') { ta(); a = String(a) + String(sum()); } return a; }
    function sum() { let a = ledd(); while (se() && (se().v === '+' || se().v === '-')) { const o = ta().v, b = ledd(); a = o === '+' ? tall(a) + tall(b) : tall(a) - tall(b); } return a; }
    function ledd() {
      let a = pot();
      while (se() && (se().v === '*' || se().v === '/')) {
        const o = ta().v, b = pot();
        if (o === '*') a = tall(a) * tall(b); else { if (tall(b) === 0) throw new Feil('#DIV/0!'); a = tall(a) / tall(b); }
      }
      return a;
    }
    function pot() { let a = fortegn(); while (se() && se().v === '^') { ta(); const b = fortegn(); a = tall(a) ** tall(b); } return a; }   // som i Excel: 2^3^2 = 64
    function fortegn() { if (se() && (se().v === '-' || se().v === '+')) { const o = ta().v, x = fortegn(); return o === '-' ? -tall(x) : tall(x); } return atom(); }
    function atom() {
      const t = ta(); if (!t) throw new Feil('#NAVN?');
      if (t.t === 'num' || t.t === 'str') return t.v;
      if (t.v === '(') { const v = sammenlign(); forvent(')'); return v; }
      if (t.t === 'ref') {
        if (t.v.includes(':')) {
          const [a, b] = t.v.split(':').map(refTilRC), ut = [];
          for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++) {
            const rad = [];
            for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) rad.push(verdi(adr(r, c), stakk));
            ut.push(rad);
          }
          return ut;
        }
        const { r, c } = refTilRC(t.v);
        if (r >= RADER || c >= KOLONNER) throw new Feil('#REF!');
        const v = verdi(adr(r, c), stakk);
        if (v instanceof Feil) throw v;
        return v;
      }
      if (t.t === 'fn') {
        const navn = ALIAS[t.v] || t.v, f = FUNK[navn];
        if (!f) throw new Feil('#NAVN?');
        forvent('('); const arg = [];
        if (se() && se().v !== ')') { arg.push(sammenlign()); while (se() && se().t === 'sep') { ta(); arg.push(sammenlign()); } }
        forvent(')');
        return f(arg);
      }
      throw new Feil('#NAVN?');
    }
    const v = sammenlign();
    if (p < tk.length) throw new Feil('#NAVN?');
    if (Array.isArray(v)) return flat(v)[0] ?? 0;
    return v;
  }
  function verdi(a, stakk = []) {
    if (a in verdier) return verdier[a];
    const raa = data[a];
    if (raa == null || raa === '') return '';
    if (raa[0] !== '=') { const t = tolkTall(raa); return verdier[a] = t === null ? raa : t; }
    if (stakk.includes(a)) throw new Feil('#SIRKEL!');
    let v;
    try { v = regnUt(raa.slice(1), [...stakk, a]); if (typeof v === 'number' && !isFinite(v)) v = new Feil('#DIV/0!'); }
    catch (e) { if (e instanceof Feil) { if (stakk.length && e.k === '#SIRKEL!') throw e; v = e; } else v = new Feil('#FEIL!'); }
    verdier[a] = v;
    if (v instanceof Feil && stakk.length) throw v;
    return v;
  }
  function beregnAlt() {
    verdier = {};
    for (const a of Object.keys(data)) { try { verdi(a); } catch (e) { verdier[a] = e instanceof Feil ? e : new Feil('#FEIL!'); } }
  }

  // ---------------------------------------------------------------- tabellen
  const rull = $('.ark-rull');
  const tab = document.createElement('table'); tab.className = 'ark';
  tab.innerHTML = '<colgroup><col style="width:calc(46px*var(--zoom,1))">' + Array.from({ length: KOLONNER }, () => '<col class="c">').join('') + '</colgroup>' +
    '<thead><tr><th></th>' + Array.from({ length: KOLONNER }, (_, c) => `<th data-k="${c}">${kolNavn(c)}</th>`).join('') + '</tr></thead><tbody>' +
    Array.from({ length: RADER }, (_, r) => `<tr><th data-r="${r}">${r + 1}</th>` + Array.from({ length: KOLONNER }, (_, c) => `<td data-r="${r}" data-c="${c}"></td>`).join('') + '</tr>').join('') + '</tbody>';
  rull.appendChild(tab);
  const celle = (r, c) => tab.tBodies[0].rows[r].cells[c + 1];
  const formel = $('#formel'), adrFelt = $('#adr');

  function tegnCelle(r, c) {
    const td = celle(r, c), a = adr(r, c), v = a in verdier ? verdier[a] : (data[a] ?? '');
    if (td.querySelector('input')) return;
    td.classList.toggle('feil', v instanceof Feil);
    td.classList.toggle('tall', typeof v === 'number');
    td.textContent = v instanceof Feil ? v.k : typeof v === 'boolean' ? (v ? 'SANN' : 'USANN') : visTall(v);
    td.title = data[a] && data[a][0] === '=' ? data[a] : '';
  }
  function tegnAlt() { beregnAlt(); for (let r = 0; r < RADER; r++) for (let c = 0; c < KOLONNER; c++) tegnCelle(r, c); merk(); }
  function omraade() { return { r0: Math.min(aktiv.r, anker.r), r1: Math.max(aktiv.r, anker.r), c0: Math.min(aktiv.c, anker.c), c1: Math.max(aktiv.c, anker.c) }; }
  function merk() {
    tab.querySelectorAll('.valgt, .aktiv').forEach(e => e.classList.remove('valgt', 'aktiv'));
    const o = omraade();
    for (let r = o.r0; r <= o.r1; r++) for (let c = o.c0; c <= o.c1; c++) celle(r, c).classList.add('valgt');
    for (let c = o.c0; c <= o.c1; c++) tab.tHead.rows[0].cells[c + 1].classList.add('valgt');
    for (let r = o.r0; r <= o.r1; r++) tab.tBodies[0].rows[r].cells[0].classList.add('valgt');
    celle(aktiv.r, aktiv.c).classList.add('aktiv');
    adrFelt.textContent = o.r0 === o.r1 && o.c0 === o.c1 ? adr(aktiv.r, aktiv.c) : `${adr(o.r0, o.c0)}:${adr(o.r1, o.c1)}`;
    if (document.activeElement !== formel) formel.value = data[adr(aktiv.r, aktiv.c)] ?? '';
  }
  function lagre() { try { localStorage.setItem(LAGER, JSON.stringify({ data, zoom })); } catch (e) {} }
  let historikk = [], frem = [];
  function huskAngre() { historikk.push(JSON.stringify(data)); if (historikk.length > 100) historikk.shift(); frem = []; }
  function sett(a, v) {
    v = String(v ?? '');
    if (v === '') delete data[a]; else data[a] = v;
  }
  function settInn(a, v) { huskAngre(); sett(a, v); tegnAlt(); lagre(); }
  function gaaTil(r, c, utvid) {
    aktiv = { r: Math.max(0, Math.min(RADER - 1, r)), c: Math.max(0, Math.min(KOLONNER - 1, c)) };
    if (!utvid) anker = { ...aktiv };
    merk();
    const td = celle(aktiv.r, aktiv.c), R = rull.getBoundingClientRect(), T = td.getBoundingClientRect();
    if (T.top < R.top + 32) rull.scrollTop -= R.top + 32 - T.top; else if (T.bottom > R.bottom) rull.scrollTop += T.bottom - R.bottom + 4;
    if (T.left < R.left + 46 * zoom) rull.scrollLeft -= R.left + 46 * zoom - T.left; else if (T.right > R.right) rull.scrollLeft += T.right - R.right + 4;
  }
  function startRed(start) {
    if (redigerer) return;
    const td = celle(aktiv.r, aktiv.c), a = adr(aktiv.r, aktiv.c);
    const inp = document.createElement('input');
    inp.value = start != null ? start : (data[a] ?? '');
    td.textContent = ''; td.appendChild(inp); inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
    redigerer = { inp, a };
    inp.addEventListener('input', () => { formel.value = inp.value; });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); ferdigRed(); gaaTil(aktiv.r + (e.shiftKey ? -1 : 1), aktiv.c); }
      else if (e.key === 'Tab') { e.preventDefault(); ferdigRed(); gaaTil(aktiv.r, aktiv.c + (e.shiftKey ? -1 : 1)); }
      else if (e.key === 'Escape') { e.preventDefault(); avbrytRed(); }
      e.stopPropagation();
    });
    inp.addEventListener('blur', () => setTimeout(() => { if (redigerer && redigerer.inp === inp) ferdigRed(); }, 0));
  }
  function ferdigRed() { if (!redigerer) return; const { inp, a } = redigerer; redigerer = null; const v = inp.value; inp.remove(); settInn(a, v); rull.focus({ preventScroll: true }); }
  function avbrytRed() { if (!redigerer) return; const { inp } = redigerer; redigerer = null; inp.remove(); tegnAlt(); rull.focus({ preventScroll: true }); }

  // mus og touch
  let drar = false;
  tab.addEventListener('pointerdown', e => {
    const td = e.target.closest('td'), th = e.target.closest('th');
    if (td && td.querySelector('input')) return;
    if (redigerer) ferdigRed();
    if (td) { gaaTil(Number(td.dataset.r), Number(td.dataset.c), e.shiftKey); drar = e.pointerType === 'mouse'; }
    else if (th && th.dataset.k) { anker = { r: 0, c: Number(th.dataset.k) }; aktiv = { r: RADER - 1, c: Number(th.dataset.k) }; merk(); }
    else if (th && th.dataset.r) { anker = { r: Number(th.dataset.r), c: 0 }; aktiv = { r: Number(th.dataset.r), c: KOLONNER - 1 }; merk(); }
    rull.focus({ preventScroll: true });
  });
  tab.addEventListener('pointerover', e => { if (!drar) return; const td = e.target.closest('td'); if (td) { aktiv = { r: Number(td.dataset.r), c: Number(td.dataset.c) }; merk(); } });
  window.addEventListener('pointerup', () => { drar = false; });
  tab.addEventListener('dblclick', e => { if (e.target.closest('td')) startRed(); });
  rull.tabIndex = 0;
  rull.addEventListener('keydown', e => {
    if (redigerer) return;
    const k = e.key, mod = e.ctrlKey || e.metaKey;
    const pil = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
    if (pil) { e.preventDefault(); gaaTil(aktiv.r + pil[0], aktiv.c + pil[1], e.shiftKey); return; }
    if (k === 'Enter' || k === 'F2') { e.preventDefault(); startRed(); return; }
    if (k === 'Tab') { e.preventDefault(); gaaTil(aktiv.r, aktiv.c + (e.shiftKey ? -1 : 1)); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); slettValgt(); return; }
    if (mod && k.toLowerCase() === 'z') { e.preventDefault(); angre(); return; }
    if (mod && k.toLowerCase() === 'y') { e.preventDefault(); gjorOm(); return; }
    if (mod && k.toLowerCase() === 'd') { e.preventDefault(); fyllNed(); return; }
    if (!mod && !e.altKey && k.length === 1) { e.preventDefault(); startRed(k); }
  });
  function slettValgt() { huskAngre(); const o = omraade(); for (let r = o.r0; r <= o.r1; r++) for (let c = o.c0; c <= o.c1; c++) sett(adr(r, c), ''); tegnAlt(); lagre(); }
  function angre() { if (!historikk.length) return; frem.push(JSON.stringify(data)); data = JSON.parse(historikk.pop()); tegnAlt(); lagre(); }
  function gjorOm() { if (!frem.length) return; historikk.push(JSON.stringify(data)); data = JSON.parse(frem.pop()); tegnAlt(); lagre(); }

  // formelfeltet
  formel.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); settInn(adr(aktiv.r, aktiv.c), formel.value); gaaTil(aktiv.r + 1, aktiv.c); rull.focus({ preventScroll: true }); }
    if (e.key === 'Escape') { formel.value = data[adr(aktiv.r, aktiv.c)] ?? ''; rull.focus({ preventScroll: true }); }
  });

  // kopiering med relative referanser ($ låser)
  function flyttFormel(f, dr, dc) {
    if (!f || f[0] !== '=') return f;
    return f.replace(/("[^"]*")|(\$?)([A-Za-z])(\$?)(\d+)(?![A-Za-z(])/g, (m, str, dk, k, dr2, r) => {
      if (str) return str;
      let c = k.toUpperCase().charCodeAt(0) - 65, rr = Number(r) - 1;
      if (!dk) c += dc; if (!dr2) rr += dr;
      if (c < 0 || rr < 0 || c >= KOLONNER || rr >= RADER) return '#REF!';
      return dk + kolNavn(c) + dr2 + (rr + 1);
    });
  }
  let utklipp = null;
  function kopier(klipp) {
    const o = omraade(), rader = [];
    for (let r = o.r0; r <= o.r1; r++) { const rad = []; for (let c = o.c0; c <= o.c1; c++) rad.push(data[adr(r, c)] ?? ''); rader.push(rad); }
    utklipp = { o, rader, klipp };
    const tekst = rader.map(r => r.map((x, i) => { const v = verdier[adr(o.r0 + rader.indexOf(r), o.c0 + i)]; return v instanceof Feil ? v.k : visTall(v ?? x); }).join('\t')).join('\n');
    return tekst;
  }
  function lim(tekstFraUtklipp) {
    huskAngre();
    if (utklipp && (!tekstFraUtklipp || tekstFraUtklipp === utklipp.tekst)) {
      const { o, rader, klipp } = utklipp, dr = aktiv.r - o.r0, dc = aktiv.c - o.c0;
      const sel = omraade(), h = rader.length, w = rader[0].length;
      const hoyde = (sel.r1 - sel.r0 + 1) % h === 0 && sel.r1 > sel.r0 ? sel.r1 - sel.r0 + 1 : h;   // lim inn i et større område: gjenta (fyll)
      const bredde = (sel.c1 - sel.c0 + 1) % w === 0 && sel.c1 > sel.c0 ? sel.c1 - sel.c0 + 1 : w;
      if (klipp) for (let r = o.r0; r <= o.r1; r++) for (let c = o.c0; c <= o.c1; c++) sett(adr(r, c), '');
      for (let i = 0; i < hoyde; i++) for (let j = 0; j < bredde; j++) {
        const r = sel.r0 + i, c = sel.c0 + j; if (r >= RADER || c >= KOLONNER) continue;
        sett(adr(r, c), flyttFormel(rader[i % h][j % w], r - (o.r0 + i % h), c - (o.c0 + j % w)));
      }
      if (klipp) utklipp = null;
    } else if (tekstFraUtklipp) {
      tekstFraUtklipp.replace(/\r/g, '').replace(/\n$/, '').split('\n').forEach((linje, i) => linje.split('\t').forEach((x, j) => {
        const r = aktiv.r + i, c = aktiv.c + j; if (r < RADER && c < KOLONNER) sett(adr(r, c), x.trim());
      }));
    }
    tegnAlt(); lagre();
  }
  function fyllNed() {
    const o = omraade(); if (o.r1 === o.r0) return;
    huskAngre();
    for (let c = o.c0; c <= o.c1; c++) { const f = data[adr(o.r0, c)] ?? ''; for (let r = o.r0 + 1; r <= o.r1; r++) sett(adr(r, c), flyttFormel(f, r - o.r0, 0)); }
    tegnAlt(); lagre();
  }
  document.addEventListener('copy', e => { if (redigerer || document.activeElement === formel) return; const t = kopier(false); utklipp.tekst = t; e.clipboardData.setData('text/plain', t); e.preventDefault(); });
  document.addEventListener('cut', e => { if (redigerer || document.activeElement === formel) return; const t = kopier(true); utklipp.tekst = t; e.clipboardData.setData('text/plain', t); e.preventDefault(); });
  document.addEventListener('paste', e => { if (redigerer || document.activeElement === formel) return; e.preventDefault(); lim(e.clipboardData.getData('text/plain')); });

  // ---------------------------------------------------------------- knapper
  const k = id => document.getElementById(id);
  k('vAngre').onclick = angre; k('vGjor').onclick = gjorOm;
  k('vKopier').onclick = () => { const t = kopier(false); utklipp.tekst = null; try { navigator.clipboard.writeText(t); } catch (e) {} };
  k('vLim').onclick = () => lim(null);
  k('vFyll').onclick = fyllNed;
  k('vSlett').onclick = slettValgt;
  k('vSum').onclick = () => {          // autosum under det valgte området
    const o = omraade(); const r = o.r1 + 1; if (r >= RADER) return;
    huskAngre(); for (let c = o.c0; c <= o.c1; c++) sett(adr(r, c), `=SUMMER(${adr(o.r0, c)}:${adr(o.r1, c)})`); tegnAlt(); lagre();
  };
  k('vZinn').onclick = () => { zoom = Math.min(2.2, zoom + .15); document.body.style.setProperty('--zoom', zoom); lagre(); };
  k('vZut').onclick = () => { zoom = Math.max(.6, zoom - .15); document.body.style.setProperty('--zoom', zoom); lagre(); };
  document.body.style.setProperty('--zoom', zoom);
  let tomKlikk = 0;
  k('vNy').onclick = () => {
    if (Date.now() - tomKlikk > 3000) { tomKlikk = Date.now(); k('vNy').textContent = 'Sikker? Trykk igjen'; setTimeout(() => { k('vNy').textContent = 'Tøm arket'; }, 3000); return; }
    huskAngre(); data = {}; tegnAlt(); lagre(); k('vNy').textContent = 'Tøm arket';
  };
  k('vCsv').onclick = () => {
    let maxR = 0, maxC = 0; Object.keys(data).forEach(a => { const { r, c } = refTilRC(a); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); });
    const linjer = [];
    for (let r = 0; r <= maxR; r++) { const rad = []; for (let c = 0; c <= maxC; c++) { const v = verdier[adr(r, c)]; let s = v instanceof Feil ? v.k : visTall(v ?? ''); if (/[;"\n]/.test(s)) s = '"' + String(s).replace(/"/g, '""') + '"'; rad.push(s); } linjer.push(rad.join(';')); }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + linjer.join('\r\n')], { type: 'text/csv' })); a.download = 'regneark.csv'; a.click();
  };
  k('vEksempel').onchange = e => {
    const ex = EKSEMPLER[e.target.value]; e.target.value = ''; if (!ex) return;
    huskAngre(); data = {}; Object.entries(ex).forEach(([a, v]) => { data[a] = v; }); tegnAlt(); lagre(); gaaTil(0, 0);
  };
  const EKSEMPLER = {
    handleliste: { A1: 'Vare', B1: 'Pris', C1: 'Antall', D1: 'Sum', A2: 'Melk', B2: '24,90', C2: '2', D2: '=B2*C2', A3: 'Brød', B3: '39,50', C3: '1', D3: '=B3*C3', A4: 'Epler', B4: '6,50', C4: '6', D4: '=B4*C4', A5: 'Ost', B5: '89', C5: '1', D5: '=B5*C5', A7: 'Totalt', D7: '=SUMMER(D2:D5)', A8: 'Med 10 % rabatt', D8: '=D7*0,9' },
    budsjett: { A1: 'Månedsbudsjett', A2: 'Inntekt', B2: '22000', A4: 'Utgifter', A5: 'Husleie', B5: '9500', A6: 'Mat', B6: '4000', A7: 'Strøm', B7: '900', A8: 'Telefon og internett', B8: '650', A9: 'Buss', B9: '850', A10: 'Annet', B10: '1500', A12: 'Sum utgifter', B12: '=SUMMER(B5:B10)', A13: 'Til overs', B13: '=B2-B12', A14: 'Husleie i prosent av inntekt', B14: '=AVRUND(B5/B2*100;1)' },
    statistikk: { A1: 'Elev', B1: 'Poeng', A2: 'elev1', B2: '14', A3: 'elev2', B3: '18', A4: 'elev3', B4: '11', A5: 'elev4', B5: '18', A6: 'elev5', B6: '20', A7: 'elev6', B7: '9', D1: 'Gjennomsnitt', E1: '=AVRUND(GJENNOMSNITT(B2:B7);1)', D2: 'Median', E2: '=MEDIAN(B2:B7)', D3: 'Typetall', E3: '=TYPETALL(B2:B7)', D4: 'Variasjonsbredde', E4: '=VARIASJONSBREDDE(B2:B7)', D5: 'Høyest', E5: '=MAKS(B2:B7)', D6: 'Lavest', E6: '=MIN(B2:B7)' },
    gangetabell: Object.assign({ A1: '×' }, ...Array.from({ length: 10 }, (_, i) => ({ [kolNavn(i + 1) + '1']: String(i + 1), ['A' + (i + 2)]: String(i + 1) })),
      ...Array.from({ length: 100 }, (_, i) => { const r = Math.floor(i / 10), c = i % 10; return { [kolNavn(c + 1) + (r + 2)]: `=$A${r + 2}*${kolNavn(c + 1)}$1` }; })),
    lineaer: { A1: 'x', B1: 'y = 2x + 1', A2: '-3', A3: '=A2+1', A4: '=A3+1', A5: '=A4+1', A6: '=A5+1', A7: '=A6+1', A8: '=A7+1', B2: '=2*A2+1', B3: '=2*A3+1', B4: '=2*A4+1', B5: '=2*A5+1', B6: '=2*A6+1', B7: '=2*A7+1', B8: '=2*A8+1' },
  };

  // ---------------------------------------------------------------- diagram
  k('vDiagram').onclick = () => {
    const o = omraade();
    let etiketter = [], serier = [], navn = [];
    const v = (r, c) => { const x = verdier[adr(r, c)]; return x === undefined ? (data[adr(r, c)] ?? '') : x; };
    let r0 = o.r0, c0 = o.c0;
    const forste = []; for (let r = o.r0 + 1; r <= o.r1; r++) forste.push(v(r, o.c0));
    const stigende = forste.length > 1 && forste.every((x, i) => typeof x === 'number' && (i === 0 || x > forste[i - 1]));
    if (o.c1 > o.c0 && (typeof v(o.r0 + (o.r1 > o.r0 ? 1 : 0), o.c0) !== 'number' || stigende)) { c0 = o.c0 + 1; for (let r = o.r0; r <= o.r1; r++) etiketter.push(visTall(v(r, o.c0))); }
    const harOverskrift = o.r1 > o.r0 && typeof v(o.r0, c0) === 'string' && v(o.r0, c0) !== '';
    if (harOverskrift) { r0 = o.r0 + 1; if (etiketter.length) etiketter.shift(); }
    for (let c = c0; c <= o.c1; c++) {
      navn.push(harOverskrift ? String(v(o.r0, c)) : kolNavn(c));
      const s = []; for (let r = r0; r <= o.r1; r++) { const x = v(r, c); s.push(typeof x === 'number' ? x : 0); } serier.push(s);
    }
    if (!etiketter.length) etiketter = Array.from({ length: o.r1 - r0 + 1 }, (_, i) => String(r0 + i + 1));
    if (!serier.length || !serier[0].length) { alertBoks('Merk tallene du vil lage diagram av (gjerne med overskrifter og navn).'); return; }
    visDiagram({ etiketter, serier, navn });
  };
  function alertBoks(t) { const d = $('#melding'); d.textContent = t; d.hidden = false; setTimeout(() => { d.hidden = true; }, 3500); }
  const FARGER = ['#1d4e89', '#d62828', '#2e6b35', '#f59e0b', '#7c3aed', '#0e7490'];
  let diagramData = null, diagramType = 'stolpe';
  function visDiagram(d) { diagramData = d; $('#diagram').hidden = false; tegnDiagram(); }
  $('#dLukk').onclick = () => { $('#diagram').hidden = true; };
  $('#dType').onchange = e => { diagramType = e.target.value; tegnDiagram(); };
  $('#dLagre').onclick = () => { const a = document.createElement('a'); a.href = $('#dCanvas').toDataURL('image/png'); a.download = 'diagram.png'; a.click(); };
  function tegnDiagram() {
    const cv = $('#dCanvas'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.font = '13px system-ui, sans-serif'; x.fillStyle = '#1f2430';
    const { etiketter, serier, navn } = diagramData;
    if (diagramType === 'sektor') {
      const s = serier[0].map(Math.abs), sum = s.reduce((a, b) => a + b, 0) || 1, cx = W * 0.36, cy = H / 2, r = Math.min(W * 0.32, H * 0.42);
      let a = -Math.PI / 2;
      s.forEach((v, i) => { const b = v / sum * Math.PI * 2; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r, a, a + b); x.closePath(); x.fillStyle = FARGER[i % FARGER.length]; x.globalAlpha = .55 + .45 * ((i % 2) ? .6 : 1); x.fill(); x.globalAlpha = 1; x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); a += b; });
      etiketter.forEach((e, i) => { const y = 24 + i * 22; x.fillStyle = FARGER[i % FARGER.length]; x.fillRect(W * 0.72, y - 10, 14, 14); x.fillStyle = '#1f2430'; x.fillText(`${e} (${visTall(Math.round(s[i] / sum * 1000) / 10)} %)`, W * 0.72 + 20, y + 2); });
      return;
    }
    const alle = serier.flat(), maks = Math.max(0, ...alle), min = Math.min(0, ...alle);
    const v0 = 46, h0 = 16, bunn = H - 40, topp = 16 + (serier.length > 1 ? 18 : 0), B = W - v0 - h0;
    const steg = finStegg((maks - min) / 5), ymin = Math.floor(min / steg) * steg, ymaks = Math.ceil(maks / steg) * steg || steg;
    const Y = v => bunn - (v - ymin) / (ymaks - ymin) * (bunn - topp);
    x.strokeStyle = '#e3e6eb'; x.lineWidth = 1; x.textAlign = 'right'; x.textBaseline = 'middle';
    for (let t = ymin; t <= ymaks + 1e-9; t += steg) { x.beginPath(); x.moveTo(v0, Y(t)); x.lineTo(W - h0, Y(t)); x.stroke(); x.fillStyle = '#5a6272'; x.fillText(visTall(Math.round(t * 1e6) / 1e6), v0 - 6, Y(t)); }
    const n = etiketter.length, bred = B / n;
    x.textAlign = 'center'; x.textBaseline = 'top'; x.fillStyle = '#1f2430';
    etiketter.forEach((e, i) => x.fillText(e.length > 12 ? e.slice(0, 11) + '…' : e, v0 + bred * (i + .5), bunn + 6));
    serier.forEach((s, j) => {
      x.fillStyle = x.strokeStyle = FARGER[j % FARGER.length];
      if (diagramType === 'stolpe') {
        const sb = bred * .7 / serier.length;
        s.forEach((v, i) => { const xx = v0 + bred * i + bred * .15 + sb * j; x.fillRect(xx, Math.min(Y(v), Y(0)), sb - 2, Math.abs(Y(v) - Y(0))); });
      } else {
        x.lineWidth = 2.5; x.beginPath(); s.forEach((v, i) => { const xx = v0 + bred * (i + .5); i ? x.lineTo(xx, Y(v)) : x.moveTo(xx, Y(v)); }); x.stroke();
        s.forEach((v, i) => { x.beginPath(); x.arc(v0 + bred * (i + .5), Y(v), 4, 0, 7); x.fill(); });
      }
    });
    x.strokeStyle = '#1f2430'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(v0, topp - 6); x.lineTo(v0, bunn); x.lineTo(W - h0, bunn); x.stroke();
    if (serier.length > 1) { x.textAlign = 'left'; x.textBaseline = 'middle'; let xx = v0; navn.forEach((nv, j) => { x.fillStyle = FARGER[j % FARGER.length]; x.fillRect(xx, 6, 12, 12); x.fillStyle = '#1f2430'; x.fillText(nv, xx + 16, 12); xx += x.measureText(nv).width + 36; }); }
  }
  function finStegg(r) { if (r <= 0) return 1; const p = 10 ** Math.floor(Math.log10(r)), f = r / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

  tegnAlt(); gaaTil(0, 0); rull.focus({ preventScroll: true });
  window.REGNEARK = { data: () => data, verdi: a => verdier[a], sett: settInn, regnUt: f => { verdier = {}; try { return regnUt(f.replace(/^=/, ''), []); } catch (e) { return e; } } };
})();
