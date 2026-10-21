# -*- coding: utf-8 -*-
"""把真实提取的数据注入模板，产出 index.html。

路径全部基于本文件位置计算，解压到任意目录后都能直接运行（无需固定盘符）。
- 在交接包结构里：本文件位于 <root>/source/，输出到 <root>/site/index.html
- 在原工作区里：本文件位于 <root>/.scan/，输出到 <root>/弦库-吉他谱管理台/index.html
"""
import json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))   # 本文件所在目录（source/ 或 .scan/）
ROOT = os.path.dirname(HERE)                         # 项目根目录
meta = json.load(open(os.path.join(HERE, 'meta.json'), encoding='utf-8'))
tpl = io.open(os.path.join(HERE, 'app_template.html'), encoding='utf-8').read()

songs = meta['songs']
assert len(songs) >= 156, len(songs)  # 曲库可继续追加新谱
songs_js = json.dumps(songs, ensure_ascii=False, separators=(',', ':'))

# 「已推断 / 需确认」清单（谱面上没有印刷、或与他人认知冲突的字段）
infer_artist = [
    (8, '周杰伦'), (22, '张芸京'), (26, '薛之谦'), (31, '林志炫'), (34, '于文文'), (35, '姜育恒'),
    (37, '郭顶'), (38, '侃侃'), (40, '宋冬野'), (41, '朴树'), (43, '赵照'), (46, '赵雷'),
    (48, '任素汐'), (51, '莫文蔚'), (53, '郭顶'), (57, '罗大佑'), (65, '王心凌'), (67, '陈势安'),
    (78, '萧敬腾'), (79, '张震岳'), (88, '焦迈奇'), (106, '张宇'), (116, 'BY2'), (121, '王力宏'),
    (134, '王宇宙Leto'), (137, '许巍'), (138, '陶喆')
]
unknown = []
for i, a in infer_artist:
    unknown.append({
        "file": songs[i]['f'], "field": "歌手", "value": a, "type": "已推断",
        "note": "谱面头部未印刷演唱者，按该曲通行原唱推断，建议核对"
    })

unknown.append({
    "file": "至少还有你.jpg", "field": "歌手", "value": "张国荣", "type": "需确认",
    "note": "谱面标注演唱者为「张国荣」，该曲更常见的原唱标注为「林忆莲」（张国荣有翻唱版本），请确认以哪一个为准"
})

for i, f, t in [(7, '不浪漫的罪名.jpg', '不浪漫罪名'), (29, '匿名的朋友.jpg', '匿名的好友'),
                (114, '海阔天空C调.jpg', '海阔天空（C调版）')]:
    unknown.append({
        "file": f, "field": "曲名", "value": t, "type": "文件名与谱面不一致",
        "note": "已采用谱面印刷的曲名，原文件名为「" + f + "」"
    })

unknown.append({"file": "单身情歌.jpg", "field": "拍号", "value": "6/8", "type": "已识别",
                "note": "全部 156 份中唯一一份 6/8 拍谱面，其余均为 4/4"})

for i, nt in [(5, '谱面未标注原调，仅标注 1=A 与变调夹第 3 品'),
              (7, '谱面仅标注 1=B，未标注原调'),
              (32, '谱面 1=#F（升F），非常规写法'),
              (88, '谱面标注「降半音调弦，用C调指法」，未给出 1=X 的独立调号')]:
    unknown.append({"file": songs[i]['f'], "field": "调式", "value": "1=" + songs[i]['k'],
                    "type": "已推断", "note": nt})

unknown.append({
    "file": "（全部 156 份）", "field": "曲风 / 类别 / 难度", "value": "—", "type": "已推断",
    "note": "这三项不印刷在谱面上：曲风按曲目风格归类；类别为演唱语言（国语/粤语）；难度按和弦、横按、节奏与调性综合推断，均非谱面原文，可自行修改"
})
unknown.append({
    "file": "（全部 156 份）", "field": "谱型", "value": "弹唱谱", "type": "已推断",
    "note": "全部谱面均带和弦图与歌词，判定为弹唱谱，无纯指弹独奏谱"
})

real_unknown = [u for u in unknown if u['type'] == '未识别']

# 真实歌手照片映射（抓取失败者回退字标头像）
_rep_p = os.path.join(HERE, 'img_report.json')
avatar_map = {}
if os.path.exists(_rep_p):
    avatar_map = json.load(open(_rep_p, encoding='utf-8')).get('avatar_map', {})

out = tpl.replace('__SONGS_JSON__', songs_js)
out = out.replace('__AVATAR_MAP__',
                  json.dumps(avatar_map, ensure_ascii=False, separators=(',', ':')))
out = out.replace("var LS_KEY = 'wb_xiangu_v1';",
                  'var UNKNOWN = ' + json.dumps(unknown, ensure_ascii=False, separators=(',', ':')) + ';\n'
                  'var UNKNOWN_REAL = ' + str(len(real_unknown)) + ';\n\n'
                  "var LS_KEY = 'wb_xiangu_v1';")

assert '__SONGS_JSON__' not in out, '歌曲数据未注入'
assert '__AVATAR_MAP__' not in out, '头像映射未注入'
assert 'UNKNOWN_REAL = ' in out, '清单未注入'

# 输出目录：优先用交接包里的 site/，否则退回原工作区的 弦库-吉他谱管理台/
_site_dir = os.path.join(ROOT, 'site')
if not os.path.isdir(_site_dir):
    _site_dir = os.path.join(ROOT, '弦库-吉他谱管理台')
outp = os.path.join(_site_dir, 'index.html')
io.open(outp, 'w', encoding='utf-8').write(out)
print('written', outp, len(out), 'bytes')
print('songs', len(songs), '| unknown', len(unknown), '| 真正未识别', len(real_unknown))
print('真实歌手照片', len(avatar_map), '位')
