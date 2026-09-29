import math, os, sys, subprocess as sp
from PIL import Image, ImageDraw, ImageFont
FONT = '/usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf'
if not os.path.exists(FONT): FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def ft(s): return ImageFont.truetype(FONT, s)
W, H = 1920, 1080
SKY = (38, 44, 50); SOIL = (122, 92, 62); SOIL2 = (104, 78, 52); DEEP = (86, 64, 44)
STONE = (205, 185, 150); STONE_D = (150, 132, 104); OR = (224, 120, 47); LT = (237, 230, 218)
RED = (230, 60, 50); YEL = (255, 214, 0); BLUE = (80, 160, 220); GRASS = (96, 130, 60)
GL = 820; TOPY = 380
WALL = [(700, GL), (760, TOPY), (880, TOPY), (960, GL)]   # toe, face top, back top, heel
def ease(t): t = max(0, min(1, t)); return t * t * (3 - 2 * t)
def rot(p, c, a):
    dx, dy = p[0] - c[0], p[1] - c[1]
    return (c[0] + dx * math.cos(a) - dy * math.sin(a), c[1] + dx * math.sin(a) + dy * math.cos(a))
def arrow(d, p0, p1, col, w=8, hs=26):
    d.line([p0, p1], fill=col, width=w)
    a = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    l = (p1[0] - hs * math.cos(a - 0.45), p1[1] - hs * math.sin(a - 0.45))
    r = (p1[0] - hs * math.cos(a + 0.45), p1[1] - hs * math.sin(a + 0.45))
    d.polygon([p1, l, r], fill=col)
def dashed(d, p0, p1, col, w=4, dash=18):
    L = math.dist(p0, p1); n = int(L // dash)
    for i in range(0, n, 2):
        a = i / n; b = min(1, (i + 1) / n)
        d.line([(p0[0] + (p1[0] - p0[0]) * a, p0[1] + (p1[1] - p0[1]) * a), (p0[0] + (p1[0] - p0[0]) * b, p0[1] + (p1[1] - p0[1]) * b)], fill=col, width=w)
def stones(d, poly):
    d.polygon(poly, fill=STONE, outline=STONE_D)
    # course lines interpolated between left and right edges
    (a, b, c, e) = poly
    for k in range(1, 8):
        t = k / 8
        L = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        R = (e[0] + (c[0] - e[0]) * t, e[1] + (c[1] - e[1]) * t)
        d.line([L, R], fill=STONE_D, width=3)
        for j in range(1, 4):
            s = (j + (0.5 if k % 2 else 0)) / 4.5
            p = (L[0] + (R[0] - L[0]) * s, L[1] + (R[1] - L[1]) * s)
            t2 = (k - 1) / 8
            L2 = (a[0] + (b[0] - a[0]) * t2, a[1] + (b[1] - a[1]) * t2)
            R2 = (e[0] + (c[0] - e[0]) * t2, e[1] + (c[1] - e[1]) * t2)
            q = (L2[0] + (R2[0] - L2[0]) * s, L2[1] + (R2[1] - L2[1]) * s)
            d.line([p, q], fill=STONE_D, width=3)
def base(d):
    d.rectangle([0, 0, W, H], fill=SKY)
    d.rectangle([0, GL, W, H], fill=DEEP)
def label(d, xy, t, col=LT, s=40, anchor='la'):
    d.text(xy, t, font=ft(s), fill=col, anchor=anchor, stroke_width=3, stroke_fill=(20, 22, 25))
def header(d, t, sub):
    d.text((80, 60), t, font=ft(64), fill=OR)
    d.text((80, 140), sub, font=ft(36), fill=LT)
def fs_badge(d, txt, on):
    if not on: return
    d.rounded_rectangle([1480, 60, 1840, 170], 16, fill=RED)
    d.text((1660, 115), txt, font=ft(56), fill=(255, 255, 255), anchor='mm')

def overturning(t, T):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im); base(d)
    th = math.radians(14) * ease((t - 1.2) / 3.2)
    piv = WALL[0]
    wp = [rot(p, piv, -th) for p in WALL]  # negative: top moves left
    bt = wp[2]
    drop = (bt[1] - TOPY)
    soil = [bt, (bt[0] + 260, TOPY + drop * 0.35), (W, TOPY), (W, GL + 2), wp[3]]
    d.polygon(soil, fill=SOIL)
    d.rectangle([0, GL, W, GL + 14], fill=GRASS)
    d.line([(bt[0] + 260, TOPY + drop * 0.35), (W, TOPY)], fill=GRASS, width=10)
    stones(d, wp)
    # earth pressure arrows on back face
    for k in range(1, 6):
        s = k / 6
        p = (wp[2][0] + (wp[3][0] - wp[2][0]) * s, wp[2][1] + (wp[3][1] - wp[2][1]) * s)
        L = 40 + 150 * s
        arrow(d, (p[0] + L + 30, p[1]), (p[0] + 12, p[1]), OR, 7, 22)
    label(d, (1180, 520), 'SOIL PUSH', OR, 44)
    label(d, (1180, 575), '(more with water + surcharge)', LT, 30)
    # pivot
    d.ellipse([piv[0] - 16, piv[1] - 16, piv[0] + 16, piv[1] + 16], fill=YEL)
    label(d, (piv[0] - 40, piv[1] + 40), 'PIVOT AT THE TOE', YEL, 38, 'ra')
    # weight arrow
    cg = ((wp[0][0] + wp[1][0] + wp[2][0] + wp[3][0]) / 4, (wp[0][1] + wp[1][1] + wp[2][1] + wp[3][1]) / 4)
    arrow(d, cg, (cg[0], cg[1] + 150), LT, 7, 22)
    label(d, (cg[0] - 30, cg[1] + 60), 'WALL WEIGHT', LT, 30, 'ra')
    # plumb line and angle
    if t > 1.0:
        dashed(d, (piv[0], piv[1]), (piv[0], TOPY - 60), YEL, 4)
        top = rot((piv[0], TOPY - 60), piv, -th)
        d.line([piv, top], fill=RED, width=5)
        r = 300
        if th > 0.005:
            d.arc([piv[0] - r, piv[1] - r, piv[0] + r, piv[1] + r], start=-90 - math.degrees(th), end=-90, fill=RED, width=5)
        ang = math.degrees(th)
        label(d, (piv[0] - 60, piv[1] - r - 60), f'{ang:4.1f}° off plumb', RED, 44, 'ra')
    header(d, 'OVERTURNING', 'The wall rotates forward about its toe')
    fs_badge(d, 'PUSH WINS', t > 4.4)
    return im

def sliding(t, T):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im); base(d)
    dx = -170 * ease((t - 1.2) / 3.4)
    wp = [(x + dx, y) for x, y in WALL]
    # ghost of original
    for i in range(4):
        dashed(d, WALL[i], WALL[(i + 1) % 4], (120, 120, 120), 3)
    soil = [(wp[2][0], TOPY + 0), (wp[2][0] + 40, TOPY - dx * 0.5), (1300, TOPY), (W, TOPY), (W, GL + 2), wp[3]]
    d.polygon(soil, fill=SOIL)
    # toe heave bulge in front
    hv = -dx * 0.55
    bulge = [(wp[0][0] - 380, GL), (wp[0][0] - 180, GL - hv * 0.6), (wp[0][0] - 20, GL - hv), (wp[0][0], GL), ]
    d.rectangle([0, GL, W, GL + 14], fill=GRASS)
    d.polygon(bulge, fill=SOIL2)
    d.line([(wp[2][0] + 40, TOPY - dx * 0.5), (1300, TOPY), (W, TOPY)], fill=GRASS, width=10)
    stones(d, wp)
    # push arrow
    arrow(d, (1300, 640), (wp[2][0] + 70, 640), OR, 16, 44)
    label(d, (1180, 560), 'SOIL PUSH', OR, 48)
    # friction arrow shrinking
    fr = 260 * (1 - 0.8 * ease((t - 1.2) / 3.4))
    col = LT if t < 2.5 else RED
    arrow(d, (wp[0][0] + 20, GL + 70), (wp[0][0] + 20 + fr, GL + 70), col, 14, 36)
    label(d, (wp[0][0] + 20, GL + 110), 'BASE FRICTION + TOE RESISTANCE', col, 34)
    # displacement dimension
    if dx < -5:
        y = TOPY - 70
        d.line([(WALL[1][0], y), (wp[1][0], y)], fill=YEL, width=5)
        d.line([(WALL[1][0], y - 20), (WALL[1][0], y + 20)], fill=YEL, width=5)
        d.line([(wp[1][0], y - 20), (wp[1][0], y + 20)], fill=YEL, width=5)
        label(d, ((WALL[1][0] + wp[1][0]) / 2, y - 60), 'STILL PLUMB. JUST MOVING.', YEL, 40, 'ma')
    header(d, 'SLIDING', 'The whole wall shoves forward along its base')
    fs_badge(d, 'PUSH WINS', t > 4.6)
    return im

C = (800, 273)
A = (350, GL); B = (1500, TOPY)
R = math.dist(C, A)
def scene_global(d):
    base(d)
    soil = [WALL[2], (W, TOPY), (W, GL + 2), WALL[3]]
    d.polygon(soil, fill=SOIL)
    d.rectangle([0, GL, W, GL + 14], fill=GRASS)
    d.line([WALL[2], (W, TOPY)], fill=GRASS, width=10)
    stones(d, WALL)
    # pool + house
    d.rectangle([1080, TOPY - 6, 1320, TOPY + 40], fill=BLUE)
    d.rectangle([1560, TOPY - 200, 1880, TOPY], fill=(170, 150, 130))
    d.polygon([(1540, TOPY - 200), (1720, TOPY - 300), (1900, TOPY - 200)], fill=(90, 70, 60))
    label(d, (1200, TOPY - 60), 'POOL', LT, 30, 'ma')
    label(d, (1720, TOPY - 140), 'HOUSE', (40, 40, 40), 30, 'ma')
def arcpts(a0, a1, n=120):
    return [(C[0] + R * math.cos(a0 + (a1 - a0) * i / n), C[1] + R * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
aA = math.atan2(A[1] - C[1], A[0] - C[0]); aB = math.atan2(B[1] - C[1], B[0] - C[0])
def glob(t, T):
    full = Image.new('RGB', (W, H)); d = ImageDraw.Draw(full); scene_global(d)
    # mask of sliding mass: inside circle and below sky (i.e., soil/wall pixels) between A and B
    mask = Image.new('L', (W, H), 0); md = ImageDraw.Draw(mask)
    md.polygon(arcpts(aB, aA) + [(A[0], GL - 600), (B[0], TOPY - 600)], fill=255)
    circ = Image.new('L', (W, H), 0); ImageDraw.Draw(circ).ellipse([C[0] - R, C[1] - R, C[0] + R, C[1] + R], fill=255)
    from PIL import ImageChops
    mask = ImageChops.multiply(mask, circ)
    phi = 9 * ease((t - 2.6) / 3.0)
    out = full.copy(); od = ImageDraw.Draw(out)
    if phi > 0.01:
        # paint original mass area as void/scarp
        void = Image.new('RGB', (W, H), SKY)
        vd = ImageDraw.Draw(void); vd.rectangle([0, 0, W, H], fill=SKY)
        solid = Image.new('RGB', (W, H), DEEP)
        below = Image.new('L', (W, H), 0); ImageDraw.Draw(below).polygon([(0, GL), (W, GL), (W, H), (0, H)], fill=255)
        out.paste(void, (0, 0), mask)
        out.paste(solid, (0, 0), ImageChops.multiply(mask, below))
        moved = full.copy(); mm = mask.copy()
        moved = moved.rotate(-phi, center=C, resample=Image.BICUBIC); mm = mm.rotate(-phi, center=C, resample=Image.BICUBIC)
        out.paste(moved, (0, 0), mm)
        od = ImageDraw.Draw(out)
    # slip arc drawn progressively
    prog = ease((t - 0.8) / 1.6)
    if prog > 0:
        pts = arcpts(aB, aB + (aA - aB) * prog)
        for i in range(0, len(pts) - 1, 2):
            od.line([pts[i], pts[i + 1]], fill=RED, width=7)
        if prog > 0.95: label(od, (820, 1000), 'DEEP SLIP SURFACE', RED, 42, 'ma')
    if t > 3.4:
        label(od, (1560, TOPY + 60), 'TENSION CRACK', YEL, 36)
        arrow(od, (1600, TOPY + 110), (1515, TOPY + 30), YEL, 6, 20)
        label(od, (120, GL - 200), 'TOE HEAVE', YEL, 40)
        arrow(od, (240, GL - 140), (330, GL - 40), YEL, 6, 20)
    if t > 4.2:
        label(od, (80, 260), 'THE WALL IS FINE.', LT, 44)
        label(od, (80, 320), 'THE HILL IS NOT.', OR, 44)
    header(od, 'GLOBAL STABILITY', 'The ground under and behind the wall rotates out')
    fs_badge(od, 'FS < 1.0', t > 5.4)
    return out

def render(fn, T, out, fps=30):
    if out.endswith('.png'):
        fn(T * 0.8, T).save(out); return
    p = sp.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
                  '-vf', f'fade=in:st=0:d=0.3,fade=out:st={T-0.3}:d=0.3', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', out], stdin=sp.PIPE)
    for i in range(int(T * fps)):
        p.stdin.write(fn(i / fps, T).tobytes())
    p.stdin.close(); p.wait()
if __name__ == '__main__':
    mode = sys.argv[1]
    fns = {'ot': (overturning, 7.0), 'sl': (sliding, 7.0), 'gl': (glob, 8.0)}
    for k in (fns if mode == 'all' else [mode]):
        f, T = fns[k]
        render(f, T, sys.argv[2] + f'/{k}' + ('.png' if len(sys.argv) > 3 else '.mp4'))
        print(k, flush=True)
