#!/usr/bin/env python3
"""Ricostruisce index.html da src/shell.html + src/engine.js + src/app.js."""
import base64, hashlib, pathlib, re, subprocess, sys
root = pathlib.Path(__file__).resolve().parent
shell = (root / 'src/shell.html').read_text()
engine = (root / 'src/engine.js').read_text().replace("if(typeof module!=='undefined')module.exports=FX;\n", '')
app = (root / 'src/app.js').read_text()
out = shell.replace('/*ENGINE*/', engine).replace('/*APP*/', app)
# Regole di sicurezza del browser (Content-Security-Policy): eseguono solo i file del sito
# e gli script scritti qui dentro (riconosciuti dalla loro impronta sha256).
hashes = ' '.join("'sha256-%s'" % base64.b64encode(hashlib.sha256(x.encode()).digest()).decode()
                  for x in re.findall(r'<script>(.*?)</script>', out, re.S))
csp = ("default-src 'self'; script-src 'self' " + hashes + "; style-src 'self' 'unsafe-inline'; "
       "img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.scryfall.com; "
       "font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-src 'none'; worker-src 'self'; manifest-src 'self'")
assert out.count('<!--CSP-->') == 1
out = out.replace('<!--CSP-->', '<meta http-equiv="Content-Security-Policy" content="' + csp + '">')
(root / 'index.html').write_text(out)
scripts = re.findall(r'<script>(.*?)</script>', out, re.S)
tmp = root / '.build-check.js'
tmp.write_text('\n;\n'.join(scripts))
r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()
if r.returncode:
    print(r.stderr); sys.exit(1)
print('index.html ricostruito,', len(out), 'byte, sintassi ok')
