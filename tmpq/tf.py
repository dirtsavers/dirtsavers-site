import subprocess as sp, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.chdir('/home/user/tf')
H = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JyXhtdhOmsYLu4t2EzwOAv0iyW/hf_20260929_'
G = 'https://raw.githubusercontent.com/dirtsavers/dirtsavers-site/main/'
DL = {'k1.mp4': '181855_45106365-df5d-4714-a383-e137f146fdeb.mp4', 'k2.mp4': '181855_bc82deb4-ab42-46d4-930b-843a243835d4.mp4',
      'k5.mp4': '181855_6cefe1da-cdd1-4e74-83c2-1eb111d2b16a.mp4', 'k6.mp4': '181855_bed92ff5-3198-4d8d-8fba-be8b612c1f2d.mp4',
      'g3.mp4': '171058_3263d550-257c-4efb-b4a2-72bce194e3e3.mp4',
      'p1.png': '181719_ab81d03e-32db-44a1-9841-73f08b5f6794.png', 'p2.png': '181718_59f657b3-e230-4359-be04-35a90d1cb3cd.png',
      'p4.png': '181719_5f4cc556-b6ff-42a7-b412-3c3bcbda52b8.png', 'p6.png': '181719_a7cbc00e-a643-4c0c-a13c-b9349b0b9d03.png',
      'v1.wav': '182441_b8472731-cea5-4f29-a88b-15b8fc51452b.wav', 'v2.wav': '181739_06ceda3a-669f-4066-acdc-81b66f627810.wav',
      'v3.wav': '181739_f324849f-6253-4b79-9e0f-60b6479386df.wav'}
EXTRA = [l.split() for l in open('extra.txt').read().split('\n') if l.strip()] if os.path.exists('extra.txt') else []
for a, b in EXTRA: DL[a] = b
ps = []
for f, u in DL.items():
    if not os.path.exists(f) or os.path.getsize(f) < 1000: ps.append(sp.Popen(['curl', '-sSf', '-o', f, H + u]))
for f in ('c1.jpg', 'c5.jpg'):
    if not os.path.exists(f): ps.append(sp.Popen(['curl', '-sSf', '-o', f, G + 'tmpq/' + f]))
if not all(os.path.exists(x) for x in ('ot.mp4', 'sl.mp4', 'gl.mp4')): sp.run(['python3', 'anim.py', 'all', '.'], check=True)
for p in ps: p.wait()
print('dl ok', flush=True)
F = '/usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf'
def ft(s): return ImageFont.truetype(F, s)
O = (224, 120, 47); L = (237, 230, 218); M = (158, 164, 170); BG = (30, 35, 39); Y = (255, 214, 0)
def dur(f): return float(sp.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))
def ctext(d, y, t, f, c, W=1920):
    w = d.textlength(t, font=f); d.text(((W - w) / 2, y), t, font=f, fill=c, stroke_width=3, stroke_fill=(15, 17, 20))
enc = '-c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -r 30 -an'.split()
def run(a): sp.run(['ffmpeg', '-v', 'error', '-y'] + a[:-1] + enc + [a[-1]], check=True)
def fit(img, out, cap=None, cap2=None, banner=None):
    im = Image.open(img).convert('RGB')
    r = max(1920 / im.width, 1080 / im.height); im = im.resize((int(im.width * r + .5), int(im.height * r + .5)))
    im = im.crop(((im.width - 1920) // 2, (im.height - 1080) // 2, (im.width - 1920) // 2 + 1920, (im.height - 1080) // 2 + 1080))
    ov = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    if cap:
        d.rectangle([0, 900, 1920, 1080], fill=(20, 22, 25, 200)); d.rectangle([0, 900, 1920, 906], fill=O + (255,))
        ctext(d, 925, cap, ft(50), L)
        if cap2: ctext(d, 995, cap2, ft(40), Y)
    if banner:
        d.rectangle([0, 860, 1920, 1080], fill=(20, 22, 25, 215)); d.rectangle([0, 860, 1920, 868], fill=O + (255,))
        ctext(d, 885, banner[0], ft(46), O); ctext(d, 955, banner[1], ft(40), L); ctext(d, 1012, banner[2], ft(40), L)
    Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB').save(out)
def still(img, t, out, kb=True):
    N = int(t * 30)
    vf = (f"scale=3840:-2,zoompan=z='min(zoom+0.0006,1.10)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={N}:s=1920x1080:fps=30," if kb else "fps=30,") + f"format=yuv420p,fade=in:st=0:d=0.25,fade=out:st={t-0.25:.2f}:d=0.25"
    run(['-loop', '1', '-i', img, '-vf', vf, '-t', f'{t:.2f}', out])
def clip(src, ss, t, out, padend=0, padstart=0, cap=None):
    vf = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30"
    if padstart or padend: vf += f",tpad=start_mode=clone:start_duration={padstart}:stop_mode=clone:stop_duration={padend}"
    if cap: vf += f",drawbox=x=0:y=ih-150:w=iw:h=150:color=black@0.55:t=fill,drawtext=fontfile={F}:text='{cap}':fontsize=52:fontcolor=0xEDE6DA:x=(w-tw)/2:y=h-108"
    T = t + padend + padstart
    vf += f",fade=in:st=0:d=0.25,fade=out:st={T-0.25:.2f}:d=0.25"
    run(['-ss', str(ss), '-i', src, '-vf', vf, '-t', f'{T:.2f}', out])
def outro(head, out):
    im = Image.new('RGB', (1920, 1080), BG); d = ImageDraw.Draw(im)
    d.rectangle([140, 180, 152, 900], fill=O)
    d.text((200, 190), head, font=ft(44), fill=O)
    d.text((200, 280), 'We can help.', font=ft(120), fill=L)
    d.text((200, 560), 'DIRTSAVERS', font=ft(110), fill=O)
    d.text((200, 700), 'Retaining Wall & Hardscape Engineering', font=ft(40), fill=L)
    d.text((200, 770), 'dirtsavers.com   |   plans@dirtsavers.com   |   469.834.7446', font=ft(36), fill=L)
    d.text((200, 990), 'Scenes are AI-generated illustrations. Site conditions govern; consult a licensed engineer.', font=ft(24), fill=M)
    im.save(out)
def tag(l1, out, t=3.6):
    run(['-f', 'lavfi', '-i', 'color=c=0x1E2327:s=1920x1080:r=30', '-vf', f"drawtext=fontfile={F}:text='{l1}':fontsize=90:fontcolor=0xFFD600:x=(w-tw)/2:y=390:enable='lt(mod(t,0.8),0.55)',drawtext=fontfile={F}:text='during the making of this video.':fontsize=48:fontcolor=0xEDE6DA:x=(w-tw)/2:y=540,fade=in:st=0:d=0.3,format=yuv420p", '-t', str(t), out])
def build(name, plan, vo, up, clipaud):
    segs = []; T = 0.0; auds = []
    for kind, args in plan:
        f = f'{name}_{len(segs):02d}.mp4'
        if kind == 'still': still(args[0], args[1], f, args[2] if len(args) > 2 else True); t = args[1]
        elif kind == 'clip':
            src, ss, t0 = args[:3]; pe = args[3] if len(args) > 3 else 0; pst = args[4] if len(args) > 4 else 0; cap = args[5] if len(args) > 5 else None
            clip(src, ss, t0, f, pe, pst, cap); t = t0 + pe + pst
            if clipaud and src.startswith(('k', 'g', 's')) and src.endswith('.mp4') and not src.startswith('sl') :
                auds.append((src, ss, t0, T + pst))
        elif kind == 'tag': tag(args[0], f); t = 3.6
        segs.append(f); T += t
    open(f'{name}_list.txt', 'w').write(''.join(f'file {s}\n' for s in segs))
    sp.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{name}_list.txt', '-c', 'copy', f'{name}_vid.mp4'], check=True)
    TT = dur(f'{name}_vid.mp4')
    sp.run(['sox', '-n', '-r', '48000', '-c', '2', 'rum.wav', 'synth', f'{TT:.2f}', 'brownnoise', 'lowpass', '160', 'gain', '-32'], check=True)
    ins = ['-i', 'rum.wav', '-i', vo]; fl = ['[1:a]aresample=48000,aformat=channel_layouts=stereo,adelay=500|500,volume=1.0[vo]']; lab = ['[vo]']; k = 2
    for src, ss, t0, off in auds:
        has = b'audio' in sp.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', src], capture_output=True).stdout
        if not has: continue
        ins += ['-i', src]
        fl.append(f'[{k}:a]atrim={ss}:{ss+t0},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.2,afade=t=out:st={max(0,t0-0.4)}:d=0.4,volume=0.28,adelay={int(off*1000)}|{int(off*1000)}[c{k}]')
        lab.append(f'[c{k}]'); k += 1
    fl.append(''.join(lab) + f'[0:a]amix=inputs={len(lab)+1}:normalize=0:duration=longest,atrim=0:{TT:.2f},loudnorm=I=-16:TP=-1.5:LRA=11[out]')
    sp.run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fl), '-map', '[out]', '-ar', '48000', f'{name}_mix.wav'], check=True)
    sp.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{name}_vid.mp4', '-i', f'{name}_mix.wav', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-maxrate', '3M', '-bufsize', '6M', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', f'{name}.mp4'], check=True)
    print(name, 'out', dur(f'{name}.mp4'), flush=True)
    if up:
        r = sp.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'PUT', '-H', 'Content-Type: video/mp4', '-H', 'If-None-Match: *', '--upload-file', f'{name}.mp4', open(up).read().strip()], capture_output=True, text=True)
        print(name, 'PUT', r.stdout, flush=True)

which = sys.argv[1:] or ['ot', 'sl', 'gl']
up = '--noup' not in sys.argv
if 'ot' in which:
    fit('p1.png', 'ot_a.png', 'STONE GRAVITY WALL', 'Holds the dirt back with its own weight')
    fit('c1.jpg', 'ot_fix.png', banner=('THE FIX HAPPENS ON PAPER', 'Wider base  |  More batter  |  Proper embedment', 'Drainage that actually drains'))
    outro('TALL STONE WALL ON YOUR JOB?', 'ot_out.png')
    build('ot', [('still', ('ot_a.png', 7.0)), ('clip', ('ot.mp4', 0, 7.0, 0, 7.5)), ('clip', ('k1.mp4', 5.0, 5.0)),
                 ('clip', ('k2.mp4', 5.5, 4.5)), ('still', ('ot_fix.png', 4.2)), ('still', ('ot_out.png', 6.3, False)),
                 ('tag', ('NO HOT TUBS WERE INJURED',))], 'v1.wav', 'up_ot.txt' if up else None, True)
if 'sl' in which:
    fit('p4.png', 'sl_a.png', 'PERFECTLY PLUMB.', 'Not leaning. Not cracked. Just relocating.')
    fit('c5.jpg', 'sl_fix.png', banner=('THE FIX', 'Wider base  |  Deeper embedment', 'Shear key  |  A good foundation'))
    outro('PLANNING A WALL?', 'sl_out.png')
    build('sl', [('still', ('sl_a.png', 2.4)), ('clip', ('k4b.mp4', 0, 10.0)), ('clip', ('sl.mp4', 0, 7.0, 0, 3.5)),
                 ('clip', ('k3b.mp4', 0, 10.0, 2.5)), ('still', ('sl_fix.png', 9.3)), ('still', ('sl_out.png', 5.0, False)),
                 ('tag', ('NO MAILBOXES WERE INJURED',))], 'v2.wav', 'up_sl.txt' if up else None, True)
if 'gl' in which:
    fit('p6.png', 'gl_a.png', 'THE WALL IS FINE.', 'The stones are fine. The math on the wall is fine.')
    outro('NOT SURE IF YOUR JOB NEEDS ONE?', 'gl_out.png')
    build('gl', [('still', ('gl_a.png', 5.9)), ('clip', ('gl.mp4', 0, 8.0, 1.0)), ('clip', ('k5.mp4', 3.5, 6.5)),
                 ('clip', ('g3.mp4', 2.0, 5.5, 0, 0, 'TIERED WALLS')), ('clip', ('k6.mp4', 4.5, 4.5)), ('still', ('gl_out.png', 5.0, False)),
                 ('tag', ('NO POOLS WERE INJURED',))], 'v3.wav', 'up_gl.txt' if up else None, True)
print('ALL DONE', flush=True)
