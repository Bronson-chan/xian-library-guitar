# -*- coding: utf-8 -*-
"""诊断：抓页面初始化阶段的真实异常（window.onerror + unhandledrejection）。"""
import io, os, re, pathlib, subprocess, tempfile, shutil

BASE = r'E:\WorkBuddy工作目录\2026-09-30-16-43-24'
APP = os.path.join(BASE, '弦库-吉他谱管理台')
html = io.open(os.path.join(APP, 'index.html'), encoding='utf-8').read()
PROBE = r"""
<script>
window.__errs = [];
window.addEventListener('error', function(e){
  window.__errs.push('ERROR: ' + (e.message || '') + ' @' + (e.filename||'') + ':' + (e.lineno||'') +
    ' | ' + ((e.error && e.error.stack) ? e.error.stack.split('\n').slice(0,3).join(' <- ') : ''));
});
window.addEventListener('load', function(){
  setTimeout(function(){
    var miss = [];
    ['q-home','heroDate','heroWeek','heroFilter','lnk-learn-all','btn-add-learning','btn-add-learning2',
     'lnk-learn-one','mpCard','railGo','lnk-cal','calNav','q-dl','dl-go','dl-all','dl-none','installBtn',
     'ringFg','ringV','ringG','stTime','stSong','stStreak','calBody','mpCover','main','sugbox','f-artist',
     'lib-grid','home-learning','home-review','learn-body','learn-count','dl-list','dl-sel','nav','toast','fabBadge',
     'arBack','arHav','arTitle','arSub','arStat','arSearch','q-ar','arGrid','arSongs']
      .forEach(function(id){ if (!document.getElementById(id)) miss.push(id); });
    var r = 'DIAG errs=' + window.__errs.length + ' | ' + (window.__errs.join(' || ') || 'none') +
            ' | missingIds=' + (miss.join(',') || 'none');
    document.title = r.slice(0, 1800);
  }, 400);
});
</script>
"""
tf = os.path.join(APP, '_diag.html')
io.open(tf, 'w', encoding='utf-8').write(html.replace('</body>', PROBE + '\n</body>'))
prof = tempfile.mkdtemp(prefix='cprof_')
cmd = [r'C:\Program Files\Google\Chrome\Application\chrome.exe', '--headless=new', '--disable-gpu',
       '--no-sandbox', '--no-first-run', '--window-size=1570,1001', '--user-data-dir=' + prof,
       '--virtual-time-budget=5000', '--dump-dom', pathlib.Path(tf).as_uri()]
r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180)
m = re.search(r'<title>(.*?)</title>', r.stdout or '', re.S)
io.open(os.path.join(BASE, '.scan', '_diag_out.txt'), 'w', encoding='utf-8').write(m.group(1) if m else 'NO TITLE')
print(m.group(1) if m else 'NO TITLE')
os.remove(tf)
shutil.rmtree(prof, ignore_errors=True)
