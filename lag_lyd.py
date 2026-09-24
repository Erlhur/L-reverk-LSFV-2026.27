#!/usr/bin/env python3
"""Lager innleste lydfiler til Lytt-knappene med ElevenLabs.

Kjøres i mappa med nettstedet (den som er koblet til GitHub med GitHub Desktop):

    python3 lag_lyd.py --test --stemme STEMME-ID
        Lager tre korte prøver med hver modell i mappa lyd_test/. Lytt og velg modell.

    python3 lag_lyd.py --stemme STEMME-ID --modell eleven_v3
        Leser inn alle tekstene som mangler lydfil. Viser antall tegn og spør før den starter.

Valg:
    --typer tekst,ord          hva som skal leses inn (standard). Legg til «oppgave» for oppgavene også.
    --fag samfunnsfag          bare ett fag (standard: alle).
    --kapittel 2               bare ett kapittel (krever --fag). Flere: --kapittel 1,2
    --maks-tegn 100000         stopp etter så mange tegn (fint for å fordele på flere måneder).
    --rydd                     slett lydfiler for tekster som ikke finnes lenger.

API-nøkkelen hentes fra miljøvariabelen ELEVENLABS_API_KEY, ellers spør skriptet om den.
Nøkkelen lagres ikke noe sted. Skriptet bruker bare Pythons standardbibliotek.

Lydfilene legges i lyd/<id>.mp3, og lyd/lyd.json forteller nettsiden hvilke som finnes.
Tekster som er endret, får ny id og leses inn på nytt neste gang. Alt annet gjenbrukes.
"""
import argparse, getpass, json, os, sys, time, urllib.error, urllib.request
from datetime import date

API = os.environ.get('ELEVENLABS_API_URL', 'https://api.elevenlabs.io')
MODELLER_TEST = ['eleven_v3', 'eleven_multilingual_v2', 'eleven_flash_v2_5']
SPRAAKKODE = {'eleven_flash_v2_5': 'no', 'eleven_turbo_v2_5': 'no'}   # bare disse godtar language_code


def hent(nokkel, stemme, modell, tekst, forsok=5):
    body = {'text': tekst, 'model_id': modell}
    if modell in SPRAAKKODE:
        body['language_code'] = SPRAAKKODE[modell]
    req = urllib.request.Request(
        f'{API}/v1/text-to-speech/{stemme}?output_format=mp3_44100_64',
        data=json.dumps(body).encode('utf-8'),
        headers={'xi-api-key': nokkel, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    for n in range(forsok):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            melding = e.read().decode('utf-8', 'replace')[:300]
            if e.code in (401, 403):
                sys.exit(f'\nElevenLabs avviste nøkkelen eller stemmen ({e.code}): {melding}')
            if e.code == 422 or e.code == 400:
                raise RuntimeError(f'ugyldig forespørsel ({e.code}): {melding}')
            vent = 5 * (n + 1)
            print(f'  ElevenLabs svarte {e.code}, prøver igjen om {vent} s …')
            time.sleep(vent)
        except urllib.error.URLError as e:
            vent = 5 * (n + 1)
            print(f'  nettverksfeil ({e.reason}), prøver igjen om {vent} s …')
            time.sleep(vent)
    raise RuntimeError('ga opp etter flere forsøk')


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('--stemme', required=True, help='stemme-ID fra ElevenLabs (Voices → stemmen → «Copy voice ID»)')
    a.add_argument('--modell', default='eleven_v3')
    a.add_argument('--typer', default='tekst,ord')
    a.add_argument('--fag', default=None)
    a.add_argument('--kapittel', default=None, help='kapittelnummer, f.eks. 1 eller 1,2 (krever --fag)')
    a.add_argument('--maks-tegn', type=int, default=None)
    a.add_argument('--test', action='store_true')
    a.add_argument('--rydd', action='store_true')
    a.add_argument('--mappe', default='.')
    x = a.parse_args()

    mappe = os.path.abspath(x.mappe)
    manusfil = os.path.join(mappe, 'lytt_manus.json')
    if not os.path.exists(manusfil):
        sys.exit(f'Fant ikke lytt_manus.json i {mappe}. Kjør skriptet i mappa med nettstedet.')
    manus = json.load(open(manusfil, encoding='utf-8'))['tekster']
    lydmappe = os.path.join(mappe, 'lyd')
    os.makedirs(lydmappe, exist_ok=True)
    nokkel = os.environ.get('ELEVENLABS_API_KEY') or getpass.getpass('API-nøkkel fra ElevenLabs (vises ikke): ').strip()

    if x.test:
        prover = []
        for typ in ('tekst', 'ord'):
            prover += [(i, v) for i, v in manus.items() if v['type'] == typ and 120 < len(v['tekst']) < 400][:1] or \
                      [(i, v) for i, v in manus.items() if v['type'] == typ][:1]
        ut = os.path.join(mappe, 'lyd_test'); os.makedirs(ut, exist_ok=True)
        for m in MODELLER_TEST:
            for n, (i, v) in enumerate(prover, 1):
                try:
                    data = hent(nokkel, x.stemme, m, v['tekst'])
                    f = os.path.join(ut, f'{m}_{n}.mp3'); open(f, 'wb').write(data)
                    print(f'{m}: {os.path.basename(f)} – «{v["tekst"][:60]}…»')
                except RuntimeError as e:
                    print(f'{m}: virket ikke ({e})')
        print(f'\nLytt til filene i {ut} og velg modell. Slett mappa lyd_test etterpå (den skal ikke til GitHub).')
        return

    typer = set(x.typer.split(','))
    sider = None
    if x.kapittel:
        if not x.fag:
            sys.exit('--kapittel må brukes sammen med --fag, for eksempel --fag naturfag --kapittel 1')
        sider = {f'{x.fag}/kapittel-{k.strip()}.html' for k in x.kapittel.split(',')}
        finnes_sider = {v['side'] for v in manus.values()}
        mangler = sorted(sider - finnes_sider)
        if mangler:
            sys.exit(f'Fant ikke {", ".join(mangler)} i lytt_manus.json.')
    utvalg = [(i, v) for i, v in manus.items()
              if v['type'] in typer and (not x.fag or v['fag'] == x.fag)
              and (sider is None or v['side'] in sider)
              and not os.path.exists(os.path.join(lydmappe, i + '.mp3'))]
    if x.maks_tegn:
        sum_, kort = 0, []
        for i, v in utvalg:
            if sum_ + len(v['tekst']) > x.maks_tegn: break
            kort.append((i, v)); sum_ += len(v['tekst'])
        utvalg = kort
    tegn = sum(len(v['tekst']) for _, v in utvalg)
    print(f'{len(utvalg)} tekster mangler lydfil, til sammen ' + f'{tegn:,}'.replace(',', ' ') + ' tegn' +
          f' (modell {x.modell}, typer: {", ".join(sorted(typer))}).')
    if utvalg and input('Starte innlesingen? Skriv ja: ').strip().lower() != 'ja':
        return
    logg_f = os.path.join(lydmappe, 'lyd_logg.json')
    logg = json.load(open(logg_f, encoding='utf-8')) if os.path.exists(logg_f) else {}
    feil = 0
    for n, (i, v) in enumerate(utvalg, 1):
        try:
            data = hent(nokkel, x.stemme, x.modell, v['tekst'])
        except RuntimeError as e:
            feil += 1; print(f'  [{n}/{len(utvalg)}] {v["side"]}: {e}'); continue
        open(os.path.join(lydmappe, i + '.mp3'), 'wb').write(data)
        logg[i] = {'modell': x.modell, 'stemme': x.stemme, 'dato': str(date.today()), 'side': v['side']}
        if n % 25 == 0 or n == len(utvalg):
            print(f'  {n}/{len(utvalg)} ferdig')
            json.dump(logg, open(logg_f, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)

    if x.rydd:
        for f in os.listdir(lydmappe):
            if f.endswith('.mp3') and f[:-4] not in manus:
                os.remove(os.path.join(lydmappe, f)); logg.pop(f[:-4], None)
    json.dump(logg, open(logg_f, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    finnes = sorted(f[:-4] for f in os.listdir(lydmappe) if f.endswith('.mp3') and f[:-4] in manus)
    json.dump({'filer': finnes}, open(os.path.join(lydmappe, 'lyd.json'), 'w', encoding='utf-8'))
    print(f'\nFerdig. {len(finnes)} tekster har nå innlest lyd' + (f', {feil} feilet (kjør på nytt for å prøve igjen)' if feil else '') + '.')
    print('Åpne GitHub Desktop, skriv en kort beskrivelse, klikk «Commit to main» og så «Push origin».')


if __name__ == '__main__':
    main()
