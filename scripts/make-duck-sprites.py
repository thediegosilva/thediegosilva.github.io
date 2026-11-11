"""Gera a folha de sprites em pixel art do Pato Vírus (8 direções x várias animações).

O pato é montado com elipsoides (corpo, cabeça, bico, asas, pernas, patas), girado para
cada direção e "pixelizado" numa grade 32x32 com sombreamento em blocos e contorno escuro.
Assim os 8 ângulos ficam coerentes entre si.

Uso: python scripts/make-duck-sprites.py   (precisa de numpy e pillow)
Saída: public/assets/pato/pato-sprites.png e src/data/duckSprites.ts
"""
import json
import math
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PNG = os.path.join(ROOT, 'public', 'assets', 'pato', 'pato-sprites.png')
OUT_TS = os.path.join(ROOT, 'src', 'data', 'duckSprites.ts')

CELL = 32
UNIT = 0.135          # unidades do mundo por pixel
PITCH = math.radians(32)  # câmera olhando de cima

# paletas (do claro ao escuro)
PAL = {
    'body': ['#fff2a8', '#ffd23f', '#f0ac17', '#bf7d0c'],
    'wing': ['#ffe27a', '#f5bf1f', '#d99410', '#a8660a'],
    'beak': ['#ffc56b', '#ff8a1e', '#d9620b', '#a8450a'],
    'eye': ['#1b1430'] * 4,
    'brow': ['#3a1f08'] * 4,
    'corn': ['#fff59a', '#ffd84a', '#e0a92a', '#a8761a'],
    'leaf': ['#9be08a', '#5fb84a', '#3d8a32', '#2a6324'],
    'watch': ['#f2f2f8', '#b8b8c8', '#7a7a90', '#4a4a5e'],
    'strap': ['#5a3a8a', '#43296b', '#301d4f', '#201338'],
}
OUTLINE = (58, 31, 8, 255)
SHADOW = (0, 0, 0, 70)


def hex2rgba(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


PALRGBA = {k: [hex2rgba(c) for c in v] for k, v in PAL.items()}


def rot(axis, ang):
    c, s = math.cos(ang), math.sin(ang)
    if axis == 'x':
        return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if axis == 'y':
        return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def duck_parts(pose):
    """Partes do pato no espaço local (x = frente, y = cima, z = lado)."""
    bob = pose.get('bob', 0.0)
    lift = pose.get('lift', 0.0)
    y0 = 0.95 + bob + lift
    parts = []
    E = lambda c, r, mat, R=None: parts.append((np.array(c, float), np.array(r, float), mat, np.eye(3) if R is None else R))

    if pose.get('sit'):
        y0 -= 0.38
    if pose.get('lie'):
        y0 -= 0.5

    # corpo e rabo
    if pose.get('lie'):
        E((0, y0, 0), (1.25, 0.5, 0.88), 'body')
    else:
        E((0, y0, 0), (1.15, 0.72, 0.8), 'body')
    E((-1.05, y0 + 0.35, 0), (0.42, 0.24, 0.32), 'body', rot('z', 0.5))

    # cabeça (pescoço curto); comer = cabeça para baixo e para frente; grasnar = cabeça um pouco para cima
    hx, hy = 0.75, y0 + 1.05
    if pose.get('eat'):
        hx, hy = 1.35, y0 + 0.15 + pose.get('peck', 0.0)
    if pose.get('lie'):
        hx, hy = 1.25, y0 + 0.2
    if pose.get('quack'):
        hy += 0.08
    if pose.get('loud'):
        hy += 0.22
        hx -= 0.08
    hy -= pose.get('drop', 0.0)
    tilt = pose.get('tilt', 0.0)
    head_start = len(parts)
    if not pose.get('lie'):
        E((0.45, y0 + 0.55, 0), (0.42, 0.55, 0.42), 'body')  # pescoço
    E((hx, hy, 0), (0.58, 0.55, 0.55), 'body')

    # bico (aberto = duas metades separadas)
    bx = hx + 0.62
    by = hy - 0.08
    if pose.get('loud'):
        E((bx, by + 0.18, 0), (0.44, 0.11, 0.27), 'beak', rot('z', 0.45))
        E((bx - 0.05, by - 0.2, 0), (0.38, 0.09, 0.23), 'beak', rot('z', -0.55))
    elif pose.get('quack'):
        E((bx, by + 0.1, 0), (0.42, 0.11, 0.26), 'beak', rot('z', 0.18))
        E((bx - 0.03, by - 0.12, 0), (0.36, 0.09, 0.22), 'beak', rot('z', -0.25))
    else:
        E((bx, by, 0), (0.44, 0.15, 0.27), 'beak')
    if pose.get('corn'):
        E((bx + 0.35, by - 0.05, 0), (0.18, 0.18, 0.55), 'corn', rot('x', 0.2))
        E((bx + 0.35, by + 0.05, 0.55), (0.12, 0.08, 0.25), 'leaf', rot('x', 0.5))

    # olhos e sobrancelhas franzidas (pato chato)
    blink = pose.get('blink')
    wink = pose.get('wink')
    for side in (-1, 1):
        ex, ey, ez = hx + 0.3, hy + 0.15, side * 0.42
        if blink or (wink and side == 1):
            E((ex, ey, ez), (0.13, 0.035, 0.11), 'eye')
        else:
            E((ex, ey, ez), (0.12, 0.14, 0.11), 'eye')
        E((ex - 0.02, ey + 0.2, ez * 1.02), (0.2, 0.05, 0.1), 'brow', rot('z', -0.45))

    if tilt:
        Rt = rot('x', tilt)
        pivot = np.array([hx, hy - 0.4, 0])
        for k in range(head_start, len(parts)):
            c, r, m, Rp = parts[k]
            parts[k] = (pivot + Rt @ (c - pivot), r, m, Rt @ Rp)

    # asas: cada lado pode ter uma pose
    flap = pose.get('flap')
    wings = pose.get('wings', {})
    for side in (-1, 1):
        w = wings.get(side, wings.get(0, 'flap' if flap is not None else 'fold'))
        if w == 'fold':
            E((-0.1, y0 + 0.08, side * 0.78), (0.82, 0.42, 0.16), 'wing', rot('z', 0.15))
        elif w == 'flap':
            R = rot('x', side * flap) @ rot('z', 0.1)
            c = np.array([-0.1, y0 + 0.25, side * 0.78]) + R @ np.array([0, 0, side * 0.6])
            E(tuple(c), (0.78, 0.14, 0.75), 'wing', R)
        elif w == 'droop':
            E((0.0, y0 - 0.3, side * 0.88), (0.78, 0.4, 0.15), 'wing', rot('z', -0.45))
        elif w == 'up':
            E((0.2, y0 + 1.0, side * 0.85), (0.2, 0.72, 0.15), 'wing', rot('z', -0.12))
        elif w == 'down':
            E((0.55, y0 - 0.42, side * 0.82), (0.2, 0.62, 0.15), 'wing', rot('z', 0.65))
        elif w == 'fwd':
            E((1.05, y0 + 0.38, side * 0.55), (0.82, 0.18, 0.16), 'wing', rot('z', 0.12))
        elif w == 'tap':
            E((0.85, y0 + 0.3, side * 0.62), (0.62, 0.18, 0.16), 'wing', rot('z', 0.2))
        elif w == 'eye':
            E((hx + 0.15, hy - 0.2, side * 0.7), (0.2, 0.58, 0.15), 'wing', rot('z', -0.75))
        elif w == 'cover':
            E((hx + 0.42, hy + 0.12, side * 0.3), (0.2, 0.3, 0.42), 'wing')
        elif w == 'chin':
            E((hx + 0.32, hy - 0.5, side * 0.45), (0.22, 0.5, 0.16), 'wing', rot('z', -0.5))
        elif w == 'cross':
            E((0.88, y0 + 0.25, side * 0.22), (0.2, 0.58, 0.42), 'wing', rot('x', side * 0.75))
        elif w == 'hip':
            E((0.05, y0 + 0.25, side * 1.05), (0.5, 0.34, 0.15), 'wing', rot('z', 0.95))
        elif w == 'spread':
            R = rot('x', side * 0.05)
            c = np.array([0.0, y0 + 0.35, side * 0.78]) + R @ np.array([0, 0, side * 0.9])
            E(tuple(c), (0.6, 0.13, 0.95), 'wing', R)
        elif w == 'watch':
            E((0.95, y0 + 0.55, side * 0.42), (0.62, 0.17, 0.18), 'wing', rot('z', 0.4))
            E((1.32, y0 + 0.78, side * 0.42), (0.1, 0.2, 0.21), 'strap')
            E((1.37, y0 + 0.82, side * 0.42), (0.06, 0.14, 0.15), 'watch')

    # pernas e patas (ciclo de passos)
    if pose.get('sit'):
        sw = pose.get('swing', 0.0)
        for i, side in enumerate((-1, 1)):
            k = sw if i == 0 else -sw
            E((0.75, y0 - 0.35 + k, side * 0.34), (0.32, 0.08, 0.2), 'beak', rot('z', 0.3 + k))
    elif not pose.get('tuck') and not pose.get('lie'):
        ph = pose.get('step', None)
        for i, side in enumerate((-1, 1)):
            a = 0.0 if ph is None else math.sin(ph + i * math.pi) * 0.55
            lift_foot = 0.0 if ph is None else max(0.0, math.cos(ph + i * math.pi)) * 0.18
            fx = 0.05 + a * 0.7
            fy = 0.08 + lift_foot + lift
            leg_top = np.array([0.0, y0 - 0.5, side * 0.32])
            foot = np.array([fx, fy, side * 0.34])
            mid = (leg_top + foot) / 2
            v = leg_top - foot
            ang = math.atan2(v[0], v[1])
            E(tuple(mid), (0.09, np.linalg.norm(v) / 2, 0.09), 'beak', rot('z', -ang))
            E((fx + 0.18, fy, side * 0.34), (0.3, 0.07, 0.22), 'beak')
    return parts


def render(pose, yaw):
    """Renderiza um quadro 32x32 (RGBA) com o pato virado para `yaw`."""
    # coordenadas do mundo: x direita, y cima, z para a câmera
    fwd = np.array([math.cos(yaw), 0, math.sin(yaw)])
    up = np.array([0, 1, 0])
    side = np.cross(fwd, up)
    W = np.stack([fwd, up, -side], axis=1)  # local -> mundo (x->fwd, y->up, z->lado)

    d = np.array([0, -math.sin(PITCH), -math.cos(PITCH)])  # direção da câmera
    cam_up = np.array([0, math.cos(PITCH), -math.sin(PITCH)])
    right = np.array([1, 0, 0])
    light = np.array([-0.55, 0.75, 0.45])
    light /= np.linalg.norm(light)

    ys, xs = np.mgrid[0:CELL, 0:CELL]
    u = (xs + 0.5 - CELL / 2) * UNIT
    v = (CELL * 0.62 - (ys + 0.5)) * UNIT  # chão perto da base do quadro
    origins = (u[..., None] * right + v[..., None] * cam_up + np.array([0, 0.9, 0])) - 20 * d

    best_t = np.full((CELL, CELL), np.inf)
    mat_idx = np.full((CELL, CELL), -1)
    normals = np.zeros((CELL, CELL, 3))
    parts = duck_parts(pose)
    for k, (c, r, mat, R) in enumerate(parts):
        M = W @ R  # local da peça -> mundo
        cw = W @ c
        o = (origins - cw) @ M / r
        dl = (d @ M) / r
        a = dl @ dl
        b = 2 * (o @ dl)
        cc = np.einsum('ijk,ijk->ij', o, o) - 1
        disc = b * b - 4 * a * cc
        hit = disc >= 0
        t = np.where(hit, (-b - np.sqrt(np.maximum(disc, 0))) / (2 * a), np.inf)
        closer = hit & (t < best_t) & (t > 0)
        if not closer.any():
            continue
        best_t[closer] = t[closer]
        mat_idx[closer] = k
        tt = np.where(closer, t, 0.0)
        p_local = o + tt[..., None] * dl  # ponto na esfera unitária
        n_local = p_local / r  # gradiente da elipsoide
        n_world = n_local @ M.T
        n_world /= np.linalg.norm(n_world, axis=-1, keepdims=True) + 1e-9
        normals[closer] = n_world[closer]

    img = np.zeros((CELL, CELL, 4), np.uint8)

    # sombra no chão
    shadow_scale = 1 - min(0.5, pose.get('lift', 0) * 0.6)
    ground = (u / (1.3 * shadow_scale)) ** 2 + ((v - (-0.05) / math.cos(PITCH)) / (0.55 * shadow_scale)) ** 2
    img[ground < 1] = SHADOW

    # cor com sombreamento em 4 tons
    filled = mat_idx >= 0
    for k, (_, _, mat, _) in enumerate(parts):
        m = mat_idx == k
        if not m.any():
            continue
        inten = normals[m] @ light
        tone = np.where(inten > 0.72, 0, np.where(inten > 0.25, 1, np.where(inten > -0.2, 2, 3)))
        ramp = np.array(PALRGBA[mat], np.uint8)
        img[m] = ramp[tone]

    # contorno escuro de 1 pixel em volta da silhueta
    pad = np.pad(filled, 1)
    neigh = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    outline = neigh & ~filled
    img[outline] = OUTLINE
    return img


# direções: 0=E, 1=SE, 2=S, 3=SO, 4=O, 5=NO, 6=N, 7=NE (S = vindo para a tela)
DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']
YAWS = [math.radians(a) for a in (0, 45, 90, 135, 180, 225, 270, 315)]

ANIMS = {
    'idle': [{}, {'bob': -0.04}, {'blink': True}],
    'walk': [{'step': i * math.pi / 2, 'bob': 0.05 * abs(math.sin(i * math.pi / 2))} for i in range(4)],
    'fly': [{'flap': f, 'lift': 0.55, 'tuck': True} for f in (0.9, 0.25, -0.45)],
    'quack': [{'quack': True}, {}],
    'eat': [{'eat': True, 'peck': 0.12}, {'eat': True, 'peck': -0.05}],
    'tired': [{'wings': {0: 'droop'}, 'drop': 0.18, 'quack': True, 'tuck': True, 'lift': 0.2},
              {'wings': {0: 'droop'}, 'drop': 0.24, 'tuck': True, 'lift': 0.14}],
    'tilt': [{'tilt': 0.42}],
    'cover': [{'wings': {1: 'cover', -1: 'flap'}, 'flap': 0.6, 'tuck': True, 'lift': 0.4},
              {'wings': {1: 'cover', -1: 'flap'}, 'flap': -0.3, 'tuck': True, 'lift': 0.45}],
    'model': [{'wings': {1: 'hip', -1: 'hip'}, 'wink': True, 'tilt': -0.18}],
    'pointUp': [{'wings': {1: 'up'}}],
    'pointDown': [{'wings': {1: 'down'}, 'drop': 0.08}],
    'pointFwd': [{'wings': {1: 'fwd'}}],
    'pointEye': [{'wings': {1: 'eye'}}],
    'tap': [{'wings': {1: 'fwd'}}, {'wings': {1: 'tap'}}],
    'think': [{'sit': True, 'wings': {1: 'chin'}, 'tilt': 0.25}],
    'cry': [{'blink': True, 'drop': 0.12, 'quack': True}],
    'cross': [{'wings': {0: 'cross'}, 'tilt': -0.12}],
    'loud': [{'loud': True}],
    'watch': [{'wings': {1: 'watch'}, 'drop': 0.15}],
    'measure': [{'wings': {0: 'spread'}}],
    'lie': [{'lie': True, 'blink': True}],
    'sit': [{'sit': True, 'swing': 0.12}, {'sit': True, 'swing': -0.12}],
    'carry': [{'flap': f, 'lift': 0.5, 'tuck': True, 'corn': True} for f in (0.9, 0.25, -0.45)],
}

frames_meta = {}
columns = []
for name, poses in ANIMS.items():
    frames_meta[name] = list(range(len(columns), len(columns) + len(poses)))
    columns.extend(poses)

sheet = Image.new('RGBA', (CELL * len(columns), CELL * len(DIRS)), (0, 0, 0, 0))
for row, yaw in enumerate(YAWS):
    for col, pose in enumerate(columns):
        sheet.paste(Image.fromarray(render(pose, yaw)), (col * CELL, row * CELL))

os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)
sheet.save(OUT_PNG, optimize=True)

# ---------------- objetos (props) 16x16 em pixel art ----------------
PC = {'.': None, 'o': '#1b1430', 'w': '#ffffff', 'b': '#7ee0ff', 'B': '#3a8bd9', 'p': '#ff4f93', 'P': '#c2185b',
      'y': '#ffe066', 'Y': '#f0a91a', 'r': '#c4874e', 'R': '#7a4a22', 'g': '#c8c8d8'}


def sign7():
    seven = ['wwwwww', '....ww', '...ww.', '..ww..', '..ww..', '..ww..']
    rows = []
    rows.append('o' * 12)
    for i in range(8):
        inner = 'rr' + (seven[i - 1].replace('.', 'r') if 1 <= i <= 6 else 'rrrrrr') + 'rr'
        rows.append('o' + inner + 'o')
    rows.append('o' * 12)
    for _ in range(4):
        rows.append('.....oRo....')
    rows.append('.....ooo....')
    return rows


PROPS = {
    'question': ['..oooooo..', '.owwwwwwo.', 'owwooowwwo', 'oowo..owwo', '.oo..owwo.', '....owwo..', '...owwo...',
                 '...owwo...', '...oooo...', '...owwo...', '...owwo...', '...oooo...'],
    'exclaim': ['.oooo.', '.owwo.', '.owwo.', '.owwo.', '.owwo.', '.owwo.', '.oooo.', '.owwo.', '.oooo.'],
    'sweat': ['...o...', '..obo..', '..obo..', '.obbbo.', 'obbbwbo', 'obbbbbo', '.obbbo.', '..ooo..'],
    'tear': ['..o..', '.obo.', '.obo.', 'obbwo', 'obbbo', '.ooo.'],
    'note': ['....ooooo', '....owwwo', '....owooo', '....owo..', '....owo..', '.oooowo..', 'owwwwwo..', 'owwwwo...',
             '.oooo....'],
    'sparkle': ['...o...', '..oyo..', '.oyyyo.', 'oyywyyo', '.oyyyo.', '..oyo..', '...o...'],
    'heart': ['.oo...oo.', 'oppo.oppo', 'opwpopppo', 'oppppppPo', '.oppppPo.', '..oppPo..', '...oPo...', '....o....'],
    'zzz': ['ooooooo....', 'owwwwwo....', 'oooowwo....', '..owwo.....', '.owwoooo...', 'owwwwwwo...', 'oooooooooooo',
            '.......owwwo', '........owo.', '.......owwwo', '.......ooooo'],
    'dots': ['oooo.oooo.oooo', 'owwo.owwo.owwo', 'owwo.owwo.owwo', 'oooo.oooo.oooo'],
    'magnifier': ['..oooo....', '.obbbbo...', 'obwbbbbo..', 'obbbbbbo..', 'obbbbbbo..', '.obbbbo...', '..ooooRo..',
                  '......oRo.', '.......oRo', '........oo'],
    'sign7': sign7(),
}
PCELL = 16
props_sheet = Image.new('RGBA', (PCELL * len(PROPS), PCELL), (0, 0, 0, 0))
for i, (name, rows) in enumerate(PROPS.items()):
    w = max(len(r) for r in rows)
    h = len(rows)
    ox, oy = i * PCELL + (PCELL - w) // 2, PCELL - h
    for y, row in enumerate(rows):
        for x, ch in enumerate(row.ljust(w, '.')):
            col = PC.get(ch)
            if col:
                props_sheet.putpixel((ox + x, oy + y), hex2rgba(col))
OUT_PROPS = os.path.join(os.path.dirname(OUT_PNG), 'pato-props.png')
props_sheet.save(OUT_PROPS, optimize=True)

with open(OUT_TS, 'w') as f:
    f.write('// Gerado por scripts/make-duck-sprites.py — não edite à mão.\n')
    f.write(f'export const DUCK_CELL = {CELL};\n')
    f.write(f'export const DUCK_COLS = {len(columns)};\n')
    f.write(f'/** linhas da folha: {", ".join(f"{i}={d}" for i, d in enumerate(DIRS))} */\n')
    f.write(f'export const DUCK_DIRS = {json.dumps(DIRS)} as const;\n')
    f.write(f'export const DUCK_ANIMS = {json.dumps(frames_meta)} as const;\n')
    f.write(f'export const DUCK_SHEET = {{ w: {sheet.size[0]}, h: {sheet.size[1]} }};\n')
    f.write(f'export const PROP_CELL = {PCELL};\n')
    f.write(f'export const DUCK_PROPS = {json.dumps({k: i for i, k in enumerate(PROPS)})} as const;\n')
    f.write(f'export type DuckProp = keyof typeof DUCK_PROPS;\n')
print(f'{OUT_PNG}: {sheet.size[0]}x{sheet.size[1]} ({len(columns)} quadros x {len(DIRS)} direções)')
