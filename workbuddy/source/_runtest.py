import os, re, subprocess, pathlib, tempfile, shutil
base = r'E:\WorkBuddy工作目录\2026-09-30-16-43-24'
app = os.path.join(base, '弦库-吉他谱管理台')
snip = open(os.path.join(base, '.scan', '_test_snippet.html'), encoding='utf-8').read()

html = open(os.path.join(app, 'index.html'), encoding='utf-8').read()
testfile = os.path.join(app, '_test.html')
open(testfile, 'w', encoding='utf-8').write(html.replace('</body>', snip + '\n</body>'))

chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
prof = tempfile.mkdtemp(prefix='cprof_')
url = pathlib.Path(testfile).as_uri()
cmd = [chrome, '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
       '--disable-extensions', '--window-size=1280,900',
       '--user-data-dir=' + prof, '--dump-dom', url]
r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=120)
dom = r.stdout or ''
m = re.search(r'<title>(.*?)</title>', dom, re.S)
rep = []
rep.append('chrome RC %d' % r.returncode)
rep.append('dom len %d' % len(dom))
rep.append('TITLE: ' + (m.group(1) if m else '(none)'))
if not m:
    rep.append('STDERR: ' + (r.stderr or '')[-2000:])
open(os.path.join(base, '.scan', '_test_out.txt'), 'w', encoding='utf-8').write('\n'.join(rep))
try:
    os.remove(testfile)
except Exception:
    pass
shutil.rmtree(prof, ignore_errors=True)
