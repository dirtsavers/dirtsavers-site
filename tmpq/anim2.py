import math, os, sys, subprocess as sp
from PIL import Image, ImageDraw, ImageFont, ImageChops
FONT = '/usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf'
if not os.path.exists(FONT): FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
_fc = {}
def ft(s):
    if s not in _fc: _fc[s] = ImageFont.truetype(FONT, s)
    return _fc[s]
W, H = 1920, 1080
SKY = (34, 40, 46); FILL = (150, 112, 74); CLAY = (112, 104, 96); STIFF = (84, 66, 50)
STONE = (205, 185, 150); STONE_D = (150, 132, 104); OR = (224, 120, 47); LT = (237, 230, 218)
RED = (235, 64, 52); YEL = (255, 214, 0); GRN = (90, 200, 110); BLUE = (70, 150, 225); GRASS = (96, 130, 60)
TOPY = 380; TOEY = 820
WALL = [(700, TOEY), (760, TOPY), (880, TOPY), (960, TOEY)]
PROF = [(0, 935), (260, 935), (700, TOEY), (760, TOPY), (1920, TOPY)]  # ground surface incl wall face
C = (760, 230); B = (1470, TOPY); R = math.dist(C, B)
def ease(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def surf_y(x):
    for (x0, y0), (x1, y1) in zip(PROF, PROF[1:]):
        if x0 <= x <= x1: return y0 + (y1 - y0) * (x - x0) / (x1 - x0) if x1 != x0 else y0
    return PROF[-1][1]
def arc_y(x):
    d = R * R - (x - C[0]) ** 2
    return C[1] + math.sqrt(d) if d > 0 else None
# find A: intersection of circle with ground left of wall
xa = None
for x in range(700, 0, -1):
    ay = arc_y(x)
    if ay is not None and ay <= surf_y(x): xa = x; break
A = (xa, surf_y(xa))
aA = math.atan2(A[1] - C[1], A[0] - C[0]); aB = math.atan2(B[1] - C[1], B[0] - C[0])
def arcpts(a0, a1, cc=C, rr=R, n=140):
    return [(cc[0] + rr * math.cos(a0 + (a1 - a0) * i / n), cc[1] + rr * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
def arrow(d, p0, p1, col, w=6, hs=20):
    d.line([p0, p1], fill=col, width=w)
    a = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    d.polygon([p1, (p1[0] - hs * math.cos(a - .45), p1[1] - hs * math.sin(a - .45)), (p1[0] - hs * math.cos(a + .45), p1[1] - hs * math.sin(a + .45))], fill=col)
def dashed_poly(d, pts, col, w=4, every=2):
    for i in range(0, len(pts) - 1, every): d.line([pts[i], pts[i + 1]], fill=col, width=w)
def label(d, xy, t, col=LT, s=34, anchor='la'):
    d.text(xy, t, font=ft(s), fill=col, anchor=anchor, stroke_width=4, stroke_fill=(18, 20, 24))
def stones(d, poly):
    d.polygon(poly, fill=STONE, outline=STONE_D)
    a, b, c, e = poly
    for k in range(1, 8):
        t = k / 8
        L = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); Rr = (e[0] + (c[0] - e[0]) * t, e[1] + (c[1] - e[1]) * t)
        d.line([L, Rr], fill=STONE_D, width=3)
soil_mask = Image.new('L', (W, H), 0)
ImageDraw.Draw(soil_mask).polygon(PROF + [(W, H), (0, H)], fill=255)
wall_mask = Image.new('L', (W, H), 0); ImageDraw.Draw(wall_mask).polygon(WALL, fill=255)
circ_mask = Image.new('L', (W, H), 0); ImageDraw.Draw(circ_mask).ellipse([C[0] - R, C[1] - R, C[0] + R, C[1] + R], fill=255)
mass_mask = ImageChops.multiply(ImageChops.lighter(soil_mask, wall_mask), circ_mask)
def base_scene(water=0.0, pool=False, pool_a=1.0):
    im = Image.new('RGB', (W, H), SKY); d = ImageDraw.Draw(im)
    lay = Image.new('RGB', (W, H), FILL); ld = ImageDraw.Draw(lay)
    ld.rectangle([0, 870, W, 990], fill=CLAY); ld.rectangle([0, 990, W, H], fill=STIFF)
    ld.line([(0, 870), (W, 870)], fill=(95, 88, 80), width=2)
    if water > 0:
        wy = 1000 - 420 * water  # water level at right side
        wl = Image.new('RGBA', (W, H), (0, 0, 0, 0)); wd = ImageDraw.Draw(wl)
        wd.polygon([(0, 935), (700, 900 - 60 * water), (W, wy), (W, H), (0, H)], fill=(60, 140, 230, 95))
        wd.line([(0, 935), (700, 900 - 60 * water), (W, wy)], fill=(120, 190, 255, 255), width=4)
        lay = Image.alpha_composite(lay.convert('RGBA'), wl).convert('RGB')
    im.paste(lay, (0, 0), soil_mask)
    d.line(PROF[:3], fill=GRASS, width=10); d.line([PROF[3], PROF[4]], fill=GRASS, width=10)
    stones(d, WALL)
    # house
    d.rectangle([1600, TOPY - 120, 1880, TOPY], fill=(170, 150, 130)); d.polygon([(1580, TOPY - 120), (1740, TOPY - 170), (1900, TOPY - 120)], fill=(90, 70, 60))
    d.rectangle([1640, TOPY - 95, 1700, TOPY - 45], fill=(120, 160, 190)); d.rectangle([1780, TOPY - 80, 1830, TOPY], fill=(110, 80, 60))
    if pool:
        c = tuple(int(SKY[i] + (BLUE[i] - SKY[i]) * pool_a) for i in range(3))
        d.rectangle([1080, TOPY - 4, 1320, TOPY + 46], fill=c)
    label(d, (40, 900), 'FILL', (230, 210, 180), 26); label(d, (40, 925 - 20 + 30), '', LT, 10)
    label(d, (1700, 900), 'SOFT CLAY', (215, 215, 215), 28); label(d, (1700, 1020), 'STIFF SOIL', (200, 180, 160), 28)
    return im
def header(d, t, sub):
    d.text((70, 50), t, font=ft(60), fill=OR); d.text((70, 125), sub, font=ft(34), fill=LT)
def gauge(d, fs, show=True):
    if not show: return
    x0, y0 = 1370, 40
    col = GRN if fs >= 1.5 else (YEL if fs >= 1.0 else RED)
    d.rounded_rectangle([x0, y0, x0 + 510, y0 + 160], 16, fill=(22, 25, 29), outline=col, width=4)
    d.text((x0 + 24, y0 + 16), 'FACTOR OF SAFETY', font=ft(28), fill=LT)
    d.text((x0 + 24, y0 + 56), f'{fs:.2f}', font=ft(80), fill=col)
    d.text((x0 + 250, y0 + 70), 'HOLD ÷ PUSH', font=ft(28), fill=(170, 170, 170))
    d.text((x0 + 250, y0 + 110), 'below 1.0 = it goes', font=ft(22), fill=(170, 170, 170))
def slices(d, n=9, forces=True, prog=1.0):
    xs = [A[0] + (B[0] - A[0]) * i / n for i in range(n + 1)]
    for x in xs[1:-1]:
        ay = arc_y(x); sy = surf_y(x)
        if ay: d.line([(x, sy), (x, ay)], fill=(235, 225, 205), width=3)
    if not forces: return
    for i in range(n):
        if i / n > prog: break
        xm = (xs[i] + xs[i + 1]) / 2; ay = arc_y(xm); sy = surf_y(xm)
        if not ay: continue
        h = ay - sy; cy = sy + h * 0.45
        arrow(d, (xm, cy - h * 0.18), (xm, cy - h * 0.18 + 30 + h * 0.32), OR, 6, 18)
        dx, dy = xm - C[0], ay - C[1]; L = math.hypot(dx, dy)
        vx, vy = (dy / L, -dx / L)  # uphill (resisting) tangent
        p0 = (xm - vx * 10, ay - vy * 10 - 4)
        arrow(d, p0, (p0[0] + vx * 70, p0[1] + vy * 70), GRN, 6, 18)
def s_trials(t, T):
    im = base_scene(); d = ImageDraw.Draw(im)
    trials = [((700, 320), 560, 2.1), ((820, 150), 800, 1.8), ((640, 300), 640, 1.9), ((900, 250), 700, 2.3), ((700, 200), 760, 1.7), ((820, 290), 600, 2.0)]
    shown = int(min(len(trials), t / (T * 0.62 / len(trials))))
    for k in range(shown):
        cc, rr, fsv = trials[k]
        pts = [p for p in arcpts(0, math.pi, cc, rr) if p[1] <= surf_y(p[0]) + 2 or True]
        pts = [p for p in pts if p[1] >= surf_y(max(0, min(W - 1, p[0]))) - 1]
        col = (150, 150, 150) if k < shown - 1 else (210, 210, 210)
        dashed_poly(d, pts, col, 3)
        if pts and k == shown - 1 and t < T * 0.66:
            lp = max(pts, key=lambda p: p[1]); label(d, (lp[0], lp[1] + 8), f'trial {k+1}:  FS {fsv:.1f}', LT, 30, 'ma')
    if t > T * 0.66:
        pr = ease((t - T * 0.66) / (T * 0.2))
        pts = arcpts(aB, aB + (aA - aB) * pr)
        dashed_poly(d, pts, RED, 7)
        if pr > .95: label(d, (C[0] + 60, C[1] + R + 14), 'CRITICAL SLIP SURFACE (lowest FS)', RED, 32, 'ma')
    header(d, 'GLOBAL STABILITY CHECK', 'Try hundreds of slip surfaces. Find the weakest one.')
    return im
def s_forces(t, T):
    im = base_scene(); d = ImageDraw.Draw(im)
    dashed_poly(d, arcpts(aB, aA), RED, 7)
    slices(d, prog=ease(t / (T * 0.6)))
    if t > T * 0.25:
        label(d, (1180, 470), 'PUSH', OR, 44); label(d, (1180, 520), 'weight of the soil + anything on top', LT, 28)
    if t > T * 0.45:
        label(d, (1180, 610), 'HOLD', GRN, 44); label(d, (1180, 660), 'strength of the soil along the surface', LT, 28)
    gauge(d, 1.60, t > T * 0.6)
    header(d, 'PUSH vs. HOLD', 'Slice the block. Add up what drives it and what resists it.')
    return im
STEPS = [(0.00, 1.60, None), (0.18, 1.35, '+ WATER: clay weakens, soil gets heavier'), (0.48, 1.12, '+ POOL near the top'), (0.72, 0.92, '+ SLOPE BELOW / TIER TOO CLOSE')]
def s_loads(t, T):
    u = t / T
    water = ease((u - 0.18) / 0.25)
    pool = u > 0.48; pa = ease((u - 0.48) / 0.08)
    im = base_scene(water, pool, pa); d = ImageDraw.Draw(im)
    dashed_poly(d, arcpts(aB, aA), RED, 7)
    slices(d, forces=True)
    if pool:
        for x in (1110, 1170, 1230, 1290): arrow(d, (x, TOPY - 90), (x, TOPY - 10), (120, 190, 255), 5, 16)
        label(d, (1200, TOPY - 130), 'POOL', (160, 210, 255), 30, 'ma')
    if u > 0.72:
        # emphasize slope below
        d.line(PROF[:3], fill=YEL, width=10)
    fs = 1.60
    for k in range(1, len(STEPS)):
        u0 = STEPS[k][0]; f0 = STEPS[k - 1][1]; f1 = STEPS[k][1]
        if u >= u0: fs = f0 + (f1 - f0) * ease((u - u0) / 0.12)
    y = 230
    for u0, f, txt in STEPS[1:]:
        if u > u0: label(d, (70, y), txt, YEL, 34); y += 52
    gauge(d, fs)
    header(d, 'WHAT DRIVES THE NUMBER DOWN', '')
    return im
def s_fail(t, T):
    full = base_scene(1.0, True, 1.0)
    d0 = ImageDraw.Draw(full); slices(d0, forces=False)
    for x in (1110, 1170, 1230, 1290): arrow(d0, (x, TOPY - 90), (x, TOPY - 10), (120, 190, 255), 5, 16)
    phi = 8.5 * ease((t - 0.6) / (T * 0.55))
    out = full.copy()
    if phi > 0.01:
        void = Image.new('RGB', (W, H), SKY)
        out.paste(void, (0, 0), mass_mask)
        moved = full.rotate(-phi, center=C, resample=Image.BICUBIC); mm = mass_mask.rotate(-phi, center=C, resample=Image.BICUBIC)
        out.paste(moved, (0, 0), mm)
    d = ImageDraw.Draw(out)
    dashed_poly(d, arcpts(aB, aA), RED, 6)
    if phi > 0.3:
        for i in range(4): dashed_poly(d, [WALL[i], WALL[(i+1)%4]], (200, 200, 200), 3, 1) if False else None
        gp = [WALL[0], WALL[1], WALL[2], WALL[3], WALL[0]]
        for p, q in zip(gp, gp[1:]):
            n = int(math.dist(p, q) // 16)
            for k in range(0, n, 2): d.line([(p[0]+(q[0]-p[0])*k/n, p[1]+(q[1]-p[1])*k/n), (p[0]+(q[0]-p[0])*(k+1)/n, p[1]+(q[1]-p[1])*(k+1)/n)], fill=(215, 215, 215), width=3)
        label(d, (WALL[3][0] + 18, TOEY - 44), 'original position', (210, 210, 210), 24)
        ra = arcpts(1.25, 1.85, C, R + 60, 30)
        d.line(ra, fill=YEL, width=6); arrow(d, ra[-3], ra[-1], YEL, 6, 22)
    if t > T * 0.45:
        label(d, (1500, TOPY + 40), 'SCARP / TENSION CRACK', YEL, 30); arrow(d, (1560, TOPY + 80), (1480, TOPY + 20), YEL, 5, 16)
        label(d, (1000, 250), 'HEAD DROPS AND TILTS BACK', YEL, 30)
        label(d, (60, 760), 'TOE HEAVE + SEEPAGE', YEL, 30); arrow(d, (230, 800), (A[0] + 10, A[1] - 30), YEL, 5, 16)
    if t > T * 0.62:
        label(d, (70, 260), 'WALL RIDES ALONG IN ONE PIECE', LT, 30); label(d, (70, 300), '(moves out and drops, tilts back)', LT, 26)
    gauge(d, 0.92)
    header(d, 'GLOBAL FAILURE', 'The wall did not break. The ground under it moved.')
    return out
def render(fn, T, out, fps=30):
    p = sp.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
                  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', out], stdin=sp.PIPE)
    for i in range(int(T * fps)): p.stdin.write(fn(i / fps, T).tobytes())
    p.stdin.close(); p.wait()
SC = {'trials': s_trials, 'forces': s_forces, 'loads': s_loads, 'fail': s_fail}
if __name__ == '__main__':
    # usage: anim2.py name:dur ... [--png]
    png = '--png' in sys.argv
    for a in sys.argv[1:]:
        if a.startswith('--'): continue
        n, T = a.split(':'); T = float(T)
        if png: SC[n](T * 0.9, T).save(f'a2_{n}.png')
        else: render(SC[n], T, f'a2_{n}.mp4')
        print(n, flush=True)
