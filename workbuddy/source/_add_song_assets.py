# -*- coding: utf-8 -*-
"""加一首歌：谱面大图 + 方形封面 + 歌手头像（真实照片优先）"""
import os, json, io, shutil, urllib.parse as up, urllib.request

BASE = r'E:\WorkBuddy工作目录\2026-09-30-16-43-24'
SITE = os.path.join(BASE, '弦库-吉他谱管理台')
SRC = r'C:\Users\admin\.workbuddy\clipboard-images\clipboard-2026-10-21T06-28-15-705Z-8393aec5.jpg'
IDX = 156
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'}
NE_REF = 'https://music.163.com/'


def fetch(url, ref=None, timeout=25, tries=3):
    h = dict(UA)
    if ref:
        h['Referer'] = ref
    last = None
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers=h)
            return urllib.request.urlopen(req, timeout=timeout).read()
        except Exception as e:
            last = e
    raise last


# 1) 谱面大图：原图直接落盘，不重编码（保留原始清晰度）
dst_tab = os.path.join(SITE, 'assets', 'tabs', '%d.jpg' % IDX)
shutil.copyfile(SRC, dst_tab)
print('tab ->', dst_tab, os.path.getsize(dst_tab), 'bytes')

# 2) 歌手头像：戴佩妮（网易云歌手搜索 -> picUrl；回退维基百科）
NAME = '戴佩妮'
AV_DIR = os.path.join(SITE, 'assets', 'avatars')
dst_av = os.path.join(AV_DIR, '%d.jpg' % IDX)
got = False

try:
    u = 'https://music.163.com/api/search/get/web?' + up.urlencode({'s': NAME, 'type': 100, 'limit': 5, 'offset': 0})
    d = json.loads(fetch(u, ref=NE_REF).decode('utf-8', 'ignore'))
    arts = ((d.get('result') or {}).get('artists') or [])
    print('ne artists:', [(a.get('id'), a.get('name')) for a in arts])
    pick = None
    for a in arts:
        if a.get('name') == NAME:
            pick = a
            break
    if pick is None and arts:
        pick = arts[0]
    if pick:
        pic = pick.get('picUrl') or pick.get('img1v1Url')
        if pic:
            b = fetch(pic + '?param=500y500', ref=NE_REF)
            if len(b) > 2000 and b[:3] == b'\xff\xd8\xff':
                open(dst_av, 'wb').write(b)
                got = True
                print('avatar from netease:', pick.get('name'), len(b))
except Exception as e:
    print('netease failed:', e)

if not got:
    for lang in ('zh', 'en'):
        try:
            u = 'https://%s.wikipedia.org/w/api.php?' % lang + up.urlencode({
                'action': 'query', 'titles': NAME, 'prop': 'pageimages', 'format': 'json',
                'pithumbsize': '500', 'piprop': 'thumbnail', 'redirects': '1'})
            d = json.loads(fetch(u, timeout=20).decode('utf-8', 'ignore'))
            for p in ((d.get('query') or {}).get('pages') or {}).values():
                th = p.get('thumbnail')
                if th and th.get('source'):
                    b = fetch(th['source'])
                    if len(b) > 2000:
                        open(dst_av, 'wb').write(b)
                        got = True
                        print('avatar from wiki:', th['source'])
                        break
        except Exception as e:
            print('wiki', lang, 'failed:', e)
        if got:
            break

print('avatar ok =', got, dst_av if got else '')
