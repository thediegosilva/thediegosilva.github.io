"""Gera a pixel art do Crazy Boss — Doutor Insano (chefe da fase 3 do minigame do pato).

Parte da arte de referência (scripts/ref/crazyboss.jpg) e monta um boneco em camadas:
  1. remove o fundo branco e a fumaça (no jogo a fumaça é animada com partículas);
  2. separa, ainda em alta resolução: aquário, cabeça (boia na água), 3 peixes (nadam),
     tronco de cima (respira) e de baixo, garra erguida e braço de baixo;
     o "buraco" que cada peça deixa é reconstruído (água, metal) por inpainting;
  3. corta as pernas na cintura: no lugar entra um propulsor desenhado aqui, pixel a pixel;
  4. reduz tudo para a grade do jogo com a mesma escala, paleta única (sem pontilhado),
     limpa pixels soltos e espelha (o Doutor olha para a nave, que fica à esquerda);
  5. separa o maxilar do rosto (boca abre e fecha).

Uso: python scripts/make-crazyboss-sprite.py   (precisa de numpy, pillow e opencv-python)
Saída: public/assets/pato/crazyboss.png  — quadros lado a lado, todos alinhados
       src/game/crazyboss-data.js         — ordem dos quadros, pivôs e pontos (gerado)
"""
import json
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'scripts', 'ref', 'crazyboss.jpg')
OUT = os.path.join(ROOT, 'public', 'assets', 'pato', 'crazyboss.png')
OUT_JS = os.path.join(ROOT, 'src', 'game', 'crazyboss-data.js')

# recorte da figura na referência (px originais) e escala final
BOX = (86, 89, 1766, 2400)
SCALE = 0.0762  # ~176 px de altura para a figura inteira (sem pernas fica ~165 com o propulsor)
WAIST_Y = 1790  # corte das pernas (px originais)
BREATH_Y = 1330  # divisão tronco de cima / de baixo (respiração)

# polígonos em px originais (orientação da referência, antes de espelhar)
HEAD_POLY = [(749, 510), (825, 466), (955, 466), (1069, 510), (1080, 608), (1090, 662), (1118, 716),
             (1101, 781), (1052, 825), (1047, 922), (1009, 998), (1031, 1042), (825, 1042), (803, 977),
             (760, 868), (721, 841), (705, 760), (716, 694), (749, 651), (749, 564)]
TANK_RECT = (517, 89, 1240, 1044)  # tampa + vidro
TANK_INNER = (535, 300, 1225, 1030)  # água (onde peixes e cabeça podem aparecer)
FISH_BOXES = [(1074, 521, 1205, 618), (548, 776, 722, 939), (1080, 792, 1210, 917)]
ARM_RAISED = [(1410, 705), (1766, 705), (1766, 1506), (1410, 1506), (1318, 1044), (1318, 890)]
ARM_LOWER = [(86, 1768), (456, 1737), (640, 1845), (640, 2245), (517, 2400), (86, 2400)]
PIVOTS = {'armFront': (1564, 1475), 'armBack': (317, 1814), 'head': (930, 1000)}
POINTS = {
    'eyes': [(821, 758), (978, 758)],
    'core': (1010, 1336),
    'chimneys': [(1287, 705), (409, 694)],
}


def load_cutout():
    src = cv2.imread(SRC)
    h, w = src.shape[:2]
    white = (src.astype(int).min(2) > 215).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(white, connectivity=4)
    bg = np.isin(lab, [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > 3000])
    hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV)
    sat, val = hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    yy, xx = np.mgrid[0:h, 0:w]
    smoke_box = (yy < 880) & (((xx > 100) & (xx < 500)) | ((xx > 1255) & (xx < 1460)))
    smoke = smoke_box & (sat < 45) & (val > 60)
    alpha = (~bg & ~smoke).astype(np.uint8)
    top = (yy < 800) & ((xx < 500) | ((xx > 1255) & (xx < 1460)))
    opened = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((15, 15), np.uint8))
    alpha = np.where(top, opened, alpha).astype(np.uint8)
    # últimos fiapos claros de fumaça acima das chaminés
    gray = src.astype(int).mean(2)
    for (xa, xb, ya, yb) in ((302, 502, 397, 736), (1241, 1410, 489, 828)):
        z = np.zeros(alpha.shape, bool)
        z[ya:yb, xa:xb] = True
        alpha[z & (gray > 120) & (sat < 70)] = 0
    n, lab, stats, _ = cv2.connectedComponentsWithStats(alpha, connectivity=8)
    alpha = np.isin(lab, [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > 4000])
    return src, alpha, hsv


def poly(shape, pts):
    m = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.array(m) > 0


def rect(shape, r):
    m = np.zeros(shape, bool)
    m[r[1]:r[3], r[0]:r[2]] = True
    return m


def fill_rows(img, hole, ok):
    """preenche o buraco com a cor típica da água em cada altura (mediana da linha, suavizada
    na vertical: a água do aquário é quase só um degradê), com ondulação e bolhas de pixel"""
    out = img.copy().astype(np.float32)
    rng = np.random.default_rng(7)
    rows = np.nonzero(hole.any(1))[0]
    med = {}
    for y in rows:
        good = ok[y] & ~hole[y]
        if good.sum() >= 4:
            med[y] = np.median(img[y, good].astype(np.float32), axis=0)
    ys = np.array(sorted(med))
    cols = np.array([med[y] for y in ys])
    k = np.ones(31) / 31
    smooth = np.stack([np.convolve(np.pad(cols[:, c], 15, mode='edge'), k, 'valid') for c in range(3)], 1)
    for y in rows:
        xs = np.nonzero(hole[y])[0]
        base = np.array([np.interp(y, ys, smooth[:, c]) for c in range(3)])
        wave = 1 + 0.05 * np.sin(xs / 37.0 + y / 23.0)
        out[y, xs] = base[None, :] * wave[:, None]
    # algumas bolhas
    hy, hx = np.nonzero(hole)
    for i in rng.choice(len(hy), size=min(40, len(hy)), replace=False):
        cv2.circle(out, (int(hx[i]), int(hy[i])), int(rng.integers(6, 12)), (235, 250, 255), 3)
    return np.clip(out, 0, 255).astype(np.uint8)


def inpaint(img, hole, radius=6):
    """reconstrói a área `hole` a partir da vizinhança (feito em escala reduzida: rápido)"""
    small = cv2.resize(img, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    hs = cv2.resize(hole.astype(np.uint8), (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    hs = cv2.dilate(hs, np.ones((3, 3), np.uint8))
    rec = cv2.inpaint(small, hs, radius, cv2.INPAINT_TELEA)
    rec = cv2.resize(rec, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)
    out = img.copy()
    out[hole] = rec[hole]
    return out


def build_layers(src, alpha, hsv):
    shape = alpha.shape
    water = (hsv[..., 0] >= 80) & (hsv[..., 0] <= 118) & (hsv[..., 1] > 70) & (hsv[..., 2] > 80)
    head = poly(shape, HEAD_POLY) & alpha
    fish = [rect(shape, b) & alpha & ~water for b in FISH_BOXES]
    fish = [cv2.morphologyEx(f.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)) > 0 for f in fish]
    tank = rect(shape, TANK_RECT) & alpha & ~poly(shape, ARM_RAISED)
    arm_front = poly(shape, ARM_RAISED) & alpha
    arm_back = poly(shape, ARM_LOWER) & alpha
    yy = np.mgrid[0:shape[0], 0:shape[1]][0]
    body = alpha & ~tank & ~arm_front & ~arm_back & (yy < WAIST_Y)
    upper = body & (yy < BREATH_Y)
    lower = body & (yy >= BREATH_Y - 40)  # sobreposição: a respiração não abre fresta

    # aquário sem a cabeça e sem os peixes: água reconstruída
    hole = (head | fish[0] | fish[1] | fish[2]) & rect(shape, TANK_INNER)
    hole = cv2.dilate(hole.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    hole &= rect(shape, TANK_INNER)
    tank_img = fill_rows(src, hole, water & rect(shape, TANK_INNER))
    # metal reconstruído atrás dos braços (ombro e perna somem; só o encaixe importa)
    body_img = inpaint(src, (arm_front | arm_back) & body)

    return {
        'lower': (body_img, lower),
        'upper': (body_img, upper),
        'tank': (tank_img, tank),
        'head': (src, head),
        'fishA': (src, fish[0]),
        'fishB': (src, fish[1]),
        'fishC': (src, fish[2]),
        'armFront': (src, arm_front),
        'armBack': (src, arm_back),
    }


def to_grid(img_bgr, mask):
    x0, y0, x1, y1 = BOX
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)[y0:y1, x0:x1] / 255
    a = mask[y0:y1, x0:x1].astype(np.float32)
    tw, th = round((x1 - x0) * SCALE), round((y1 - y0) * SCALE)
    ps = cv2.resize(rgb * a[..., None], (tw, th), interpolation=cv2.INTER_AREA)
    pa = cv2.resize(a, (tw, th), interpolation=cv2.INTER_AREA)
    col = ps / np.maximum(pa[..., None], 1e-4)
    return np.clip(col * 255, 0, 255).astype(np.uint8), pa > 0.5


def polish(rgb):
    im = Image.fromarray(rgb, 'RGB')
    return np.array(ImageEnhance.Color(im).enhance(1.22).filter(ImageFilter.UnsharpMask(1.0, 40, 3)))


def despeckle(idx, alpha):
    """troca pixels solitários (cor que não aparece em nenhum vizinho) pela cor mais comum ao redor"""
    h, w = idx.shape
    out = idx.copy()
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if not alpha[y, x]:
                continue
            nb = idx[y - 1:y + 2, x - 1:x + 2].ravel()
            na = alpha[y - 1:y + 2, x - 1:x + 2].ravel()
            vals = [int(v) for v, ok in zip(nb, na) if ok]
            if vals.count(int(idx[y, x])) == 1 and len(vals) >= 7:
                best = max(set(vals), key=vals.count)
                if vals.count(best) >= 4:
                    out[y, x] = best
    return out


# --------------------------------------------------------------------------------------
# Propulsor (desenhado à mão em código, já na grade final e já espelhado)
# --------------------------------------------------------------------------------------
METAL = ['#120d1c', '#221a2e', '#352c42', '#4b4458', '#6a6a7e', '#9aa6b4', '#c8f0f4']
RIM = ['#5a0f1e', '#a8142e', '#e0405a']


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def draw_thruster(canvas, cx, top):
    """turbina de flutuação em pixel art: anel de encaixe com rebites, carcaça arredondada
    com faixas de plasma, gargalo e sino de exaustão. Sombreado cilíndrico com luz vinda
    da esquerda (lado da nave) e o aro vermelho à direita, como no resto da armadura."""
    # cúpula invertida (como uma turbina de disco voador) terminando num bocal largo
    prof = [(20, 'ring'), (21, 'ring'), (21, 'ring')]
    prof += [(int(round(21 * np.sqrt(max(0.0, 1 - (i / 16.5) ** 2)))), 'pod') for i in range(13)]
    prof += [(12, 'bell'), (13, 'bell'), (14, 'bell')]
    prof += [(14, 'lip')]
    ramp = METAL  # do mais escuro ao mais claro
    for i, (hw, kind) in enumerate(prof):
        y = top + i
        for dx in range(-hw, hw + 1):
            u = dx / max(1, hw)
            # luz difusa (esquerda/cima) + brilho especular estreito
            lum = 0.58 - 0.42 * u
            if -0.62 < u < -0.38:
                lum += 0.25
            if kind == 'pod':
                lum -= 0.025 * (i - 3)  # parte de baixo da cúpula mais escura
            if kind == 'bell':
                lum -= 0.3
            k = int(np.clip(round(lum * 5), 1, 5))
            c = ramp[k]
            if u > 0.8:
                c = RIM[1] if kind in ('pod', 'ring', 'lip') else RIM[0]
            if abs(dx) == hw:
                c = ramp[0]
            if kind == 'ring':
                if i == 2:
                    c = ramp[0] if abs(u) < 0.95 else c
                elif i == 1 and dx % 5 == 0 and abs(u) < 0.9:
                    c = ramp[6]  # rebites
            if kind == 'pod':
                j = i - 3
                if j in (3, 8) and abs(u) < 0.86:
                    c = '#3ad9ff' if abs(dx) % 3 else '#c8f0f4'  # faixas de plasma
                elif j in (2, 9) and abs(u) < 0.86:
                    c = ramp[0]
                elif j == 0 and abs(u) < 0.9:
                    c = ramp[1]
            if kind == 'bell' and abs(u) < 0.6:
                c = '#1e7a8c' if abs(u) < 0.3 else ramp[1]  # brilho do plasma dentro do bocal
            if kind == 'lip':
                c = ramp[0] if abs(u) > 0.92 else ('#7ee0ff' if abs(u) < 0.75 else ramp[4])
            canvas[y, cx + dx] = (*hexrgb(c), 255)
    return top + len(prof)  # boca do bocal (onde nasce a chama)


def main():
    src, alpha, hsv = load_cutout()
    layers = build_layers(src, alpha, hsv)
    grids = {k: to_grid(img, m) for k, (img, m) in layers.items()}
    h, w = next(iter(grids.values()))[1].shape

    # paleta única para todas as peças (cores idênticas nas emendas)
    comp = np.zeros((h, w, 3), np.uint8)
    for k in ('lower', 'upper', 'tank', 'head', 'fishA', 'fishB', 'fishC', 'armBack', 'armFront'):
        rgb, a = grids[k]
        comp[a] = rgb[a]
    pal_img = Image.fromarray(polish(comp)).quantize(128, method=Image.Quantize.FASTOCTREE, kmeans=4, dither=Image.Dither.NONE)
    palette = np.array(pal_img.getpalette()[:128 * 3], np.uint8).reshape(-1, 3)

    frames = {}
    for k, (rgb, a) in grids.items():
        q = Image.fromarray(polish(rgb)).quantize(palette=pal_img, dither=Image.Dither.NONE)
        idx = np.array(q)
        if k not in ('head',):  # o rosto fica intacto (detalhe demais para "limpar")
            idx = despeckle(idx, a)
        out = np.zeros((h, w, 4), np.uint8)
        out[..., :3] = palette[idx]
        out[..., 3] = a * 255
        frames[k] = out[:, ::-1].copy()  # espelha: olha para a esquerda

    # conversão de px originais -> grade final espelhada
    def P(pt):
        x, y = pt
        return [round(w - 1 - (x - BOX[0]) * SCALE), round((y - BOX[1]) * SCALE)]

    # maxilar: parte de baixo do rosto (abaixo dos dentes de cima)
    head = frames['head']
    ys, xs = np.nonzero(head[..., 3])
    jaw_top = P((0, 929))[1]
    jaw = np.zeros_like(head)
    sel = np.zeros(head.shape[:2], bool)
    sel[jaw_top:, :] = True
    jx = P((1031, 0))[0], P((808, 0))[0]
    sel[:, :min(jx)] = False
    sel[:, max(jx) + 1:] = False
    sel &= head[..., 3] > 0
    jaw[sel] = head[sel]
    head = head.copy()
    head[sel, 3] = 0
    frames['head'] = head
    frames['jaw'] = jaw

    # propulsor no lugar das pernas
    thr = np.zeros((h, w, 4), np.uint8)
    waist = P((0, WAIST_Y))[1]
    lower = frames['lower']
    cols = np.nonzero(lower[waist - 3, :, 3])[0]
    cx = int(round((cols.min() + cols.max()) / 2)) if len(cols) else w // 2
    mouth_y = draw_thruster(thr, cx, waist - 4)
    frames['thruster'] = thr

    order = ['lower', 'thruster', 'upper', 'armBack', 'tank', 'fishA', 'fishB', 'fishC', 'head', 'jaw', 'armFront']
    sheet = Image.new('RGBA', (w * len(order), h), (0, 0, 0, 0))
    for i, k in enumerate(order):
        sheet.paste(Image.fromarray(frames[k], 'RGBA'), (i * w, 0))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    sheet.save(OUT, optimize=True)

    def bbox(k):
        ys, xs = np.nonzero(frames[k][..., 3])
        return [int(xs.min()), int(ys.min()), int(xs.max() + 1 - xs.min()), int(ys.max() + 1 - ys.min())]

    hy, hx = np.nonzero(frames['head'][..., 3])
    tx0, ty0 = P((TANK_INNER[2], TANK_INNER[1]))
    tx1, ty1 = P((TANK_INNER[0], TANK_INNER[3]))
    data = {
        'w': w,
        'h': h,
        'frames': order,
        'pivots': {k: P(v) for k, v in PIVOTS.items()},
        'eyes': [P(e) for e in POINTS['eyes']],
        'core': P(POINTS['core']),
        'chimneys': [P(c) for c in POINTS['chimneys']],
        'tank': [tx0, ty0, tx1 - tx0, ty1 - ty0],
        'fish': {k: bbox(k) for k in ('fishA', 'fishB', 'fishC')},
        'jawTop': jaw_top,
        'jaw': bbox('jaw'),
        'breathY': P((0, BREATH_Y))[1],
        'waist': waist,
        'thruster': [cx, mouth_y],
        'body': bbox('upper'),
    }
    with open(OUT_JS, 'w') as f:
        f.write('// Gerado por scripts/make-crazyboss-sprite.py — não edite à mão.\n')
        f.write('// Medidas em px do quadro de crazyboss.png (já espelhado: o Doutor olha para a esquerda).\n')
        f.write(f'export const CRAZY_DATA = {json.dumps(data, ensure_ascii=False)};\n')
    print(f'{OUT}: {len(order)} quadros de {w}x{h}')
    print(json.dumps(data))


if __name__ == '__main__':
    main()
