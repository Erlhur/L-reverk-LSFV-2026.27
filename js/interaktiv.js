/* ==========================================================
   Interaktive oppgaver — motor
   Leser aktivitetene fra en JSON-blokk i sida og bygger dem.
   Ingen rammeverk, ingen bygging: én fil som virker fra en
   hvilken som helst mappe, også fra Google Drive.
   ==========================================================

   Ti oppgavetyper, alle utformet slik at eleven kan svare
   uten å skrive norsk:

     brokfigur   klikk deler av en figur til den viser en brøk
     rutenett    klikk ruter i et rutenett
     tallinje    dra et merke til rett sted på tallinja
     trekant     dra katetene til hypotenusen blir riktig
     koordinat   sett et punkt, eller lag en linje i et rutenett
     par         koble to og to sammen
     kurver      sorter brikker i navngitte bokser
     sorter      bytt plass på brikker til rekkefølgen stemmer
     velg        trykk på riktig svar
     merk        sett navn på nummererte deler av en figur

   Alle brikketypene virker på tre måter: dra og slipp, trykk
   på brikken og så på målet, eller tastatur. Å trykke to
   ganger virker alltid — også på et gammelt nettbrett.
   ========================================================== */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // små hjelpere
  // ------------------------------------------------------------------

  function lag(tag, klasse, innhold) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (innhold !== undefined && innhold !== null) e.innerHTML = innhold;
    return e;
  }

  function svgEl(tag, attr) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attr) if (attr.hasOwnProperty(k)) e.setAttribute(k, attr[k]);
    return e;
  }

  /* {3/4} i teksten blir ekte brøkmarkering, samme som i boka. */
  function vis(s) {
    return String(s == null ? '' : s).replace(
      /\{\s*(-?[^/{}]+?)\s*\/\s*([^/{}]+?)\s*\}/g,
      function (_, t, n) {
        return '<span class="brok"><span class="t">' + t + '</span>' +
               '<span class="n">' + n + '</span></span>';
      });
  }

  function bland(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Blander til rekkefølgen faktisk er en annen enn fasiten. */
  function blandUlikt(a, likFasit) {
    for (var i = 0; i < 40; i++) {
      var b = bland(a);
      if (!likFasit(b)) return b;
    }
    return a.slice().reverse();
  }

  function tall(x) {
    return String(x).replace('.', ',');
  }

  // ------------------------------------------------------------------
  // brikkemotor: dra og slipp, eller trykk–trykk
  // ------------------------------------------------------------------

  /* mal(element) skal returnere et objekt {ta: fn(brikke), plass: HTMLElement}
     eller null hvis elementet ikke kan ta imot noe akkurat nå. */
  function brikkemotor(rot, finnMal, etterFlytt) {
    var valgt = null, drar = null, klone = null, start = null;

    function velg(b) {
      if (valgt === b) { avvelg(); return; }
      avvelg();
      valgt = b;
      b.classList.add('valgt');
      rot.querySelectorAll('.mal').forEach(function (m) { m.classList.add('klar'); });
    }

    function avvelg() {
      if (valgt) valgt.classList.remove('valgt');
      valgt = null;
      rot.querySelectorAll('.mal').forEach(function (m) {
        m.classList.remove('klar', 'over');
      });
    }

    function slipp(brikke, mal) {
      var m = finnMal(mal);
      if (!m) return false;
      m.ta(brikke);
      avvelg();
      if (etterFlytt) etterFlytt();
      return true;
    }

    rot.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.brikke');
      if (!b || b.classList.contains('laast') || !rot.contains(b)) return;
      start = { x: e.clientX, y: e.clientY, brikke: b, flyttet: false };
      // Ikke alle nettlesere lar oss fange pekeren på et vilkårlig element.
      // Uten fangst virker dra fortsatt, så feilen skal ikke stoppe noe.
      try { b.setPointerCapture(e.pointerId); } catch (ignorert) {}
    });

    rot.addEventListener('pointermove', function (e) {
      if (!start) return;
      var dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!start.flyttet && dx * dx + dy * dy < 49) return;

      if (!start.flyttet) {
        start.flyttet = true;
        drar = start.brikke;
        var r = drar.getBoundingClientRect();
        klone = drar.cloneNode(true);
        klone.classList.add('drar');
        klone.style.width = r.width + 'px';
        klone.style.height = r.height + 'px';
        start.dx = e.clientX - r.left;
        start.dy = e.clientY - r.top;
        document.body.appendChild(klone);
        drar.style.opacity = '.3';
        velg(drar);
      }
      klone.style.left = (e.clientX - start.dx) + 'px';
      klone.style.top = (e.clientY - start.dy) + 'px';

      klone.style.display = 'none';
      var under = document.elementFromPoint(e.clientX, e.clientY);
      klone.style.display = '';
      rot.querySelectorAll('.mal').forEach(function (m) { m.classList.remove('over'); });
      var m = under && under.closest ? under.closest('.mal') : null;
      if (m && rot.contains(m)) m.classList.add('over');
    });

    function avslutt(e) {
      if (!start) return;
      var s = start; start = null;
      if (!s.flyttet) { velg(s.brikke); return; }

      klone.style.display = 'none';
      var under = document.elementFromPoint(e.clientX, e.clientY);
      klone.style.display = '';
      klone.remove(); klone = null;
      s.brikke.style.opacity = '';
      drar = null;

      var m = under && under.closest ? under.closest('.mal') : null;
      if (m && rot.contains(m)) slipp(s.brikke, m);
      else avvelg();
    }

    rot.addEventListener('pointerup', avslutt);
    rot.addEventListener('pointercancel', function () {
      if (klone) { klone.remove(); klone = null; }
      if (start && start.brikke) start.brikke.style.opacity = '';
      start = null; drar = null; avvelg();
    });

    /* trykk på et mål når en brikke er valgt */
    rot.addEventListener('click', function (e) {
      var m = e.target.closest('.mal');
      if (!m || !rot.contains(m) || !valgt) return;
      if (e.target.closest('.brikke') === valgt) return;
      slipp(valgt, m);
    });

    /* tastatur: mellomrom/enter velger, så velger man målet på samme måte */
    rot.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var b = e.target.closest('.brikke');
      var m = e.target.closest('.mal');
      if (b && !b.classList.contains('laast')) { e.preventDefault(); velg(b); }
      else if (m && valgt) { e.preventDefault(); slipp(valgt, m); }
    });

    return { avvelg: avvelg };
  }

  function lagBrikke(innhold, data) {
    var b = lag('span', 'brikke', vis(innhold));
    b.tabIndex = 0;
    b.setAttribute('role', 'button');
    if (data) for (var k in data) if (data.hasOwnProperty(k)) b.dataset[k] = data[k];
    return b;
  }

  // ------------------------------------------------------------------
  // oppgavetypene
  //
  // Hver bygger returnerer { sjekk: fn -> {ok, melding}, fasit: fn,
  //                          nullstill: fn }
  // ------------------------------------------------------------------

  var TYPER = {};

  /* ---- brøkfigur: klikk deler til figuren viser riktig brøk ---- */
  TYPER.brokfigur = function (d, kropp) {
    var pa = [], i;
    var rad = lag('div', 'figurrad');
    var boks = lag('div');
    var teller = lag('div', 'teller');
    var antall = lag('span', 'antall', '0');
    teller.appendChild(antall);
    teller.appendChild(lag('span', null, 'av ' + d.deler + ' deler'));

    var S = 210, m = S / 2;
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + S + ' ' + S, width: S, height: S,
      role: 'group', 'aria-label': 'Figur med ' + d.deler + ' like deler'
    });
    svg.setAttribute('class', 'brokfigur');
    // currentColor lar stilarket styre kapittelfargen, mens attributtene under
    // sikrer at figuren tegnes riktig også om stilarket ikke er lastet.
    svg.setAttribute('style', 'color: var(--kap, #1d4e89)');

    function oppdater() {
      antall.textContent = pa.filter(Boolean).length;
    }

    function delKlikk(k) {
      pa[k] = !pa[k];
      biter[k].classList.toggle('pa', pa[k]);
      biter[k].setAttribute('aria-pressed', pa[k] ? 'true' : 'false');
      oppdater();
    }

    var biter = [];
    if (d.form === 'sirkel') {
      var r = S / 2 - 6;
      for (i = 0; i < d.deler; i++) {
        var a1 = (i / d.deler) * 2 * Math.PI - Math.PI / 2;
        var a2 = ((i + 1) / d.deler) * 2 * Math.PI - Math.PI / 2;
        var stor = (a2 - a1) > Math.PI ? 1 : 0;
        var bane = d.deler === 1
          ? 'M ' + m + ' ' + (m - r) + ' A ' + r + ' ' + r + ' 0 1 1 ' + (m - 0.01) +
            ' ' + (m - r) + ' Z'
          : 'M ' + m + ' ' + m +
            ' L ' + (m + r * Math.cos(a1)) + ' ' + (m + r * Math.sin(a1)) +
            ' A ' + r + ' ' + r + ' 0 ' + stor + ' 1 ' +
            (m + r * Math.cos(a2)) + ' ' + (m + r * Math.sin(a2)) + ' Z';
        biter.push(svgEl('path', {
          d: bane, fill: '#fff', stroke: 'currentColor', 'stroke-width': 1.6
        }));
      }
    } else {
      /* rektangel eller strimmel: like brede kolonner */
      var h = d.form === 'strimmel' ? 64 : 150;
      var y = (S - h) / 2, b = (S - 12) / d.deler;
      for (i = 0; i < d.deler; i++) {
        biter.push(svgEl('rect', {
          x: 6 + i * b, y: y, width: b, height: h,
          fill: '#fff', stroke: 'currentColor', 'stroke-width': 1.6
        }));
      }
    }

    biter.forEach(function (el, k) {
      el.setAttribute('class', 'del');
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-pressed', 'false');
      el.setAttribute('aria-label', 'Del ' + (k + 1));
      el.addEventListener('click', function () { delKlikk(k); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); delKlikk(k); }
      });
      pa.push(false);
      svg.appendChild(el);
    });

    boks.appendChild(svg);
    rad.appendChild(boks);
    rad.appendChild(teller);
    kropp.appendChild(rad);

    return {
      sjekk: function () {
        var n = pa.filter(Boolean).length;
        if (n === d.mal) return { ok: true };
        return {
          ok: false,
          melding: n < d.mal
            ? 'Du har fargelagt ' + n + '. Telleren sier ' + d.mal + '.'
            : 'Du har fargelagt ' + n + '. Det er for mange — telleren sier ' + d.mal + '.'
        };
      },
      fasit: function () {
        biter.forEach(function (el, k) {
          pa[k] = k < d.mal;
          el.classList.toggle('pa', pa[k]);
          el.setAttribute('aria-pressed', pa[k] ? 'true' : 'false');
        });
        oppdater();
      },
      nullstill: function () {
        biter.forEach(function (el, k) {
          pa[k] = false; el.classList.remove('pa');
          el.setAttribute('aria-pressed', 'false');
        });
        oppdater();
      }
    };
  };

  /* ---- rutenett: klikk ruter ---- */
  TYPER.rutenett = function (d, kropp) {
    var n = d.bredde * d.hoyde, pa = [], ruter = [];
    var nett = lag('div', 'rutenett' + (d.bredde > 12 ? ' smaa' : ''));
    nett.style.gridTemplateColumns = 'repeat(' + d.bredde + ', auto)';
    var teller = lag('div', 'teller');
    var antall = lag('span', 'antall', '0');
    teller.appendChild(antall);
    teller.appendChild(lag('span', null, d.enhet || 'ruter'));

    function oppdater() { antall.textContent = pa.filter(Boolean).length; }

    for (var i = 0; i < n; i++) {
      (function (k) {
        var r = lag('button', 'rute');
        r.type = 'button';
        r.setAttribute('aria-label', 'Rute ' + (k + 1));
        r.setAttribute('aria-pressed', 'false');
        r.addEventListener('click', function () {
          pa[k] = !pa[k];
          r.classList.toggle('pa', pa[k]);
          r.setAttribute('aria-pressed', pa[k] ? 'true' : 'false');
          oppdater();
        });
        pa.push(false); ruter.push(r); nett.appendChild(r);
      })(i);
    }

    var rad = lag('div', 'figurrad');
    rad.appendChild(nett);
    rad.appendChild(teller);
    kropp.appendChild(rad);

    function valgte() {
      var ut = [];
      pa.forEach(function (v, k) { if (v) ut.push(k); });
      return ut;
    }

    /* Krever rektangelform når d.rektangel er satt — ellers bare antall. */
    function erRektangel(idx) {
      if (!idx.length) return false;
      var rader = idx.map(function (k) { return Math.floor(k / d.bredde); });
      var kol = idx.map(function (k) { return k % d.bredde; });
      var r0 = Math.min.apply(null, rader), r1 = Math.max.apply(null, rader);
      var k0 = Math.min.apply(null, kol), k1 = Math.max.apply(null, kol);
      return idx.length === (r1 - r0 + 1) * (k1 - k0 + 1);
    }

    return {
      sjekk: function () {
        var idx = valgte();
        if (idx.length !== d.mal) {
          return {
            ok: false,
            melding: 'Du har ' + idx.length + '. Du skal ha ' + d.mal + '.'
          };
        }
        if (d.rektangel && !erRektangel(idx)) {
          return { ok: false, melding: 'Antallet stemmer, men rutene må ligge som et rektangel.' };
        }
        return { ok: true };
      },
      fasit: function () {
        var mal = d.fasit || (function () {
          var ut = [], b = d.fasitbredde || d.bredde;
          for (var k = 0; k < d.mal; k++) {
            ut.push(Math.floor(k / b) * d.bredde + (k % b));
          }
          return ut;
        })();
        ruter.forEach(function (r, k) {
          pa[k] = mal.indexOf(k) > -1;
          r.classList.toggle('pa', pa[k]);
          r.setAttribute('aria-pressed', pa[k] ? 'true' : 'false');
        });
        oppdater();
      },
      nullstill: function () {
        ruter.forEach(function (r, k) {
          pa[k] = false; r.classList.remove('pa');
          r.setAttribute('aria-pressed', 'false');
        });
        oppdater();
      }
    };
  };

  /* ---- tallinje: dra merket ---- */
  TYPER.tallinje = function (d, kropp) {
    var B = 640, H = 130, V = 40, Hy = 66;
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + B + ' ' + H, role: 'group',
      'aria-label': 'Tallinje fra ' + tall(d.fra) + ' til ' + tall(d.til)
    });
    svg.setAttribute('class', 'tallinje');
    svg.setAttribute('style', 'color: var(--kap, #1d4e89)');

    function x(v) { return V + (v - d.fra) / (d.til - d.fra) * (B - 2 * V); }
    function verdi(px) { return d.fra + (px - V) / (B - 2 * V) * (d.til - d.fra); }

    var akse = svgEl('line', {
      x1: V, y1: Hy, x2: B - V, y2: Hy, stroke: '#1f2430', 'stroke-width': 2
    });
    akse.setAttribute('class', 'akse');
    svg.appendChild(akse);

    var steg = d.hakk || (d.til - d.fra) / 4;
    for (var v = d.fra; v <= d.til + 1e-9; v += steg) {
      var merket = d.merker ? d.merker.some(function (m) { return Math.abs(m - v) < 1e-9; }) : true;
      var l = svgEl('line', {
        x1: x(v), y1: Hy - (merket ? 11 : 6), x2: x(v), y2: Hy + (merket ? 11 : 6),
        stroke: merket ? '#1f2430' : '#9aa3ad', 'stroke-width': merket ? 1.6 : 1.2
      });
      l.setAttribute('class', merket ? 'hakk' : 'smahakk');
      svg.appendChild(l);
      if (merket) {
        var t = svgEl('text', {
          x: x(v), y: Hy + 30, fill: '#1f2430', 'text-anchor': 'middle', 'font-size': 13
        });
        t.setAttribute('class', 'merkelapp');
        t.textContent = d.etikett === 'prosent' ? tall(Math.round(v)) + ' %' : tall(+v.toFixed(4));
        svg.appendChild(t);
      }
    }

    var naa = d.start !== undefined ? d.start : d.fra;
    var brikke = svgEl('polygon', {
      points: '0,0 -11,-19 11,-19', tabindex: '0', role: 'slider', fill: 'currentColor'
    });
    brikke.setAttribute('class', 'brikke');
    brikke.setAttribute('aria-label', 'Dra merket til rett plass');
    svg.appendChild(brikke);

    function tegn() {
      brikke.setAttribute('transform', 'translate(' + x(naa) + ',' + (Hy - 3) + ')');
      brikke.setAttribute('aria-valuenow', String(+naa.toFixed(4)));
    }
    tegn();

    function fraHendelse(e) {
      var r = svg.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width * B;
      naa = Math.max(d.fra, Math.min(d.til, verdi(px)));
      if (d.fest) naa = Math.round(naa / d.fest) * d.fest;
      tegn();
    }

    var aktiv = false;
    svg.addEventListener('pointerdown', function (e) {
      aktiv = true;
      try { svg.setPointerCapture(e.pointerId); } catch (ignorert) {}
      fraHendelse(e);
    });
    svg.addEventListener('pointermove', function (e) { if (aktiv) fraHendelse(e); });
    svg.addEventListener('pointerup', function () { aktiv = false; });
    svg.addEventListener('pointercancel', function () { aktiv = false; });

    brikke.addEventListener('keydown', function (e) {
      var s = d.fest || (d.til - d.fra) / 100;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') naa = Math.min(d.til, naa + s);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') naa = Math.max(d.fra, naa - s);
      else return;
      e.preventDefault(); tegn();
    });

    kropp.appendChild(svg);
    kropp.appendChild(lag('p', 'tallinjehjelp',
      'Dra merket, eller bruk piltastene.'));

    var tol = d.toleranse !== undefined ? d.toleranse : (d.til - d.fra) / 50;

    return {
      sjekk: function () {
        if (Math.abs(naa - d.mal) <= tol + 1e-9) return { ok: true };
        return {
          ok: false,
          melding: naa < d.mal ? 'Litt for langt til venstre.' : 'Litt for langt til høyre.'
        };
      },
      fasit: function () {
        naa = d.mal; tegn();
        var f = svgEl('circle', { cx: x(d.mal), cy: Hy, r: 6, fill: '#2e7d32' });
        f.setAttribute('class', 'fasitmerke');
        svg.appendChild(f);
      },
      nullstill: function () {
        naa = d.start !== undefined ? d.start : d.fra; tegn();
        var f = svg.querySelector('.fasitmerke');
        if (f) f.remove();
      }
    };
  };

  /* ---- par: koble to og to ---- */
  TYPER.par = function (d, kropp) {
    var liste = lag('div', 'parliste');
    var lager = lag('div', 'brikkelager mal');
    lager.dataset.rolle = 'lager';

    var rader = d.par.map(function (p, i) {
      var rad = lag('div', 'parrad');
      rad.appendChild(lag('div', 'fast', vis(p.v)));
      rad.appendChild(lag('div', 'pil', '→'));
      var plass = lag('div', 'plass mal');
      plass.dataset.svar = String(i);
      plass.tabIndex = 0;
      rad.appendChild(plass);
      liste.appendChild(rad);
      return { rad: rad, plass: plass };
    });

    blandUlikt(d.par.map(function (p, i) { return i; }), function (r) {
      return r.every(function (v, i) { return v === i; });
    }).forEach(function (i) {
      lager.appendChild(lagBrikke(d.par[i].h, { svar: String(i) }));
    });

    kropp.appendChild(liste);
    kropp.appendChild(lager);

    function finnMal(el) {
      if (el === lager) {
        return { ta: function (b) { lager.appendChild(b); } };
      }
      if (el.classList.contains('plass')) {
        return {
          ta: function (b) {
            var gammel = el.querySelector('.brikke');
            if (gammel) lager.appendChild(gammel);
            el.appendChild(b);
          }
        };
      }
      return null;
    }

    brikkemotor(kropp, finnMal, function () {
      lager.classList.toggle('tom', !lager.querySelector('.brikke'));
      rader.forEach(function (r) { r.rad.classList.remove('riktig', 'feil'); });
    });

    return {
      sjekk: function () {
        var feil = 0, mangler = 0;
        rader.forEach(function (r, i) {
          var b = r.plass.querySelector('.brikke');
          if (!b) { mangler++; return; }
          var ok = b.dataset.svar === String(i);
          r.rad.classList.add(ok ? 'riktig' : 'feil');
          if (!ok) feil++;
        });
        if (mangler) {
          return { ok: false, melding: 'Du mangler ' + mangler + ' av ' + rader.length + '.' };
        }
        if (feil) {
          return {
            ok: false,
            melding: feil + ' av ' + rader.length + ' står feil. De gule er ikke riktige.'
          };
        }
        return { ok: true };
      },
      fasit: function () {
        rader.forEach(function (r, i) {
          var b = kropp.querySelector('.brikke[data-svar="' + i + '"]');
          r.plass.appendChild(b);
          b.classList.add('laast');
          r.rad.classList.remove('feil');
          r.rad.classList.add('riktig');
        });
        lager.classList.add('tom');
      },
      nullstill: function () {
        rader.forEach(function (r) {
          r.rad.classList.remove('riktig', 'feil');
          var b = r.plass.querySelector('.brikke');
          if (b) { b.classList.remove('laast'); lager.appendChild(b); }
        });
        lager.classList.remove('tom');
      }
    };
  };

  /* ---- merk: sett navn på deler av en figur ----
     Figuren står øverst med nummererte punkter. Under er én rad per nummer,
     og ordbrikkene legges i radene — samme grep som i par. Å skrive ordet
     rett inn i figuren ville vært penere, men blir for smått på en telefon
     og umulig med tastatur. Ekstra brikker (d.ekstra) passer ingen steder.

     d.svg      figuren som tekst, med viewBox
     d.punkter  [{x, y, svar}] i figurens koordinater
     d.ekstra   ord som ikke hører til noe punkt (valgfritt) */
  TYPER.merk = function (d, kropp) {
    var ramme = lag('div', 'merkfigur');
    ramme.innerHTML = d.svg;
    var svg = ramme.querySelector('svg');
    svg.setAttribute('role', 'img');
    if (!svg.getAttribute('aria-label')) svg.setAttribute('aria-label', 'Figur med nummererte deler');

    // Punktene skaleres med figuren, så de er store nok også på en telefon.
    var vb = (svg.getAttribute('viewBox') || '0 0 620 360').split(/[\s,]+/);
    var R = Math.max(13, Math.round(+vb[2] * 0.032));

    var markorer = d.punkter.map(function (p, i) {
      var g = svgEl('g', { 'class': 'merkpunkt' });
      g.appendChild(svgEl('circle', {
        cx: p.x, cy: p.y, r: R, fill: '#1f2430', stroke: '#fff', 'stroke-width': 2.5
      }));
      var tx = svgEl('text', {
        x: p.x, y: p.y + R * 0.4, 'text-anchor': 'middle', 'font-size': Math.round(R * 1.15),
        'font-family': 'Arial, sans-serif', 'font-weight': 'bold', fill: '#fff'
      });
      tx.textContent = String(i + 1);
      g.appendChild(tx);
      svg.appendChild(g);
      return g;
    });

    var liste = lag('div', 'parliste merkliste');
    var lager = lag('div', 'brikkelager mal');

    var rader = d.punkter.map(function (p, i) {
      var rad = lag('div', 'parrad merkrad');
      rad.appendChild(lag('div', 'fast nummer', String(i + 1)));
      var plass = lag('div', 'plass mal');
      plass.dataset.svar = String(i);
      plass.tabIndex = 0;
      plass.setAttribute('aria-label', 'Navn på del ' + (i + 1));
      rad.appendChild(plass);
      liste.appendChild(rad);
      // Vis hvilket punkt raden gjelder mens eleven er i den.
      ['mouseenter', 'focusin'].forEach(function (ev) {
        rad.addEventListener(ev, function () { markorer[i].classList.add('aktiv'); });
      });
      ['mouseleave', 'focusout'].forEach(function (ev) {
        rad.addEventListener(ev, function () { markorer[i].classList.remove('aktiv'); });
      });
      return { rad: rad, plass: plass };
    });

    var brikker = d.punkter.map(function (p, i) { return { vis: p.svar, svar: String(i) }; })
      .concat((d.ekstra || []).map(function (e) { return { vis: e, svar: 'x' }; }));
    blandUlikt(brikker, function (r) {
      return r.every(function (b, i) { return b.svar === String(i); });
    }).forEach(function (b) {
      lager.appendChild(lagBrikke(b.vis, { svar: b.svar }));
    });

    kropp.appendChild(ramme);
    kropp.appendChild(liste);
    kropp.appendChild(lager);

    function finnMal(el) {
      if (el === lager) return { ta: function (b) { lager.appendChild(b); } };
      if (el.classList.contains('plass')) {
        return {
          ta: function (b) {
            var gammel = el.querySelector('.brikke');
            if (gammel) lager.appendChild(gammel);
            el.appendChild(b);
          }
        };
      }
      return null;
    }

    function merkPunkt(i, klasse) {
      markorer[i].classList.remove('riktig', 'feil');
      if (klasse) markorer[i].classList.add(klasse);
    }

    brikkemotor(kropp, finnMal, function () {
      lager.classList.toggle('tom', !lager.querySelector('.brikke'));
      rader.forEach(function (r, i) { r.rad.classList.remove('riktig', 'feil'); merkPunkt(i, null); });
    });

    return {
      sjekk: function () {
        var feil = 0, mangler = 0;
        rader.forEach(function (r, i) {
          var b = r.plass.querySelector('.brikke');
          if (!b) { mangler++; return; }
          var ok = b.dataset.svar === String(i);
          r.rad.classList.add(ok ? 'riktig' : 'feil');
          merkPunkt(i, ok ? 'riktig' : 'feil');
          if (!ok) feil++;
        });
        if (mangler) {
          return { ok: false, melding: 'Du mangler navn på ' + mangler + ' av ' + rader.length + ' deler.' };
        }
        if (feil) {
          return { ok: false, melding: feil + ' av ' + rader.length + ' navn står feil. De gule er ikke riktige.' };
        }
        return { ok: true };
      },
      fasit: function () {
        rader.forEach(function (r, i) {
          var gammel = r.plass.querySelector('.brikke');
          if (gammel) lager.appendChild(gammel);
          var b = kropp.querySelector('.brikkelager .brikke[data-svar="' + i + '"]');
          r.plass.appendChild(b);
          b.classList.add('laast');
          r.rad.classList.remove('feil');
          r.rad.classList.add('riktig');
          merkPunkt(i, 'riktig');
        });
        lager.querySelectorAll('.brikke').forEach(function (b) { b.classList.add('laast'); });
      },
      nullstill: function () {
        rader.forEach(function (r, i) {
          r.rad.classList.remove('riktig', 'feil');
          merkPunkt(i, null);
          var b = r.plass.querySelector('.brikke');
          if (b) lager.appendChild(b);
        });
        lager.querySelectorAll('.brikke').forEach(function (b) { b.classList.remove('laast'); });
        lager.classList.remove('tom');
      }
    };
  };

  /* ---- kurver: sorter brikker i bokser ---- */
  TYPER.kurver = function (d, kropp) {
    var rad = lag('div', 'kurvrad');
    var lager = lag('div', 'brikkelager mal');
    lager.dataset.rolle = 'lager';

    var kurver = d.kurver.map(function (navn, i) {
      var k = lag('div', 'kurv');
      k.appendChild(lag('h4', null, vis(navn)));
      var innhold = lag('div', 'innhold mal');
      innhold.dataset.kurv = String(i);
      innhold.tabIndex = 0;
      k.appendChild(innhold);
      rad.appendChild(k);
      return { boks: k, innhold: innhold };
    });

    bland(d.brikker).forEach(function (b) {
      lager.appendChild(lagBrikke(b.vis, { kurv: String(b.kurv) }));
    });

    kropp.appendChild(rad);
    kropp.appendChild(lager);

    function finnMal(el) {
      if (el === lager) return { ta: function (b) { lager.appendChild(b); } };
      if (el.classList.contains('innhold')) {
        return { ta: function (b) { el.appendChild(b); } };
      }
      return null;
    }

    brikkemotor(kropp, finnMal, function () {
      lager.classList.toggle('tom', !lager.querySelector('.brikke'));
      kropp.querySelectorAll('.brikke').forEach(function (b) {
        b.classList.remove('feilplassert');
      });
      kurver.forEach(function (k) { k.boks.classList.remove('riktig'); });
    });

    return {
      sjekk: function () {
        var igjen = lager.querySelectorAll('.brikke').length;
        if (igjen) return { ok: false, melding: 'Du har ' + igjen + ' brikker igjen.' };
        var feil = 0;
        kurver.forEach(function (k, i) {
          var alleOk = true;
          k.innhold.querySelectorAll('.brikke').forEach(function (b) {
            if (b.dataset.kurv !== String(i)) {
              b.classList.add('feilplassert'); feil++; alleOk = false;
            }
          });
          if (alleOk) k.boks.classList.add('riktig');
        });
        if (feil) return { ok: false, melding: feil + ' brikker ligger i feil boks. De er gule.' };
        return { ok: true };
      },
      fasit: function () {
        kropp.querySelectorAll('.brikke').forEach(function (b) {
          kurver[+b.dataset.kurv].innhold.appendChild(b);
          b.classList.remove('feilplassert');
          b.classList.add('laast');
        });
        kurver.forEach(function (k) { k.boks.classList.add('riktig'); });
        lager.classList.add('tom');
      },
      nullstill: function () {
        kurver.forEach(function (k) { k.boks.classList.remove('riktig'); });
        kropp.querySelectorAll('.brikke').forEach(function (b) {
          b.classList.remove('feilplassert', 'laast');
          lager.appendChild(b);
        });
        lager.classList.remove('tom');
      }
    };
  };

  /* ---- sorter: bytt plass på to og to ---- */
  TYPER.sorter = function (d, kropp) {
    var rad = lag('div', 'sorterrad');
    var fasit = d.elementer.slice().sort(function (a, b) {
      return d.retning === 'synkende' ? b.verdi - a.verdi : a.verdi - b.verdi;
    });

    function tegn(rekke) {
      rad.innerHTML = '';
      rekke.forEach(function (e) {
        var b = lagBrikke(e.vis, { verdi: String(e.verdi) });
        b.classList.add('mal');
        rad.appendChild(b);
      });
    }

    tegn(blandUlikt(d.elementer, function (r) {
      return r.every(function (e, i) { return e.verdi === fasit[i].verdi; });
    }));

    kropp.appendChild(rad);
    var piler = lag('div', 'sorterpiler');
    piler.appendChild(lag('span', null,
      d.retning === 'synkende' ? '◀ størst' : '◀ minst'));
    piler.appendChild(lag('span', null,
      d.retning === 'synkende' ? 'minst ▶' : 'størst ▶'));
    kropp.appendChild(piler);

    /* Å bytte plass på to brikker er lettere å treffe på et nettbrett
       enn å skyve en brikke inn mellom to andre. */
    brikkemotor(kropp, function (el) {
      if (!el.classList.contains('brikke')) return null;
      return {
        ta: function (b) {
          if (b === el) return;
          var etter = el.nextSibling === b ? b.nextSibling : el.nextSibling;
          var bEtter = b.nextSibling;
          rad.insertBefore(b, el);
          rad.insertBefore(el, bEtter === b ? etter : bEtter);
        }
      };
    }, function () {
      rad.querySelectorAll('.brikke').forEach(function (b) {
        b.classList.remove('paplass');
      });
    });

    function naa() {
      return Array.prototype.map.call(rad.querySelectorAll('.brikke'), function (b) {
        return +b.dataset.verdi;
      });
    }

    return {
      sjekk: function () {
        var r = naa(), feil = 0;
        rad.querySelectorAll('.brikke').forEach(function (b, i) {
          if (Math.abs(r[i] - fasit[i].verdi) < 1e-9) b.classList.add('paplass');
          else feil++;
        });
        if (feil) {
          return {
            ok: false,
            melding: feil + ' står ikke på plass. De grønne er riktige — bytt om på de andre.'
          };
        }
        return { ok: true };
      },
      fasit: function () {
        tegn(fasit);
        rad.querySelectorAll('.brikke').forEach(function (b) {
          b.classList.add('paplass', 'laast');
        });
      },
      nullstill: function () {
        tegn(blandUlikt(d.elementer, function (r) {
          return r.every(function (e, i) { return e.verdi === fasit[i].verdi; });
        }));
      }
    };
  };


  /* ---- trekant: dra katetene til hypotenusen stemmer ----
     Poenget er å kjenne sammenhengen på fingrene: gjør du den ene kateten
     lengre, må den andre bli kortere for at hypotenusen skal holde seg.
     Utregningen a² + b² står under figuren og oppdateres mens du drar. */
  TYPER.trekant = function (d, kropp) {
    var maks = d.maks || 12, R = 26, M = 40;
    var B = M + maks * R + 30, H = M + maks * R + 30;
    var a = d.startA || 1, b = d.startB || 1;

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + B + ' ' + H, role: 'group',
      'aria-label': 'Rettvinklet trekant du kan endre'
    });
    svg.setAttribute('class', 'trekant');
    svg.setAttribute('style', 'color: var(--kap, #1d4e89)');

    function px(v) { return M + v * R; }          // vannrett
    function py(v) { return H - M - v * R; }      // loddrett, null nederst

    // rutenett
    for (var i = 0; i <= maks; i++) {
      var l1 = svgEl('line', { x1: px(i), y1: py(0), x2: px(i), y2: py(maks),
                               stroke: '#e3e7eb', 'stroke-width': 1 });
      var l2 = svgEl('line', { x1: px(0), y1: py(i), x2: px(maks), y2: py(i),
                               stroke: '#e3e7eb', 'stroke-width': 1 });
      svg.appendChild(l1); svg.appendChild(l2);
    }

    var flate = svgEl('polygon', { fill: 'currentColor', 'fill-opacity': .16 });
    svg.appendChild(flate);
    var kantA = svgEl('line', { stroke: 'currentColor', 'stroke-width': 3 });
    var kantB = svgEl('line', { stroke: 'currentColor', 'stroke-width': 3 });
    var hyp = svgEl('line', { stroke: '#1f2430', 'stroke-width': 3 });
    [kantA, kantB, hyp].forEach(function (e) { svg.appendChild(e); });

    var rettvinkel = svgEl('path', { fill: 'none', stroke: '#1f2430', 'stroke-width': 1.6 });
    svg.appendChild(rettvinkel);

    var merkeA = svgEl('text', { fill: '#1f2430', 'font-size': 14, 'text-anchor': 'end' });
    var merkeB = svgEl('text', { fill: '#1f2430', 'font-size': 14, 'text-anchor': 'middle' });
    var merkeC = svgEl('text', { fill: '#1f2430', 'font-size': 14, 'text-anchor': 'start' });
    [merkeA, merkeB, merkeC].forEach(function (e) { svg.appendChild(e); });

    function haandtak(etikett) {
      var g = svgEl('circle', {
        r: 9, fill: 'currentColor', stroke: '#fff', 'stroke-width': 2,
        tabindex: '0', role: 'slider', 'aria-label': etikett
      });
      g.setAttribute('class', 'grep');
      svg.appendChild(g);
      return g;
    }
    var grepA = haandtak('Dra for å endre den loddrette siden');
    var grepB = haandtak('Dra for å endre den vannrette siden');

    var utregning = lag('p', 'utregning');
    kropp.appendChild(svg);
    kropp.appendChild(utregning);

    function tegn() {
      var x0 = px(0), y0 = py(0), xb = px(b), ya = py(a);
      flate.setAttribute('points', x0 + ',' + y0 + ' ' + xb + ',' + y0 + ' ' + x0 + ',' + ya);
      kantB.setAttribute('x1', x0); kantB.setAttribute('y1', y0);
      kantB.setAttribute('x2', xb); kantB.setAttribute('y2', y0);
      kantA.setAttribute('x1', x0); kantA.setAttribute('y1', y0);
      kantA.setAttribute('x2', x0); kantA.setAttribute('y2', ya);
      hyp.setAttribute('x1', xb); hyp.setAttribute('y1', y0);
      hyp.setAttribute('x2', x0); hyp.setAttribute('y2', ya);
      rettvinkel.setAttribute('d', 'M ' + (x0 + 14) + ' ' + y0 +
        ' L ' + (x0 + 14) + ' ' + (y0 - 14) + ' L ' + x0 + ' ' + (y0 - 14));
      grepA.setAttribute('cx', x0); grepA.setAttribute('cy', ya);
      grepB.setAttribute('cx', xb); grepB.setAttribute('cy', y0);
      grepA.setAttribute('aria-valuenow', String(a));
      grepB.setAttribute('aria-valuenow', String(b));
      merkeA.setAttribute('x', x0 - 10); merkeA.setAttribute('y', (y0 + ya) / 2 + 5);
      merkeA.textContent = a;
      merkeB.setAttribute('x', (x0 + xb) / 2); merkeB.setAttribute('y', y0 + 22);
      merkeB.textContent = b;
      merkeC.setAttribute('x', (x0 + xb) / 2 + 12); merkeC.setAttribute('y', (y0 + ya) / 2 - 8);

      var sum = a * a + b * b, rot = Math.sqrt(sum);
      var hel = Math.abs(rot - Math.round(rot)) < 1e-9;
      merkeC.textContent = hel ? Math.round(rot) : rot.toFixed(2).replace('.', ',');
      utregning.innerHTML = a + '<sup>2</sup> + ' + b + '<sup>2</sup> = ' +
        (a * a) + ' + ' + (b * b) + ' = <strong>' + sum + '</strong>' +
        ' &nbsp;·&nbsp; c = √' + sum + ' = <strong>' + merkeC.textContent + '</strong>';
    }
    tegn();

    var drar = null;
    function naermest(e) {
      var r = svg.getBoundingClientRect();
      var mx = (e.clientX - r.left) / r.width * B, my = (e.clientY - r.top) / r.height * H;
      var dA = Math.hypot(mx - px(0), my - py(a)), dB = Math.hypot(mx - px(b), my - py(0));
      return { hvem: dA < dB ? 'a' : 'b', mx: mx, my: my };
    }
    function flytt(e) {
      var n = naermest(e);
      if (!drar) drar = n.hvem;
      if (drar === 'a') a = Math.max(1, Math.min(maks, Math.round((py(0) - n.my) / R)));
      else b = Math.max(1, Math.min(maks, Math.round((n.mx - px(0)) / R)));
      tegn();
    }
    svg.addEventListener('pointerdown', function (e) {
      drar = null;
      try { svg.setPointerCapture(e.pointerId); } catch (ignorert) {}
      flytt(e);
    });
    svg.addEventListener('pointermove', function (e) { if (drar) flytt(e); });
    svg.addEventListener('pointerup', function () { drar = null; });
    svg.addEventListener('pointercancel', function () { drar = null; });

    grepA.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') a = Math.min(maks, a + 1);
      else if (e.key === 'ArrowDown') a = Math.max(1, a - 1);
      else return;
      e.preventDefault(); tegn();
    });
    grepB.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') b = Math.min(maks, b + 1);
      else if (e.key === 'ArrowLeft') b = Math.max(1, b - 1);
      else return;
      e.preventDefault(); tegn();
    });

    function losning() {
      if (d.fasit) return d.fasit;
      for (var i = 1; i <= maks; i++) {
        for (var j = 1; j <= maks; j++) {
          if (i * i + j * j === d.mal * d.mal) return [i, j];
        }
      }
      return [a, b];
    }

    return {
      sjekk: function () {
        var sum = a * a + b * b, m = d.mal * d.mal;
        if (sum === m) return { ok: true };
        return {
          ok: false,
          melding: sum < m
            ? 'Hypotenusen er for kort. Gjør en av sidene lengre.'
            : 'Hypotenusen er for lang. Gjør en av sidene kortere.'
        };
      },
      fasit: function () { var l = losning(); a = l[0]; b = l[1]; tegn(); },
      nullstill: function () { a = d.startA || 1; b = d.startB || 1; tegn(); }
    };
  };

  /* ---- koordinat: sett et punkt, eller lag en linje ----
     To oppgaveformer i samme rutenett. «punkt» er å plassere ett merke.
     «linje» har to grep: ett på y-aksen som gir konstantleddet, og ett fritt
     som gir stigningen. Uttrykket for linja står under og oppdateres mens
     du drar, slik at eleven ser hva grepene gjør med formelen. */
  TYPER.koordinat = function (d, kropp) {
    var fra = d.fra || 0, til = d.til || 6, R = 34, M = 34;
    var n = til - fra;
    var B = M + n * R + 26, H = M + n * R + 26;
    var linje = d.form === 'linje';

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + B + ' ' + H, role: 'group',
      'aria-label': 'Koordinatsystem'
    });
    svg.setAttribute('class', 'koordinat');
    svg.setAttribute('style', 'color: var(--kap, #1d4e89)');

    function px(v) { return M + (v - fra) * R; }
    function py(v) { return H - M - (v - fra) * R; }

    for (var i = fra; i <= til; i++) {
      svg.appendChild(svgEl('line', { x1: px(i), y1: py(fra), x2: px(i), y2: py(til),
                                      stroke: '#e3e7eb', 'stroke-width': 1 }));
      svg.appendChild(svgEl('line', { x1: px(fra), y1: py(i), x2: px(til), y2: py(i),
                                      stroke: '#e3e7eb', 'stroke-width': 1 }));
      var tx = svgEl('text', { x: px(i), y: py(fra) + 18, fill: '#5a6272',
                               'font-size': 12, 'text-anchor': 'middle' });
      tx.textContent = i;
      svg.appendChild(tx);
      if (i > fra) {
        var ty = svgEl('text', { x: px(fra) - 9, y: py(i) + 4, fill: '#5a6272',
                                 'font-size': 12, 'text-anchor': 'end' });
        ty.textContent = i;
        svg.appendChild(ty);
      }
    }
    svg.appendChild(svgEl('line', { x1: px(fra), y1: py(fra), x2: px(til), y2: py(fra),
                                    stroke: '#1f2430', 'stroke-width': 2 }));
    svg.appendChild(svgEl('line', { x1: px(fra), y1: py(fra), x2: px(fra), y2: py(til),
                                    stroke: '#1f2430', 'stroke-width': 2 }));

    var strek = svgEl('line', { stroke: 'currentColor', 'stroke-width': 3 });
    if (linje) svg.appendChild(strek);

    function grep(etikett) {
      var g = svgEl('circle', { r: 10, fill: 'currentColor', stroke: '#fff',
                                'stroke-width': 2, tabindex: '0', role: 'slider',
                                'aria-label': etikett });
      g.setAttribute('class', 'grep');
      svg.appendChild(g);
      return g;
    }

    var p0 = { x: fra, y: d.start0 !== undefined ? d.start0 : fra };
    var p1 = { x: d.start1 ? d.start1[0] : fra + 1, y: d.start1 ? d.start1[1] : fra + 1 };
    var punkt = { x: d.startpunkt ? d.startpunkt[0] : fra, y: d.startpunkt ? d.startpunkt[1] : fra };

    var grep0 = linje ? grep('Dra langs y-aksen for å flytte linja opp og ned') : null;
    var grep1 = grep(linje ? 'Dra for å endre hvor bratt linja er' : 'Dra punktet på plass');

    var utregning = lag('p', 'utregning');
    kropp.appendChild(svg);
    kropp.appendChild(utregning);

    function stigning() { return (p1.y - p0.y) / (p1.x - p0.x); }

    function skrivLinje() {
      var s = stigning(), b0 = p0.y;
      function t(v) {
        return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
      }
      var ut = 'y = ';
      ut += s === 1 ? 'x' : (s === -1 ? '−x' : t(s) + 'x');
      if (b0 > 0) ut += ' + ' + t(b0);
      else if (b0 < 0) ut += ' − ' + t(-b0);
      utregning.innerHTML = '<strong>' + ut + '</strong>';
    }

    function tegn() {
      if (linje) {
        var s = stigning();
        // Klipp streken til rutenettet. Uten dette stikker en bratt linje
        // langt utenfor rammen og ser ut som en feil.
        var xa = fra, xb = til;
        if (s !== 0) {
          var xLav = p0.x + (fra - p0.y) / s, xHoy = p0.x + (til - p0.y) / s;
          xa = Math.max(fra, Math.min(xLav, xHoy));
          xb = Math.min(til, Math.max(xLav, xHoy));
          if (xa > xb) { xa = xb = p0.x; }
        }
        strek.setAttribute('x1', px(xa)); strek.setAttribute('y1', py(p0.y + s * (xa - p0.x)));
        strek.setAttribute('x2', px(xb)); strek.setAttribute('y2', py(p0.y + s * (xb - p0.x)));
        grep0.setAttribute('cx', px(p0.x)); grep0.setAttribute('cy', py(p0.y));
        grep1.setAttribute('cx', px(p1.x)); grep1.setAttribute('cy', py(p1.y));
        grep0.setAttribute('aria-valuenow', String(p0.y));
        grep1.setAttribute('aria-valuenow', String(p1.y));
        skrivLinje();
      } else {
        grep1.setAttribute('cx', px(punkt.x)); grep1.setAttribute('cy', py(punkt.y));
        utregning.innerHTML = 'Punktet står på <strong>(' + punkt.x + ', ' + punkt.y + ')</strong>';
      }
    }
    tegn();

    function begrens(v, lav) { return Math.max(lav, Math.min(til, v)); }

    var drar = null;
    function flytt(e) {
      var r = svg.getBoundingClientRect();
      var mx = (e.clientX - r.left) / r.width * B, my = (e.clientY - r.top) / r.height * H;
      var gx = begrens(Math.round((mx - M) / R) + fra, fra);
      var gy = begrens(Math.round((H - M - my) / R) + fra, fra);
      if (!linje) { punkt.x = gx; punkt.y = gy; tegn(); return; }
      if (drar === null) {
        var d0 = Math.hypot(mx - px(p0.x), my - py(p0.y));
        var d1 = Math.hypot(mx - px(p1.x), my - py(p1.y));
        drar = d0 < d1 ? 0 : 1;
      }
      if (drar === 0) p0.y = gy;                        // låst til y-aksen
      else { p1.x = begrens(gx, fra + 1); p1.y = gy; }
      tegn();
    }
    svg.addEventListener('pointerdown', function (e) {
      drar = null;
      try { svg.setPointerCapture(e.pointerId); } catch (ignorert) {}
      flytt(e);
    });
    svg.addEventListener('pointermove', function (e) { if (drar !== null || !linje) flytt(e); });
    svg.addEventListener('pointerup', function () { drar = null; });
    svg.addEventListener('pointercancel', function () { drar = null; });

    function piler(el, les, skriv, vannrett) {
      el.addEventListener('keydown', function (e) {
        var p = les();
        if (e.key === 'ArrowUp') p.y = begrens(p.y + 1, fra);
        else if (e.key === 'ArrowDown') p.y = begrens(p.y - 1, fra);
        else if (vannrett && e.key === 'ArrowRight') p.x = begrens(p.x + 1, fra + (linje ? 1 : 0));
        else if (vannrett && e.key === 'ArrowLeft') p.x = begrens(p.x - 1, fra + (linje ? 1 : 0));
        else return;
        e.preventDefault(); skriv(p); tegn();
      });
    }
    if (linje) {
      piler(grep0, function () { return p0; }, function (p) { p0 = p; }, false);
      piler(grep1, function () { return p1; }, function (p) { p1 = p; }, true);
    } else {
      piler(grep1, function () { return punkt; }, function (p) { punkt = p; }, true);
    }

    return {
      sjekk: function () {
        if (!linje) {
          if (punkt.x === d.mal[0] && punkt.y === d.mal[1]) return { ok: true };
          if (punkt.x !== d.mal[0] && punkt.y !== d.mal[1]) {
            return { ok: false, melding: 'Både x og y er feil. Gå bortover først, så oppover.' };
          }
          return {
            ok: false,
            melding: punkt.x !== d.mal[0]
              ? 'y stemmer, men x er feil. Det første tallet er hvor langt bortover du går.'
              : 'x stemmer, men y er feil. Det andre tallet er hvor langt oppover du går.'
          };
        }
        var s = stigning(), k = p0.y;
        if (Math.abs(s - d.stigning) < 1e-9 && k === d.konstant) return { ok: true };
        if (k !== d.konstant) {
          return { ok: false, melding: 'Linja krysser y-aksen på feil sted.' };
        }
        return {
          ok: false,
          melding: s < d.stigning ? 'Linja er for slak.' : 'Linja er for bratt.'
        };
      },
      fasit: function () {
        if (!linje) { punkt.x = d.mal[0]; punkt.y = d.mal[1]; }
        else {
          p0 = { x: fra, y: d.konstant };
          var x = fra + 1;
          while (x <= til && d.konstant + d.stigning * (x - fra) > til) x++;
          p1 = { x: x, y: d.konstant + d.stigning * (x - fra) };
        }
        tegn();
      },
      nullstill: function () {
        p0 = { x: fra, y: d.start0 !== undefined ? d.start0 : fra };
        p1 = { x: d.start1 ? d.start1[0] : fra + 1, y: d.start1 ? d.start1[1] : fra + 1 };
        punkt = { x: d.startpunkt ? d.startpunkt[0] : fra,
                  y: d.startpunkt ? d.startpunkt[1] : fra };
        tegn();
      }
    };
  };

  /* ---- velg: trykk på riktig svar ---- */
  TYPER.velg = function (d, kropp) {
    var rad = lag('div', 'valgrad');
    var flere = d.alternativer.filter(function (a) { return a.riktig; }).length > 1;
    var knapper = bland(d.alternativer).map(function (a) {
      var b = lag('button', 'valg', vis(a.vis));
      b.type = 'button';
      b.dataset.riktig = a.riktig ? '1' : '';
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        if (!flere) {
          rad.querySelectorAll('.valg').forEach(function (k) {
            k.classList.remove('valgt'); k.setAttribute('aria-pressed', 'false');
          });
        }
        b.classList.toggle('valgt');
        b.setAttribute('aria-pressed', b.classList.contains('valgt') ? 'true' : 'false');
        rad.querySelectorAll('.valg').forEach(function (k) {
          k.classList.remove('erriktig', 'erfeil');
        });
      });
      rad.appendChild(b);
      return b;
    });
    kropp.appendChild(rad);
    if (flere) {
      kropp.appendChild(lag('p', 'tallinjehjelp', 'Flere svar er riktige.'));
    }

    return {
      sjekk: function () {
        var valgt = knapper.filter(function (b) { return b.classList.contains('valgt'); });
        if (!valgt.length) return { ok: false, melding: 'Trykk på et svar først.' };
        var feil = 0, mangler = 0;
        knapper.forEach(function (b) {
          var v = b.classList.contains('valgt'), r = !!b.dataset.riktig;
          if (v && !r) { b.classList.add('erfeil'); feil++; }
          if (!v && r) mangler++;
        });
        if (feil || mangler) {
          return {
            ok: false,
            melding: feil ? 'Ikke helt. Prøv et annet svar.' : 'Du mangler ett svar til.'
          };
        }
        return { ok: true };
      },
      fasit: function () {
        knapper.forEach(function (b) {
          b.classList.remove('valgt', 'erfeil');
          if (b.dataset.riktig) b.classList.add('erriktig', 'valgt');
        });
      },
      nullstill: function () {
        knapper.forEach(function (b) {
          b.classList.remove('valgt', 'erriktig', 'erfeil');
          b.setAttribute('aria-pressed', 'false');
        });
      }
    };
  };

  // ------------------------------------------------------------------
  // rammen rundt hver aktivitet
  // ------------------------------------------------------------------

  function byggAktivitet(d, nr, meldFerdig) {
    var akt = lag('section', 'akt');
    akt.id = d.id;

    var hode = lag('div', 'hode');
    hode.appendChild(lag('span', 'nr', 'Oppgave ' + nr));
    hode.appendChild(lag('p', 'oppgave', vis(d.oppgave)));
    var merke = lag('span', 'merke', '✔');
    merke.setAttribute('aria-hidden', 'true');
    hode.appendChild(merke);
    akt.appendChild(hode);

    var kropp = lag('div', 'kropp');
    akt.appendChild(kropp);

    var motor = TYPER[d.type](d, kropp);

    var svar = lag('div', 'tilbakemelding');
    svar.setAttribute('role', 'status');
    svar.setAttribute('aria-live', 'polite');

    var knapper = lag('div', 'aktknapper');
    var sjekk = lag('button', 'aktknapp', 'Sjekk svaret');
    sjekk.type = 'button';
    var hint = lag('button', 'aktknapp mild', 'Hint');
    hint.type = 'button';
    var losning = lag('button', 'aktknapp mild', 'Vis løsningen');
    losning.type = 'button';
    var omigjen = lag('button', 'aktknapp mild', 'Prøv på nytt');
    omigjen.type = 'button';

    knapper.appendChild(sjekk);
    if (d.hint) knapper.appendChild(hint);
    knapper.appendChild(losning);
    knapper.appendChild(omigjen);
    kropp.appendChild(knapper);
    kropp.appendChild(svar);

    var forsok = 0, lost = false;

    function si(klasse, tekst) {
      svar.className = 'tilbakemelding vis ' + klasse;
      svar.innerHTML = tekst;
    }

    sjekk.addEventListener('click', function () {
      if (lost) return;
      var r = motor.sjekk();
      forsok++;
      if (r.ok) {
        lost = true;
        akt.classList.add('riktig');
        sjekk.disabled = true;
        si('ja', '<p><strong>Riktig.</strong>' +
          (d.forklaring ? ' ' + vis(d.forklaring) : '') + '</p>');
        meldFerdig(d.id, true);
      } else {
        si('nei', '<p><strong>Ikke helt.</strong> ' + (r.melding || 'Prøv en gang til.') + '</p>' +
          (d.hint && forsok >= 2 ? '<p>' + vis(d.hint) + '</p>' : ''));
      }
    });

    hint.addEventListener('click', function () {
      si('nei', '<p>' + vis(d.hint) + '</p>');
    });

    losning.addEventListener('click', function () {
      motor.fasit();
      lost = true;
      sjekk.disabled = true;
      si('nei', '<p><strong>Slik ser det ut.</strong>' +
        (d.forklaring ? ' ' + vis(d.forklaring) : '') + '</p>' +
        '<p>Trykk «Prøv på nytt» og gjør den selv.</p>');
      meldFerdig(d.id, false);
    });

    omigjen.addEventListener('click', function () {
      motor.nullstill();
      lost = false;
      forsok = 0;
      sjekk.disabled = false;
      akt.classList.remove('riktig');
      svar.className = 'tilbakemelding';
      meldFerdig(d.id, null);
    });

    return akt;
  }

  // ------------------------------------------------------------------
  // sida
  // ------------------------------------------------------------------

  /* Bygger én oppgavesamling. Hver .aktliste peker med data-kilde på
     JSON-blokka si, slik at det kan ligge flere samlinger i samme dokument —
     det er det enkeltfilutgaven av nettstedet trenger. */
  function byggSamling(mal) {
    var blokk = document.getElementById(mal.dataset.kilde || 'aktiviteter');
    if (!blokk) return;

    var data;
    try {
      data = JSON.parse(blokk.textContent);
    } catch (e) {
      mal.appendChild(lag('div', 'ingenskript',
        '<p>Oppgavene kunne ikke lastes. Meld fra til læreren.</p>'));
      return;
    }

    var status = {};

    var framdrift = lag('div', 'framdrift');
    var tall = lag('span', 'tall', '0 av ' + data.aktiviteter.length + ' riktige');
    var stolpe = lag('div', 'stolpe');
    var fyll = lag('div', 'fyll');
    stolpe.appendChild(fyll);
    var nullstill = lag('button', 'nullstill', 'Start på nytt');
    nullstill.type = 'button';
    framdrift.appendChild(tall);
    framdrift.appendChild(stolpe);
    framdrift.appendChild(nullstill);
    mal.appendChild(framdrift);

    function meldFerdig(id, ok) {
      if (ok === null) delete status[id];
      else status[id] = ok;
      var n = Object.keys(status).filter(function (k) { return status[k]; }).length;
      tall.textContent = n + ' av ' + data.aktiviteter.length + ' riktige';
      fyll.style.width = (n / data.aktiviteter.length * 100) + '%';
    }

    data.aktiviteter.forEach(function (d, i) {
      mal.appendChild(byggAktivitet(d, i + 1, meldFerdig));
    });

    nullstill.addEventListener('click', function () {
      mal.querySelectorAll('.akt .aktknapper .mild').forEach(function (b) {
        if (b.textContent === 'Prøv på nytt') b.click();
      });
      mal.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function start() {
    document.querySelectorAll('.aktliste').forEach(byggSamling);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
