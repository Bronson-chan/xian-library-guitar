# -*- coding: utf-8 -*-
"""为 156 首曲目生成方形专辑封面风的插图（不含文字，文字由页面叠加）"""
import os, json, math, colorsys, random
from PIL import Image, ImageDraw, ImageFilter

BASE = r'E:\WorkBuddy工作目录\2026-09-30-16-43-24'
OUT = os.path.join(BASE, '弦库-吉他谱管理台', 'assets', 'covers')
os.makedirs(OUT, exist_ok=True)

meta = json.load(open(os.path.join(BASE, '.scan', 'meta.json'), encoding='utf-8'))
songs = meta['songs']
S = 640


def hsv(h, s, v):
    r, g, b = colorsys.hsv_to_rgb(h % 1.0, max(0.0, min(1.0, s)), max(0.0, min(1.0, v)))
    return (int(r * 255), int(g * 255), int(b * 255))


# 曲风 -> (饱和度系数, 明度系数)：只决定"性格"，色相由歌手决定
GENRE = {
    '流行': (1.00, 1.00),
    '民谣': (0.82, 0.95),
    '摇滚': (1.12, 0.72),
    '经典': (0.70, 0.90),
}


def hue_of(name):
    """按歌手名散列到 24 个色相槽，铺满整个色环；同一歌手色调统一"""
    h = 0
    for ch in str(name):
        h = (h * 31 + ord(ch)) % 999983
    return (h % 24) / 24.0


def lerp(a, b, t):
    return tuple(int(a[k] + (b[k] - a[k]) * t) for k in range(3))


def gradient(size, c1, c2, c3, angle_deg):
    n = 72
    img = Image.new('RGB', (n, n))
    px = img.load()
    a = math.radians(angle_deg)
    dx, dy = math.cos(a), math.sin(a)
    for y in range(n):
        for x in range(n):
            t = ((x / (n - 1)) * dx + (y / (n - 1)) * dy + 1) / 2
            t = max(0.0, min(1.0, t))
            px[x, y] = lerp(c1, c3, t * 2) if t < 0.5 else lerp(c3, c2, (t - 0.5) * 2)
    return img.resize(size, Image.BICUBIC)


def draw_motif(d, motif, light, dark, rng):
    W = S
    ox = rng.uniform(-0.18, 0.18) * W
    oy = rng.uniform(-0.18, 0.18) * W
    sc = rng.uniform(0.78, 1.30)
    cx, cy = W / 2 + ox, W / 2 + oy

    if motif == 0:      # 同心圆环
        n = rng.randint(3, 5)
        for k in range(n):
            r = W * (0.20 + k * 0.115) * sc
            d.ellipse([cx - r, cy - r, cx + r, cy + r],
                      outline=(light if k % 2 == 0 else dark), width=int(W * rng.uniform(0.016, 0.026)))
    elif motif == 1:    # 斜向色带
        n = rng.randint(4, 7)
        wdt = W * rng.uniform(0.055, 0.11)
        gap = W / (n + 1)
        ang = rng.uniform(20, 70) + (0 if rng.random() < 0.5 else 90)
        shift = rng.uniform(-0.25, 0.25) * W
        for k in range(n):
            x = gap * (k + 1) + shift
            d.polygon([(x, -W), (x + wdt, -W), (x + wdt + W * math.tan(math.radians(ang - 90)) * 0, W), (x, W)],
                      fill=(light if k % 3 else dark))
    elif motif == 2:    # 圆弧堆叠
        n = rng.randint(4, 7)
        base_y = cy + W * rng.uniform(0.10, 0.34)
        for k in range(n):
            r = W * (0.17 + k * 0.105) * sc
            d.arc([cx - r, base_y - r, cx + r, base_y + r], start=180, end=360,
                  fill=(light if k % 2 == 0 else dark), width=int(W * rng.uniform(0.015, 0.024)))
            d.line([cx - r, base_y, cx + r, base_y], fill=(light if k % 2 == 0 else dark),
                   width=int(W * 0.012))
    elif motif == 3:    # 点阵
        n = rng.randint(6, 9)
        gap = W / (n + 1)
        rad = gap * rng.uniform(0.16, 0.26)
        phase = rng.uniform(0.18, 0.42)
        for gy in range(n):
            for gx in range(n):
                px_, py_ = gap * (gx + 1), gap * (gy + 1)
                dd = math.hypot(px_ - cx, py_ - cy)
                if dd < W * (phase + 0.34 * rng.random()):
                    d.ellipse([px_ - rad, py_ - rad, px_ + rad, py_ + rad],
                              fill=(light if (gx + gy) % 2 == 0 else dark))
    elif motif == 4:    # 嵌套三角
        n = rng.randint(2, 4)
        for k in range(n):
            o = W * (0.06 + k * 0.115) * sc
            d.polygon([(cx, o), (cx - (W * 0.50 - o), W - o), (cx + (W * 0.50 - o), W - o)],
                      outline=(light if k % 2 == 0 else dark), width=int(W * rng.uniform(0.016, 0.025)))
    else:               # 地平线 + 落日
        hy = W * rng.uniform(0.56, 0.74) + oy * 0.4
        r = W * rng.uniform(0.15, 0.26) * sc
        d.ellipse([cx - r, hy - r * 1.85, cx + r, hy + r * 0.15], fill=light)
        d.rectangle([-W, hy, W * 2, hy + int(W * rng.uniform(0.008, 0.016))], fill=dark)
        for k in range(2):
            y2 = hy + W * (0.09 + k * 0.08)
            d.rectangle([-W, y2, W * 2, y2 + int(W * rng.uniform(0.020, 0.042))], fill=dark)


for s in songs:
    i = s['i']
    rng = random.Random(i * 7919 + 13)
    gs, gv = GENRE.get(s['g'], (0.9, 0.9))

    bs = 0.56 * gs          # 基准饱和度
    bv = 0.94 * gv          # 基准明度
    # 同一歌手色调统一，同曲目内做小幅抖动
    hue = hue_of(s['a']) + rng.uniform(-0.040, 0.040)
    c_light = hsv(hue - 0.020, bs * 0.74, min(1.0, bv))
    c_mid = hsv(hue + rng.uniform(0.010, 0.045), min(1.0, bs * 1.10), max(0.40, bv * 0.80))
    c_deep = hsv(hue + rng.uniform(0.035, 0.095), min(1.0, bs * 1.42), max(0.24, bv * 0.54))

    img = gradient((S, S), c_light, c_deep, c_mid, rng.uniform(0, 360))

    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    light = hsv(hue - 0.015, bs * 0.30, 1.0) + (int(rng.uniform(96, 150)),)
    darkc = hsv(hue + 0.04, min(1.0, bs * 1.35), max(0.20, bv * 0.44)) + (int(rng.uniform(80, 128)),)
    draw_motif(d, rng.randrange(6), light, darkc, rng)

    noise = Image.effect_noise((S, S), 16).convert('L').point(lambda v: 128 + (v - 128) * 0.42)
    grain = Image.merge('RGBA', (noise, noise, noise, Image.new('L', (S, S), 14)))
    layer = Image.alpha_composite(layer, grain)

    img = Image.alpha_composite(img.convert('RGBA'), layer).convert('RGB')

    # 轻暗角
    vig = Image.new('L', (S, S), 0)
    vd = ImageDraw.Draw(vig)
    for k in range(26):
        a = int(30 * (k / 25.0))
        m = int(S * 0.55 * (1 - k / 52.0))
        vd.rectangle([-m + k * 3, -m + k * 3, S + m - k * 3, S + m - k * 3], outline=a)
    vig = vig.filter(ImageFilter.GaussianBlur(S * 0.07))
    dark_img = Image.new('RGB', (S, S), (0, 0, 0))
    img = Image.composite(dark_img, img, vig.point(lambda v: min(255, v)))

    img.save(os.path.join(OUT, '%d.jpg' % i), quality=82, optimize=True, progressive=True)

print('done', len(songs))
