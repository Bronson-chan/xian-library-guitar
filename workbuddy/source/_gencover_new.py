# -*- coding: utf-8 -*-
"""为新歌生成同风格方形封面（复用 gencovers.py 的同一套算法，保证色调/画风一致）"""
import os, io, json, random

BASE = r'E:\WorkBuddy工作目录\2026-09-30-16-43-24'
GEN = os.path.join(BASE, '.scan', 'gencovers.py')
src = io.open(GEN, encoding='utf-8').read()
head = src.split('for s in songs:')[0]          # 复用常量 + 全部绘图函数

g = {}
exec(compile(head, GEN, 'exec'), g)

meta = json.load(open(os.path.join(BASE, '.scan', 'meta.json'), encoding='utf-8'))
songs = meta['songs']
s = songs[-1]
print('target', s)

S = g['S']
random = g['random']
Image = g['Image']; ImageDraw = g['ImageDraw']; ImageFilter = g['ImageFilter']
hsv = g['hsv']; lerp = g['lerp']; gradient = g['gradient']
draw_motif = g['draw_motif']; hue_of = g['hue_of']; GENRE = g['GENRE']
OUT = g['OUT']

i = s['i']
rng = random.Random(i * 7919 + 13)
gs, gv = GENRE.get(s['g'], (0.9, 0.9))
bs = 0.56 * gs
bv = 0.94 * gv
hue = hue_of(s['a']) + rng.uniform(-0.040, 0.040)
c_light = hsv(hue - 0.020, bs * 0.74, min(1.0, bv))
c_mid = hsv(hue + rng.uniform(0.010, 0.045), min(1.0, bs * 1.10), max(0.40, bv * 0.80))
c_deep = hsv(hue + rng.uniform(0.035, 0.095), min(1.0, bs * 1.42), max(0.24, bv * 0.54))

img = gradient((S, S), c_light, c_deep, c_mid, rng.uniform(0, 360))
layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(layer)
light = hsv(hue - 0.015, bs * 0.30, 1.0) + (int(rng.uniform(96, 150)),)
darkc = hsv(hue + 0.04, min(1.0, bs * 1.35), max(0.20, bv * 0.44)) + (int(rng.uniform(80, 128)),)
motif = rng.randrange(6)
draw_motif(d, motif, light, darkc, rng)

noise = Image.effect_noise((S, S), 16).convert('L').point(lambda v: 128 + (v - 128) * 0.42)
grain = Image.merge('RGBA', (noise, noise, noise, Image.new('L', (S, S), 14)))
layer = Image.alpha_composite(layer, grain)
img = Image.alpha_composite(img.convert('RGBA'), layer).convert('RGB')

vig = Image.new('L', (S, S), 0)
vd = ImageDraw.Draw(vig)
for k in range(26):
    a = int(30 * (k / 25.0))
    m = int(S * 0.55 * (1 - k / 52.0))
    vd.rectangle([-m + k * 3, -m + k * 3, S + m - k * 3, S + m - k * 3], outline=a)
vig = vig.filter(ImageFilter.GaussianBlur(S * 0.07))
dark_img = Image.new('RGB', (S, S), (0, 0, 0))
img = Image.composite(dark_img, img, vig.point(lambda v: min(255, v)))

out = os.path.join(OUT, '%d.jpg' % i)
img.save(out, quality=82, optimize=True, progressive=True)
print('cover ->', out, os.path.getsize(out), 'bytes | motif', motif, 'hue', round(hue, 3))

# 头像体检
import cv2, numpy as np
av = os.path.join(BASE, '弦库-吉他谱管理台', 'assets', 'avatars', '%d.jpg' % i)
im = cv2.imdecode(np.fromfile(av, np.uint8), cv2.IMREAD_COLOR)
hsvm = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
print('avatar shape', im.shape, 'sat mean', round(float(hsvm[..., 1].mean()), 1),
      'val mean', round(float(hsvm[..., 2].mean()), 1), 'bytes', os.path.getsize(av))
