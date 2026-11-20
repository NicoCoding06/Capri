#!/usr/bin/env python3
"""Ricostruisce index.html da src/shell.html + src/engine.js + src/app.js."""
import pathlib, re, subprocess, sys
root = pathlib.Path(__file__).resolve().parent
shell = (root / 'src/shell.html').read_text()
engine = (root / 'src/engine.js').read_text().replace("if(typeof module!=='undefined')module.exports=FX;\n", '')
app = (root / 'src/app.js').read_text()
out = shell.replace('/*ENGINE*/', engine).replace('/*APP*/', app)
(root / 'index.html').write_text(out)
scripts = re.findall(r'<script>(.*?)</script>', out, re.S)
tmp = root / '.build-check.js'
tmp.write_text('\n;\n'.join(scripts))
r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()
if r.returncode:
    print(r.stderr); sys.exit(1)
print('index.html ricostruito,', len(out), 'byte, sintassi ok')
