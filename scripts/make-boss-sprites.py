"""Gera a pixel art dos chefes das fases 1 e 2 do minigame do pato, a partir das artes de
referência (scripts/ref/boss1.jpg e boss2.jpg), em camadas animáveis — como o Doutor Insano.

  Boss 1 — Disco Voador do Pato: casco, pato (corpo, cabeça, bico de baixo), aro da
           cabine por cima do pato e antena que balança.
  Boss 2 — Pato na Moto-Turbina: moto, pato (corpo, cabeça, bico de baixo), braço que
           aponta (e atira) e rabo que abana.

Passos: tira o fundo branco e a fumaça/chamas (no jogo viram partículas), recorta as
peças em alta resolução, reconstrói o que cada peça escondia (vidro da cúpula / metal),
reduz para a grade do jogo com paleta única e limpa pixels soltos.

Uso: python scripts/make-boss-sprites.py   (precisa de numpy, pillow e opencv-python)
Saída: public/assets/pato/boss1.png, boss2.png e src/game/boss-data.js (gerado)
"""
import json
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_JS = os.path.join(ROOT, 'src', 'game', 'boss-data.js')

BOSSES = {
    'boss1': {
        'src': 'boss1.jpg',
        'box': (38, 70, 1006, 810),
        'width': 114,  # px no jogo
        'cut': [((1006, 0, 1187, 888), None)],  # fumaça atrás do motor
        'protect': [(200, 70, 760, 470)],  # brilhos brancos da cúpula não são fundo
        'parts': {
            'duckHead': [(325, 290), (360, 262), (405, 250), (410, 215), (440, 175), (470, 148), (520, 143),
                         (562, 168), (602, 208), (607, 240), (592, 262), (572, 300), (548, 330), (526, 350),
                         (470, 342), (445, 337), (430, 330), (330, 322)],
            'duckBody': [(415, 330), (552, 330), (552, 452), (430, 458), (345, 452), (338, 378), (380, 358)],
            'antenna': [(778, 148), (842, 148), (842, 292), (778, 292)],
        },
        'jaw': [(342, 309), (428, 309), (428, 330), (342, 330)],
        'rim': (198, 428, 762, 475),  # aro da cabine (desenhado por cima do pato)
        'glass': (205, 75, 755, 440),
        'order': ['hull', 'duckBody', 'duckHead', 'jaw', 'rim', 'antenna'],
        'pivots': {'antenna': (803, 296), 'duck': (470, 455), 'head': (480, 340)},
        'points': {
            'eye': (440, 257),
            'fan': (722, 672),
            'exhaust': (1000, 456),
            'cannon': (48, 598),
            'lights': [(205, 445), (350, 492), (752, 450), (855, 680), (245, 467), (682, 478), (787, 588), (68, 620), (210, 672)],
        },
        'fanR': 40,
    },
    'boss2': {
        'src': 'boss2.jpg',
        'box': (55, 325, 1508, 2015),
        'height': 122,
        'cut': [((1506, 0, 1792, 2400), None), ((1320, 600, 1506, 1200), 'smoke')],
        'protect': [],
        # áreas brancas fechadas só são fundo abaixo do jaleco (vãos do guidão, entre as pernas);
        # acima disso, o branco é o jaleco e o cabelo do pato
        'enclosed_bg_min_y': 990,
        'parts': {
            'duckHead': [(490, 700), (540, 670), (530, 540), (545, 470), (560, 430), (600, 385), (660, 350), (790, 328),
                         (840, 378), (900, 398), (940, 458), (988, 500), (962, 560), (992, 640), (942, 700), (902, 760),
                         (832, 790), (800, 800), (600, 802), (530, 782), (500, 742)],
            'armPoint': [(372, 718), (472, 718), (532, 758), (602, 788), (762, 798), (772, 882), (602, 884), (522, 872), (372, 872)],
            'tail': [(1122, 846), (1226, 846), (1226, 972), (1122, 972)],
            'duckBody': [(742, 782), (1002, 772), (1124, 846), (1124, 972), (1100, 1100), (1000, 1142), (780, 1132),
                         (700, 1062), (560, 1052), (560, 940), (700, 882)],
        },
        'jaw': [(545, 742), (792, 742), (792, 798), (545, 798)],
        'fill_below': 1085,  # embaixo disso, o que o pato escondia é moto (reconstrói)
        # o que é moto: abaixo da linha do assento + guidão (o resto que sobrar é do pato)
        'base_region': [(0, 1085), (1792, 1085), (1792, 2400), (0, 2400)],
        'handlebar': [(385, 1115), (425, 1000), (515, 935), (565, 948), (645, 952), (668, 1120)],
        'order': ['vehicle', 'tail', 'duckBody', 'duckHead', 'jaw', 'armPoint'],
        'pivots': {'armPoint': (760, 842), 'tail': (1132, 928), 'duck': (880, 1120), 'head': (760, 790)},
        'points': {
            'eyes': [(585, 630), (703, 622)],
            'finger': (392, 742),
            'fan': (1420, 1418),
            'exhausts': [(1335, 1140), (1500, 1392), (1500, 1792)],
            'nose': (62, 1400),
            'lights': [(575, 1240), (565, 1320), (615, 1320), (1180, 1200), (1100, 1480), (1030, 1560), (1260, 1740), (395, 1205)],
        },
        'fanR': (60, 145),
    },
}


def poly(shape, pts):
    m = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.array(m) > 0


def rect(shape, r):
    m = np.zeros(shape, bool)
    m[r[1]:r[3], r[0]:r[2]] = True
    return m


def cutout(cfg, src):
    h, w = src.shape[:2]
    white = (src.astype(int).min(2) > 215).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(white, connectivity=4)
    bg = np.zeros((h, w), bool)
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if area < 1500:
            continue
        if any(x >= p[0] and y >= p[1] and x + bw <= p[2] and y + bh <= p[3] for p in cfg['protect']):
            continue
        touches = x == 0 or y == 0 or x + bw == w or y + bh == h
        if not touches and y < cfg.get('enclosed_bg_min_y', 0):
            continue
        bg |= lab == i
    alpha = ~bg
    hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV)
    for r, kind in cfg['cut']:
        z = rect((h, w), r)
        if kind is None:
            alpha &= ~z
        else:  # fumaça cinza e chamas laranja
            smoke = (hsv[..., 1] < 60) & (hsv[..., 2] > 90)
            flame = (hsv[..., 0] < 30) & (hsv[..., 1] > 90) & (hsv[..., 2] > 150)
            alpha &= ~(z & (smoke | flame))
    alpha = cv2.morphologyEx(alpha.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(alpha, connectivity=8)
    return np.isin(lab, [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > 2500])


def glass_fill(img, hole, glass):
    """preenche com a cor típica do vidro em cada altura (mediana da linha, suavizada)"""
    out = img.copy().astype(np.float32)
    rows = np.nonzero(hole.any(1))[0]
    med = {}
    for y in rows:
        good = glass[y] & ~hole[y]
        if good.sum() >= 4:
            med[y] = np.median(img[y, good].astype(np.float32), axis=0)
    ys = np.array(sorted(med))
    cols = np.array([med[y] for y in ys])
    k = np.ones(21) / 21
    smooth = np.stack([np.convolve(np.pad(cols[:, c], 10, mode='edge'), k, 'valid') for c in range(3)], 1)
    for y in rows:
        xs = np.nonzero(hole[y])[0]
        out[y, xs] = [np.interp(y, ys, smooth[:, c]) for c in range(3)]
    return np.clip(out, 0, 255).astype(np.uint8)


def inpaint(img, hole):
    small = cv2.resize(img, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    hs = cv2.resize(hole.astype(np.uint8), (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    rec = cv2.inpaint(small, cv2.dilate(hs, np.ones((3, 3), np.uint8)), 6, cv2.INPAINT_TELEA)
    rec = cv2.resize(rec, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)
    out = img.copy()
    out[hole] = rec[hole]
    return out


def to_grid(cfg, img_bgr, mask, scale):
    x0, y0, x1, y1 = cfg['box']
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)[y0:y1, x0:x1] / 255
    a = mask[y0:y1, x0:x1].astype(np.float32)
    tw, th = round((x1 - x0) * scale), round((y1 - y0) * scale)
    ps = cv2.resize(rgb * a[..., None], (tw, th), interpolation=cv2.INTER_AREA)
    pa = cv2.resize(a, (tw, th), interpolation=cv2.INTER_AREA)
    col = ps / np.maximum(pa[..., None], 1e-4)
    return np.clip(col * 255, 0, 255).astype(np.uint8), pa > 0.5


def polish(rgb):
    im = Image.fromarray(rgb, 'RGB')
    return np.array(ImageEnhance.Color(im).enhance(1.15).filter(ImageFilter.UnsharpMask(1.0, 40, 3)))


def despeckle(idx, alpha):
    h, w = idx.shape
    out = idx.copy()
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if not alpha[y, x]:
                continue
            vals = [int(v) for v, ok in zip(idx[y - 1:y + 2, x - 1:x + 2].ravel(), alpha[y - 1:y + 2, x - 1:x + 2].ravel()) if ok]
            if vals.count(int(idx[y, x])) == 1 and len(vals) >= 7:
                best = max(set(vals), key=vals.count)
                if vals.count(best) >= 4:
                    out[y, x] = best
    return out


def build(name, cfg):
    src = cv2.imread(os.path.join(ROOT, 'scripts', 'ref', cfg['src']))
    shape = src.shape[:2]
    alpha = cutout(cfg, src)
    x0, y0, x1, y1 = cfg['box']
    scale = cfg['width'] / (x1 - x0) if 'width' in cfg else cfg['height'] / (y1 - y0)

    parts = {k: poly(shape, p) & alpha for k, p in cfg['parts'].items()}
    jaw_m = poly(shape, cfg['jaw']) & parts['duckHead']
    parts['duckHead'] &= ~jaw_m
    parts['jaw'] = jaw_m
    taken = np.zeros(shape, bool)
    for m in parts.values():
        taken |= m
    base_name = cfg['order'][0]
    base = alpha & ~taken
    yy = np.mgrid[0:shape[0], 0:shape[1]][0]
    if 'glass' in cfg:
        # o que o pato escondia dentro da cúpula vira vidro
        hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV)
        g = rect(shape, cfg['glass'])
        glass = g & alpha & ~taken & (hsv[..., 2] > 170) & (hsv[..., 1] < 110) & (src[..., 0].astype(int) > src[..., 2].astype(int) + 8)
        hole = taken & g & ~parts['antenna']
        base_img = glass_fill(src, hole, glass)
        base = base | hole
    else:
        region = poly(shape, cfg['base_region']) | poly(shape, cfg['handlebar'])
        leftovers = base & ~region  # fiapos do pato fora dos polígonos
        parts['duckBody'] |= leftovers
        base &= region
        taken |= leftovers
        hole = taken & (yy > cfg['fill_below'])
        base_img = inpaint(src, hole)
        base = base | hole
    layers = {base_name: (base_img, base)}
    for k, m in parts.items():
        layers[k] = (src, m)
    if 'rim' in cfg:
        r = rect(shape, cfg['rim']) & base
        layers['rim'] = (base_img, r)

    grids = {k: to_grid(cfg, img, m, scale) for k, (img, m) in layers.items()}
    h, w = grids[base_name][1].shape
    comp = np.zeros((h, w, 3), np.uint8)
    for k in cfg['order']:
        rgb, a = grids[k]
        comp[a] = rgb[a]
    pal_img = Image.fromarray(polish(comp)).quantize(96, method=Image.Quantize.FASTOCTREE, kmeans=4, dither=Image.Dither.NONE)
    palette = np.array(pal_img.getpalette()[:96 * 3], np.uint8).reshape(-1, 3)
    frames = {}
    for k in cfg['order']:
        rgb, a = grids[k]
        idx = np.array(Image.fromarray(polish(rgb)).quantize(palette=pal_img, dither=Image.Dither.NONE))
        if k not in ('duckHead', 'jaw'):
            idx = despeckle(idx, a)
        out = np.zeros((h, w, 4), np.uint8)
        out[..., :3] = palette[idx]
        out[..., 3] = a * 255
        frames[k] = out

    sheet = Image.new('RGBA', (w * len(cfg['order']), h), (0, 0, 0, 0))
    for i, k in enumerate(cfg['order']):
        sheet.paste(Image.fromarray(frames[k], 'RGBA'), (i * w, 0))
    out_png = os.path.join(ROOT, 'public', 'assets', 'pato', f'{name}.png')
    sheet.save(out_png, optimize=True)

    def P(pt):
        return [round((pt[0] - x0) * scale), round((pt[1] - y0) * scale)]

    def walk(v):
        if isinstance(v, tuple) and len(v) == 2 and all(isinstance(n, (int, float)) for n in v):
            return P(v)
        if isinstance(v, list):
            return [walk(i) for i in v]
        return v

    def bbox(k):
        ys, xs = np.nonzero(frames[k][..., 3])
        return [int(xs.min()), int(ys.min()), int(xs.max() + 1 - xs.min()), int(ys.max() + 1 - ys.min())]

    fan = cfg['fanR']
    data = {
        'w': w,
        'h': h,
        'frames': cfg['order'],
        'pivots': {k: P(v) for k, v in cfg['pivots'].items()},
        **{k: walk(v) for k, v in cfg['points'].items()},
        'fanR': [round(f * scale) for f in fan] if isinstance(fan, tuple) else round(fan * scale),
        'jaw': bbox('jaw'),
        'body': bbox(base_name),
    }
    print(f'{out_png}: {len(cfg["order"])} quadros de {w}x{h}')
    return data


def main():
    out = {}
    for name, cfg in BOSSES.items():
        out[name] = build(name, cfg)
    with open(OUT_JS, 'w') as f:
        f.write('// Gerado por scripts/make-boss-sprites.py — não edite à mão.\n')
        f.write('// Medidas em px do quadro de boss1.png / boss2.png (os dois já olham para a esquerda).\n')
        for name, data in out.items():
            f.write(f'export const {name.upper()}_DATA = {json.dumps(data, ensure_ascii=False)};\n')
    print(json.dumps(out))


if __name__ == '__main__':
    main()
