/* Gjør tabellen «Sjekk deg selv» i boka (kapittel-N.html) klikkbar.
   Lagrer i samme nøkkel som js/sjekkliste.js (sjekk-<fag>-<kap>), så svarene
   er de samme i boka og på den interaktive siden på samme enhet. */
(function () {
  'use strict';
  var VALG = ['kan', 'litt', 'ikke'];
  var NAVN = { kan: 'Kan', litt: 'Kan litt', ikke: 'Kan ikke' };
  function start() {
    var tabeller = document.querySelectorAll('table.sjekktabell');
    if (!tabeller.length) return;
    var m = location.pathname.match(/\/(matematikk|naturfag|samfunnsfag)\/kapittel-(\d+)\.html/);
    if (!m) return;
    var NOKKEL = 'sjekk-' + m[1] + '-' + m[2];
    var lagret = {};
    try { lagret = JSON.parse(localStorage.getItem(NOKKEL) || '{}') || {}; } catch (e) { lagret = {}; }
    function lagre() { try { localStorage.setItem(NOKKEL, JSON.stringify(lagret)); } catch (e) {} }

    tabeller.forEach(function (tab) {
      var boks = tab.closest('.sjekkliste') || tab.parentNode;
      var dk = '', mi = 0, rader = [];
      tab.querySelectorAll('tbody tr').forEach(function (tr) {
        if (tr.classList.contains('dkrad')) { dk = (tr.textContent.trim().split(/\s+/)[0] || ''); mi = 0; return; }
        var celler = tr.querySelectorAll('td.k');
        if (celler.length !== 3 || !dk) return;
        var id = dk + '-' + mi; mi++;
        var tekst = (tr.cells[0] ? tr.cells[0].textContent.trim() : '');
        var rad = { id: id, dk: dk, celler: celler };
        rader.push(rad);
        tr.setAttribute('role', 'radiogroup');
        tr.setAttribute('aria-label', tekst);
        celler.forEach(function (td, i) {
          td.classList.add('sjklikk');
          td.setAttribute('role', 'radio');
          td.setAttribute('tabindex', '0');
          td.setAttribute('aria-label', NAVN[VALG[i]]);
          function velg() {
            if (lagret[id] === VALG[i]) delete lagret[id]; else lagret[id] = VALG[i];
            lagre(); vis();
          }
          td.addEventListener('click', velg);
          td.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); velg(); }
          });
        });
      });

      var info = boks.querySelector('.kunnett');
      if (!info) { info = document.createElement('p'); info.className = 'kunnett'; boks.appendChild(info); }
      info.textContent = '';
      var hjelp = document.createElement('span');
      hjelp.textContent = 'Trykk i rutene for å krysse av. Svarene lagres bare på denne enheten. ';
      info.appendChild(hjelp);
      var status = document.createElement('span'); status.className = 'sjtstatus'; status.setAttribute('aria-live', 'polite');
      info.appendChild(status);
      var ny = document.createElement('button'); ny.type = 'button'; ny.className = 'sjtny'; ny.textContent = 'Start på nytt';
      ny.addEventListener('click', function () { rader.forEach(function (r) { delete lagret[r.id]; }); lagre(); vis(); });
      info.appendChild(document.createTextNode(' ')); info.appendChild(ny);

      function vis() {
        var besvart = 0, ov = [];
        rader.forEach(function (r) {
          var v = lagret[r.id];
          if (v) besvart++;
          if ((v === 'litt' || v === 'ikke') && ov.indexOf(r.dk) < 0) ov.push(r.dk);
          r.celler.forEach(function (td, i) {
            var p = v === VALG[i];
            td.classList.toggle('sjvalgt', p);
            td.classList.toggle('sj-' + VALG[i], p);
            td.setAttribute('aria-checked', p ? 'true' : 'false');
            var ru = td.querySelector('.rute'); if (ru) ru.textContent = p ? '✔' : '';
          });
        });
        var t = 'Du har svart på ' + besvart + ' av ' + rader.length + ' mål.';
        if (ov.length) t += ' Øv mer på: ' + ov.join(', ') + '.';
        else if (besvart && besvart === rader.length) t += ' Bra! Du kan alt.';
        status.textContent = t;
      }
      vis();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
