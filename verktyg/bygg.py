# Bygger spel.js av delarna i src/ (i nummerordning). Ändra alltid i src/, aldrig direkt i spel.js.
# Användning (från spelmappen):  python -I verktyg/bygg.py          bygger spel.js
#                                python -I verktyg/bygg.py --kolla  kollar bara att spel.js stämmer med src/
#                                python -I verktyg/bygg.py --publicera  bygger och kopierar spelets filer till publicera/
import os, sys, shutil

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROT, 'src')
UT = os.path.join(ROT, 'spel.js')
PUBLICERA = ['index.html', 'spel.js', 'config.js', 'ljud.js', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png']


def bygg():
    delar = sorted(f for f in os.listdir(SRC) if f.endswith('.js') and f[:2].isdigit())
    return ''.join(open(os.path.join(SRC, f), encoding='utf-8').read() for f in delar), delar


def main():
    text, delar = bygg()
    gammal = open(UT, encoding='utf-8').read() if os.path.exists(UT) else None
    if '--kolla' in sys.argv:
        if gammal == text:
            print('spel.js stämmer med src/ (' + str(len(delar)) + ' delar)')
            return 0
        print('spel.js stämmer INTE med src/. Kör bygg.py utan --kolla.')
        return 1
    if gammal != text:
        open(UT, 'w', encoding='utf-8', newline='\n').write(text)
        print('spel.js byggd av ' + str(len(delar)) + ' delar, ' + str(text.count('\n')) + ' rader')
    else:
        print('spel.js var redan aktuell')
    if '--publicera' in sys.argv:
        mal = os.path.join(ROT, 'publicera')
        os.makedirs(mal, exist_ok=True)
        for f in PUBLICERA:
            shutil.copyfile(os.path.join(ROT, f), os.path.join(mal, f))
        print('kopierade ' + str(len(PUBLICERA)) + ' filer till publicera/')
    return 0


if __name__ == '__main__':
    sys.exit(main())
