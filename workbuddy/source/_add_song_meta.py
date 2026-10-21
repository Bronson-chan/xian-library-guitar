# -*- coding: utf-8 -*-
"""把《你要的爱》写入 meta.json（标记 nl=1 = 新学），并登记歌手头像"""
import os, json, io, collections

BASE = r'E:\WorkBuddy工作目录\2026-09-30-16-43-24'
MP = os.path.join(BASE, '.scan', 'meta.json')
RP = os.path.join(BASE, '.scan', 'img_report.json')

meta = json.load(io.open(MP, encoding='utf-8'))
songs = meta['songs']
assert not [x for x in songs if x['t'] == '你要的爱'], '已存在，勿重复添加'

new = collections.OrderedDict([
    ('i', 156),
    ('f', '你要的爱.jpg'),
    ('t', '你要的爱'),
    ('a', '戴佩妮'),
    ('g', '流行'),
    ('c', '国语'),
    ('k', 'F'),      # 谱面印刷 1=F
    ('ok', 'F'),
    ('capo', ''),    # 谱面无变调夹标注
    ('ts', '4/4'),
    ('d', '中等'),    # 含 Gm/bB 等横按，节奏为常见分解
    ('nl', 1),       # ★ 新学：新加入曲库的谱子先归到这里，学会后点「我学会了」移出
])
songs.append(new)
meta['totalFiles'] = len(songs)
io.open(MP, 'w', encoding='utf-8').write(json.dumps(meta, ensure_ascii=False, indent=1))
print('meta songs', len(songs))

rep = json.load(io.open(RP, encoding='utf-8'))
am = rep.setdefault('avatar_map', {})
am['戴佩妮'] = 'assets/avatars/156.jpg'
io.open(RP, 'w', encoding='utf-8').write(json.dumps(rep, ensure_ascii=False, indent=1))
print('avatar_map', len(am), '| 戴佩妮 ->', am['戴佩妮'])
print('歌手数', len(set(x['a'] for x in songs)))
