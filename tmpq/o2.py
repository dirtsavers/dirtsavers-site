import subprocess as sp, os, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.makedirs('/home/user/o2', exist_ok=True); os.chdir('/home/user/o2')
H = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JyXhtdhOmsYLu4t2EzwOAv0iyW/hf_20260929_'
GH = 'https://raw.githubusercontent.com/dirtsavers/dirtsavers-site/main/'
DL = {'k1.mp4': '181855_45106365-df5d-4714-a383-e137f146fdeb.mp4', 'k2.mp4': '181855_bc82deb4-ab42-46d4-930b-843a243835d4.mp4',
      'p1.png': '181719_ab81d03e-32db-44a1-9841-73f08b5f6794.png', 'p2.png': '181718_59f657b3-e230-4359-be04-35a90d1cb3cd.png',
      'lean.png': '184524_a31dc6d5-d184-4ff8-8b46-73167639fd10.png', 'vo.wav': '184522_dd4a417f-36c3-40c2-be39-e938b5a83bc5.wav'}
ps = [sp.Popen(['curl', '-sSf', '-o', f, H + u]) for f, u in DL.items() if not os.path.exists(f)]
if not os.path.exists('anim3.py'): ps.append(sp.Popen(['curl', '-sSf', '-o', 'anim3.py', GH + 'tmpq/anim3.py']))
for p in ps: p.wait()
print('dl ok', flush=True)
if not os.path.exists('a3_rotate.mp4'):
    sp.run(['python3', 'anim3.py', 'forces:23', 'loads:13', 'rotate:6.5'], check=True)
    sp.run(['python3', 'anim3.py', 'forces:23', '--png'], check=True)
print('anim ok', flush=True)
F = '/usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf'
def ft(s): return ImageFont.truetype(F, s)
O = (224, 120, 47); L = (237, 230, 218); M = (158, 164, 170); BG = (30, 35, 39); Y = (255, 214, 0)
def dur(f): return float(sp.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))
def cover(img):
    im = Image.open(img).convert('RGB'); r = max(1920 / im.width, 1080 / im.height)
    im = im.resize((int(im.width * r + .5), int(im.height * r + .5)))
    return im.crop(((im.width - 1920) // 2, (im.height - 1080) // 2, (im.width - 1920) // 2 + 1920, (im.height - 1080) // 2 + 1080))
def ctext(d, y, t, f, c, W=1920):
    w = d.textlength(t, font=f); d.text(((W - w) / 2, y), t, font=f, fill=c, stroke_width=3, stroke_fill=(15, 17, 20))
def cap(img, out, t1, t2):
    im = cover(img).convert('RGBA'); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.rectangle([0, 900, 1920, 1080], fill=(20, 22, 25, 205)); d.rectangle([0, 900, 1920, 906], fill=O + (255,))
    ctext(d, 925, t1, ft(50), L); ctext(d, 995, t2, ft(40), Y)
    Image.alpha_composite(im, ov).convert('RGB').save(out)
def checklist(bgimg, out_prefix, title, sub, items, panel=True, blur=False):
    base = cover(bgimg)
    if blur: base = Image.blend(base.filter(ImageFilter.GaussianBlur(14)), Image.new('RGB', base.size, (0, 0, 0)), 0.62)
    for k in range(len(items) + 1):
        im = base.convert('RGBA'); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
        x0 = 1040 if panel else 140
        if panel: d.rounded_rectangle([1000, 60, 1880, 1020], 20, fill=(20, 22, 25, 215), outline=O + (255,), width=4)
        d.text((x0, 100), title, font=ft(54 if panel else 64), fill=O)
        d.text((x0, 175 if panel else 185), sub, font=ft(32 if panel else 40), fill=L)
        for j in range(k):
            y = 290 + j * 120
            d.rounded_rectangle([x0, y, x0 + 60, y + 60], 10, fill=O); d.text((x0 + 30, y + 30), '✓', font=ft(44), fill=(20, 20, 20), anchor='mm')
            d.text((x0 + 90, y + 4), items[j], font=ft(44 if panel else 50), fill=L)
        if panel: d.text((1880, 1050), 'AI illustration', font=ft(20), fill=(220, 220, 220, 200), anchor='rs')
        Image.alpha_composite(im, ov).convert('RGB').save(f'{out_prefix}{k}.png')
def outro(head, out):
    im = Image.new('RGB', (1920, 1080), BG); d = ImageDraw.Draw(im)
    d.rectangle([140, 180, 152, 900], fill=O); d.text((200, 190), head, font=ft(44), fill=O)
    d.text((200, 280), 'We can help.', font=ft(120), fill=L); d.text((200, 560), 'DIRTSAVERS', font=ft(110), fill=O)
    d.text((200, 700), 'Retaining Wall & Hardscape Engineering', font=ft(40), fill=L)
    d.text((200, 770), 'dirtsavers.com   |   plans@dirtsavers.com   |   469.834.7446', font=ft(36), fill=L)
    d.text((200, 990), 'Scenes are AI-generated illustrations. Site conditions govern; consult a licensed engineer.', font=ft(24), fill=M)
    im.save(out)
enc = '-c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -r 30 -an'.split()
def run(a): sp.run(['ffmpeg', '-v', 'error', '-y'] + a[:-1] + enc + [a[-1]], check=True)
def still(img, t, out, kb=True):
    N = int(t * 30)
    vf = (f"scale=3840:-2,zoompan=z='min(zoom+0.0005,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={N}:s=1920x1080:fps=30," if kb else "scale=1920:1080,fps=30,") + f"format=yuv420p,fade=in:st=0:d=0.25,fade=out:st={t-0.25:.2f}:d=0.25"
    run(['-loop', '1', '-i', img, '-vf', vf, '-t', f'{t:.2f}', out])
def clip(src, ss, t, out):
    run(['-ss', str(ss), '-i', src, '-vf', f"scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,fade=in:st=0:d=0.25,fade=out:st={t-0.25:.2f}:d=0.25", '-t', f'{t:.2f}', out])
def seq(prefix, durs, out):
    T = sum(durs)
    open(prefix + '.txt', 'w').write(''.join(f"file {prefix}{k}.png\nduration {d}\n" for k, d in enumerate(durs)) + f"file {prefix}{len(durs)-1}.png\n")
    sp.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', prefix + '.txt', '-vf', f'fps=30,format=yuv420p,fade=in:st=0:d=0.25,fade=out:st={T-0.25:.2f}:d=0.25', '-t', f'{T:.2f}'] + enc + [out], check=True)
cap('p1.png', 'o_a.png', 'STONE GRAVITY WALL', 'Holds the dirt back with one thing: its own weight')
checklist('lean.png', 'w', 'WARNING SIGNS', 'Of an overturning wall', ['Leaning out of plumb', 'Gap between wall top and yard', 'Cracks + loose top stones'])
checklist('p2.png', 'x', 'THE FIX HAPPENS ON PAPER', 'Before the first stone is set.', ['A wider base', 'More batter (lean into the hill)', 'Proper embedment', 'Drainage that actually drains'], panel=False, blur=True)
outro('TALL STONE WALL ON YOUR JOB?', 'o_out.png')
segs = []
still('o_a.png', 7.0, 's00.mp4'); segs.append('s00.mp4')
clip('a3_forces.mp4', 0, 23.0, 's01.mp4'); segs.append('s01.mp4')
clip('a3_loads.mp4', 0, 13.0, 's02.mp4'); segs.append('s02.mp4')
clip('a3_rotate.mp4', 0, 6.5, 's03.mp4'); segs.append('s03.mp4')
clip('k1.mp4', 5.0, 5.0, 's04.mp4'); segs.append('s04.mp4')
clip('k2.mp4', 5.5, 4.0, 's05.mp4'); segs.append('s05.mp4')
seq('w', [2.9, 1.9, 3.0, 3.7], 's06.mp4'); segs.append('s06.mp4')
# checklist frame 0..3 for warning = 4 frames; ensure lengths match
seq('x', [2.4, 1.4, 1.2, 1.4, 3.4], 's07.mp4'); segs.append('s07.mp4')
still('o_out.png', 5.8, 's08.mp4', kb=False); segs.append('s08.mp4')
run(['-f', 'lavfi', '-i', 'color=c=0x1E2327:s=1920x1080:r=30', '-vf', f"drawtext=fontfile={F}:text='NO HOT TUBS WERE INJURED':fontsize=90:fontcolor=0xFFD600:x=(w-tw)/2:y=390:enable='lt(mod(t,0.8),0.55)',drawtext=fontfile={F}:text='during the making of this video.':fontsize=48:fontcolor=0xEDE6DA:x=(w-tw)/2:y=540,fade=in:st=0:d=0.3,format=yuv420p", '-t', '3.6', 's09.mp4']); segs.append('s09.mp4')
open('list.txt', 'w').write(''.join(f'file {s}\n' for s in segs))
sp.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'vid.mp4'], check=True)
TT = dur('vid.mp4'); print('video', TT, flush=True)
sp.run(['sox', '-n', '-r', '48000', '-c', '2', 'rum.wav', 'synth', f'{TT:.2f}', 'brownnoise', 'lowpass', '160', 'gain', '-32'], check=True)
fl = ['[1:a]aresample=48000,aformat=channel_layouts=stereo,adelay=500|500[vo]',
      '[2:a]atrim=5.0:10.0,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.2,afade=t=out:st=4.6:d=0.4,volume=0.35,adelay=49500|49500[c1]',
      '[3:a]atrim=5.5:9.5,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.2,afade=t=out:st=3.6:d=0.4,volume=0.45,adelay=54500|54500[c2]',
      f'[vo][c1][c2][0:a]amix=inputs=4:normalize=0:duration=longest,atrim=0:{TT:.2f},loudnorm=I=-16:TP=-1.5:LRA=11[out]']
sp.run(['ffmpeg', '-v', 'error', '-y', '-i', 'rum.wav', '-i', 'vo.wav', '-i', 'k1.mp4', '-i', 'k2.mp4', '-filter_complex', ';'.join(fl), '-map', '[out]', '-ar', '48000', 'mix.wav'], check=True)
sp.run(['ffmpeg', '-v', 'error', '-y', '-i', 'vid.mp4', '-i', 'mix.wav', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-maxrate', '3M', '-bufsize', '6M', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', 'overturn2.mp4'], check=True)
print('out', dur('overturn2.mp4'), flush=True)
ups = json.load(open('ups.json')) if os.path.exists('ups.json') else {}
for f, u in ups.items():
    ct = 'video/mp4' if f.endswith('.mp4') else 'image/jpeg'
    r = sp.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'PUT', '-H', 'Content-Type: ' + ct, '-H', 'If-None-Match: *', '--upload-file', f, u], capture_output=True, text=True)
    print('PUT', f, r.stdout, flush=True)
print('ALL DONE', flush=True)
