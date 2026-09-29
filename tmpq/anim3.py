import math, os, sys, subprocess as sp
from PIL import Image, ImageDraw, ImageFont
FONT = '/usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf'
if not os.path.exists(FONT): FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
_fc = {}
def ft(s):
    if s not in _fc: _fc[s] = ImageFont.truetype(FONT, s)
    return _fc[s]
W, H = 1920, 1080
SKY = (34, 40, 46); SOIL = (140, 104, 70); DEEP = (86, 64, 44); STONE = (205, 185, 150); STONE_D = (150, 132, 104)
OR = (224, 120, 47); LT = (237, 230, 218); RED = (235, 64, 52); YEL = (255, 214, 0); GRN = (90, 200, 110); BLUE = (70, 150, 225); GRASS = (96, 130, 60)
GL = 820; TOPY = 380; HW = GL - TOPY
WALL = [(700, GL), (760, TOPY), (880, TOPY), (960, GL)]
PIV = WALL[0]
def ease(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def rot(p, c, a):
    dx, dy = p[0] - c[0], p[1] - c[1]
    return (c[0] + dx * math.cos(a) - dy * math.sin(a), c[1] + dx * math.sin(a) + dy * math.cos(a))
def arrow(d, p0, p1, col, w=7, hs=22):
    d.line([p0, p1], fill=col, width=w)
    a = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    d.polygon([p1, (p1[0] - hs * math.cos(a - .45), p1[1] - hs * math.sin(a - .45)), (p1[0] - hs * math.cos(a + .45), p1[1] - hs * math.sin(a + .45))], fill=col)
def label(d, xy, t, col=LT, s=34, anchor='la'):
    d.text(xy, t, font=ft(s), fill=col, anchor=anchor, stroke_width=4, stroke_fill=(18, 20, 24))
def stones(d, poly):
    d.polygon(poly, fill=STONE, outline=STONE_D)
    a, b, c, e = poly
    for k in range(1, 8):
        t = k / 8
        L = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); R = (e[0] + (c[0] - e[0]) * t, e[1] + (c[1] - e[1]) * t)
        d.line([L, R], fill=STONE_D, width=3)
def centroid(poly):
    A = 0; cx = 0; cy = 0
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        cr = x0 * y1 - x1 * y0; A += cr; cx += (x0 + x1) * cr; cy += (y0 + y1) * cr
    A /= 2; return (cx / (6 * A), cy / (6 * A))
CG = centroid(WALL)
def header(d, t, sub):
    d.text((70, 50), t, font=ft(60), fill=OR); d.text((70, 125), sub, font=ft(34), fill=LT)
def gauge(d, fs):
    x0, y0 = 1370, 40; col = GRN if fs >= 1.5 else (YEL if fs >= 1.0 else RED)
    d.rounded_rectangle([x0, y0, x0 + 510, y0 + 160], 16, fill=(22, 25, 29), outline=col, width=4)
    d.text((x0 + 24, y0 + 16), 'FACTOR OF SAFETY', font=ft(28), fill=LT)
    d.text((x0 + 24, y0 + 56), f'{fs:.2f}', font=ft(80), fill=col)
    d.text((x0 + 250, y0 + 62), 'RESISTING', font=ft(24), fill=GRN); d.text((x0 + 250, y0 + 92), '÷ OVERTURNING', font=ft(24), fill=RED)
    d.text((x0 + 250, y0 + 124), 'below 1.0 = it goes', font=ft(20), fill=(170, 170, 170))
def scene(th=0.0, water=0.0, deck=0.0):
    im = Image.new('RGB', (W, H), SKY); d = ImageDraw.Draw(im)
    d.rectangle([0, GL, W, H], fill=DEEP)
    wp = [rot(p, PIV, -th) for p in WALL]
    bt = wp[2]; drop = bt[1] - TOPY
    soil = [bt, (bt[0] + 260, TOPY + drop * 0.35), (W, TOPY), (W, GL + 2), wp[3]]
    d.polygon(soil, fill=SOIL)
    if water > 0:
        wl = Image.new('RGBA', (W, H), (0, 0, 0, 0)); wd = ImageDraw.Draw(wl)
        wy = GL - (HW * 0.75) * water
        wd.polygon([(wp[3][0] - (wp[3][0] - wp[2][0]) * (GL - wy) / HW, wy), (W, wy), (W, GL), wp[3]], fill=(60, 140, 230, 90))
        wd.line([(wp[3][0] - (wp[3][0] - wp[2][0]) * (GL - wy) / HW, wy), (W, wy)], fill=(130, 195, 255, 255), width=4)
        im = Image.alpha_composite(im.convert('RGBA'), wl).convert('RGB'); d = ImageDraw.Draw(im)
    d.rectangle([0, GL, W, GL + 12], fill=GRASS)
    d.line([(bt[0] + 260, TOPY + drop * 0.35), (W, TOPY)], fill=GRASS, width=10)
    if deck > 0:
        c = tuple(int(SKY[i] + ((190, 190, 185)[i] - SKY[i]) * deck) for i in range(3))
        d.rectangle([1060, TOPY - 22, 1400, TOPY], fill=c); d.rectangle([1120, TOPY - 60, 1300, TOPY - 22], fill=tuple(int(SKY[i] + (BLUE[i] - SKY[i]) * deck) for i in range(3)))
    stones(d, wp)
    return im, d, wp
def pressure(d, wp, water=0.0, deck=0.0, alpha=1.0):
    # triangular soil pressure on back face, plus water and surcharge
    top, bot = wp[2], wp[3]
    for k in range(1, 9):
        s = k / 9
        p = (top[0] + (bot[0] - top[0]) * s, top[1] + (bot[1] - top[1]) * s)
        Ls = 170 * s; Lw = 190 * max(0.0, (s - (1 - 0.75 * water)) / (0.75 if water else 1)) * (1 if water else 0); Ld = 70 * deck
        tot = Ls + Lw + Ld
        if tot < 8: continue
        arrow(d, (p[0] + tot + 20, p[1]), (p[0] + 12, p[1]), OR, 5, 16)
        if Lw > 5: d.line([(p[0] + 20 + Ls + Ld, p[1] - 6), (p[0] + 20 + tot, p[1] - 6)], fill=(130, 195, 255), width=6)
        if Ld > 5: d.line([(p[0] + 20 + Ls, p[1] + 6), (p[0] + 20 + Ls + Ld, p[1] + 6)], fill=(200, 200, 190), width=6)
def curved(d, cx, cy, r, a0, a1, col, w=7):
    pts = [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / 30)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / 30))) for i in range(31)]
    d.line(pts, fill=col, width=w); arrow(d, pts[-4], pts[-1], col, w, 24)
def s_forces(t, T):
    im, d, wp = scene()
    u = t / T
    if u > 0.05:
        pressure(d, wp)
        label(d, (1160, 430), 'SOIL PUSH', OR, 44); label(d, (1160, 482), 'grows with depth, like water in a pool', LT, 28)
    if u > 0.27:
        py = GL - HW / 3; px = WALL[3][0] - (WALL[3][0] - WALL[2][0]) / 3
        arrow(d, (px + 300, py), (px + 14, py), RED, 14, 40); label(d, (px + 150, py - 64), 'P', RED, 44)
        d.line([(620, GL), (620, py)], fill=RED, width=4); d.line([(600, py), (640, py)], fill=RED, width=4); d.line([(600, GL), (640, GL)], fill=RED, width=4)
        label(d, (600, (GL + py) / 2 - 20), 'H/3', RED, 30, 'ra')
        curved(d, PIV[0], PIV[1], 150, -20, -110, RED)
        label(d, (120, 470), 'PUSH TRIES TO SPIN', RED, 32); label(d, (120, 510), 'THE WALL FORWARD', RED, 32)
    d.ellipse([PIV[0] - 16, PIV[1] - 16, PIV[0] + 16, PIV[1] + 16], fill=YEL)
    label(d, (PIV[0] - 30, PIV[1] + 36), 'TOE (PIVOT)', YEL, 32, 'ra')
    if u > 0.42:
        label(d, (120, 580), 'WEIGHT SPINS IT BACK', GRN, 32)
        arrow(d, CG, (CG[0], CG[1] + 170), GRN, 12, 34); label(d, (CG[0] + 20, CG[1] + 90), 'W', GRN, 44)
        d.line([(PIV[0], GL + 70), (CG[0], GL + 70)], fill=GRN, width=4); d.line([(PIV[0], GL + 50), (PIV[0], GL + 90)], fill=GRN, width=4); d.line([(CG[0], GL + 50), (CG[0], GL + 90)], fill=GRN, width=4)
        label(d, ((PIV[0] + CG[0]) / 2, GL + 100), 'lever arm', GRN, 28, 'ma')
        curved(d, PIV[0], PIV[1], 230, -110, -60, GRN)
    if u > 0.6:
        d.rounded_rectangle([1060, 760, 1880, 990], 14, fill=(22, 25, 29))
        label(d, (1090, 780), 'OVERTURNING = P × H/3', RED, 38)
        label(d, (1090, 840), 'RESISTING = W × lever arm', GRN, 38)
        label(d, (1090, 910), 'FS = RESISTING ÷ OVERTURNING', LT, 34)
    if u > 0.83: gauge(d, 2.10)
    header(d, 'OVERTURNING: THE MATH', 'Two moments about the toe. Biggest one wins.')
    return im
STEPS = [(0.0, 2.10, None), (0.12, 1.55, '+ WATER behind the wall (clogged drains)'), (0.6, 1.15, '+ POOL DECK / DRIVEWAY up top'), (0.85, 0.92, '= PUSH WINS')]
def s_loads(t, T):
    u = t / T
    water = ease((u - 0.12) / 0.25); deck = ease((u - 0.6) / 0.08)
    im, d, wp = scene(0, water, deck)
    pressure(d, wp, water, deck)
    if deck > 0.3:
        for x in (1100, 1180, 1260, 1340): arrow(d, (x, TOPY - 130), (x, TOPY - 64), (200, 200, 190), 5, 16)
        label(d, (1230, TOPY - 175), 'SURCHARGE', (220, 220, 210), 28, 'ma')
    fs = 2.10
    for k in range(1, len(STEPS)):
        u0 = STEPS[k][0]
        if u >= u0: fs = STEPS[k - 1][1] + (STEPS[k][1] - STEPS[k - 1][1]) * ease((u - u0) / 0.12)
    y = 230
    for u0, f, txt in STEPS[1:]:
        if u > u0: label(d, (70, y), txt, YEL if txt[0] == '+' else RED, 34); y += 54
    d.ellipse([PIV[0] - 16, PIV[1] - 16, PIV[0] + 16, PIV[1] + 16], fill=YEL)
    gauge(d, fs)
    header(d, 'WHAT MAKES IT WORSE', '')
    return im
def s_rotate(t, T):
    th = math.radians(16) * ease((t - 0.4) / (T * 0.7))
    im, d, wp = scene(th, 1.0, 1.0)
    d.ellipse([PIV[0] - 16, PIV[1] - 16, PIV[0] + 16, PIV[1] + 16], fill=YEL)
    for k in range(0, 30, 2):
        y0 = PIV[1] - (HW + 80) * k / 30; y1 = PIV[1] - (HW + 80) * (k + 1) / 30
        d.line([(PIV[0], y0), (PIV[0], y1)], fill=YEL, width=4)
    top = rot((PIV[0], TOPY - 80), PIV, -th); d.line([PIV, top], fill=RED, width=5)
    r = 320
    if th > 0.004: d.arc([PIV[0] - r, PIV[1] - r, PIV[0] + r, PIV[1] + r], start=-90 - math.degrees(th), end=-90, fill=RED, width=5)
    label(d, (PIV[0] - 70, PIV[1] - r - 70), f'{math.degrees(th):4.1f}° off plumb', RED, 46, 'ra')
    if th > math.radians(4):
        label(d, (wp[3][0] + 30, wp[3][1] - 40), 'HEEL LIFTS', YEL, 32)
        label(d, (wp[2][0] + 60, wp[2][1] + 30), 'GAP OPENS', YEL, 32)
    gauge(d, 0.92)
    header(d, 'PUSH WINS', 'The wall rotates about its toe')
    return im
def render(fn, T, out, fps=30):
    p = sp.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
                  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', out], stdin=sp.PIPE)
    for i in range(int(T * fps)): p.stdin.write(fn(i / fps, T).tobytes())
    p.stdin.close(); p.wait()
SC = {'forces': s_forces, 'loads': s_loads, 'rotate': s_rotate}
if __name__ == '__main__':
    png = '--png' in sys.argv
    for a in sys.argv[1:]:
        if a.startswith('--'): continue
        n, T = a.split(':'); T = float(T)
        if png: SC[n](T * 0.95, T).save(f'a3_{n}.png')
        else: render(SC[n], T, f'a3_{n}.mp4')
        print(n, flush=True)
