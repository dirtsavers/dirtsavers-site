import subprocess as sp, os, sys, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.makedirs('/home/user/g2', exist_ok=True); os.chdir('/home/user/g2')
H = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JyXhtdhOmsYLu4t2EzwOAv0iyW/hf_20260929_'
GH = 'https://raw.githubusercontent.com/dirtsavers/dirtsavers-site/main/'
DL = {'k5.mp4': '181855_6cefe1da-cdd1-4e74-83c2-1eb111d2b16a.mp4', 'k6.mp4': '181855_bed92ff5-3198-4d8d-8fba-be8b612c1f2d.mp4',
      'p6.png': '181719_a7cbc00e-a643-4c0c-a13c-b9349b0b9d03.png', 'p1.png': '181719_ab81d03e-32db-44a1-9841-73f08b5f6794.png',
      'vo.wav': '184209_92411d2e-26d3-4664-be82-968b23dd23d7.wav',
      'anat.png': '184217_ea0060fd-8348-4f72-8ec7-c5bc7cf01b18.png', 'crack.png': '184217_acee33ec-a2f8-4ed3-b3f2-1250018a9381.png',
      'bulge.png': '184216_8f12e840-0cf9-4e9f-8722-0bf3df94c951.png'}
ps = [sp.Popen(['curl', '-sSf', '-o', f, H + u]) for f, u in DL.items() if not os.path.exists(f)]
if not os.path.exists('section.jpg'): ps.append(sp.Popen(['curl', '-sSf', '-o', 'section.jpg', GH + 'img/gs-section.jpg']))
for s in ('anim2.py',):
    if not os.path.exists(s): ps.append(sp.Popen(['curl', '-sSf', '-o', s, GH + 'tmpq/' + s]))
for p in ps: p.wait()
print('dl ok', flush=True)
if not os.path.exists('a2_fail.mp4'):
    sp.run(['python3', 'anim2.py', 'trials:6.8', 'forces:8', 'loads:11', 'fail:5'], check=True)
    sp.run(['python3', 'anim2.py', 'trials:6.8', 'loads:11', 'fail:5', '--png'], check=True)
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
def tagbox(d, xy, text, col=Y, s=34, anchor='l'):
    f = ft(s); w = d.textlength(text, font=f); x, y = xy
    if anchor == 'r': x -= w + 28
    d.rounded_rectangle([x, y, x + w + 28, y + s + 22], 10, fill=(20, 22, 25, 225), outline=col + (255,), width=3)
    d.text((x + 14, y + 9), text, font=f, fill=col)
def marker(d, p, box, text, col=Y):
    d.ellipse([p[0] - 16, p[1] - 16, p[0] + 16, p[1] + 16], outline=col + (255,), width=5)
    d.line([p, (box[0] + 10, box[1] + 25)], fill=col + (255,), width=4)
    tagbox(d, box, text, col)
def annotate(img, out, title, sub, marks):
    im = cover(img).convert('RGBA'); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.rounded_rectangle([40, 36, 40 + max(d.textlength(title, font=ft(52)), d.textlength(sub, font=ft(30))) + 50, 170], 14, fill=(20, 22, 25, 225), outline=O + (255,), width=4)
    d.text((64, 50), title, font=ft(52), fill=O); d.text((64, 118), sub, font=ft(30), fill=L)
    for p, box, t in marks: marker(d, p, box, t)
    d.text((1880, 1050), 'AI illustration', font=ft(20), fill=(220, 220, 220, 200), anchor='rs')
    Image.alpha_composite(im, ov).convert('RGB').save(out, quality=90)
annotate('anat.png', 'anat_a.jpg', 'ANATOMY OF A GLOBAL FAILURE', 'Stone gravity wall, deep rotational slide',
         [((1513, 171), (1250, 230), 'SCARP / HEAD OF THE SLIDE'), ((732, 330), (420, 390), 'YARD + POOL DROP AND TILT BACK'),
          ((1342, 470), (1080, 540), 'WALL MOVED OUT IN ONE PIECE'), ((927, 740), (420, 830), 'TOE BULGE / HEAVE'), ((1684, 740), (1330, 900), 'SEEPAGE AT THE TOE')])
annotate('crack.png', 'crack_a.jpg', 'WARNING SIGN: CRACK BEHIND THE WALL', 'Runs parallel to the wall, often through decks and flatwork',
         [((1171, 627), (1250, 700), 'CRACK PARALLEL TO THE WALL'), ((1562, 407), (1180, 300), 'CRACK THROUGH THE POOL DECK'), ((805, 190), (330, 240), 'FENCE POSTS LEANING')])
annotate('bulge.png', 'bulge_a.jpg', 'WARNING SIGN: BULGE BEYOND THE TOE', 'Ground in front heaves up and stays wet', [])
# fixes card frames
bg = cover('p1.png').filter(ImageFilter.GaussianBlur(14)); bg = Image.blend(bg, Image.new('RGB', bg.size, (0, 0, 0)), 0.62)
FIX = ['Flatter slopes', 'More room between tiers', 'Drainage', 'Heavy loads kept back from the edge', 'Reinforced soil where needed']
for k in range(len(FIX) + 1):
    im = bg.copy(); d = ImageDraw.Draw(im)
    d.text((140, 150), 'THE FIXES ARE USUALLY SIMPLE', font=ft(64), fill=O)
    d.text((140, 235), '...if they happen on paper first.', font=ft(40), fill=L)
    for j in range(k):
        y = 360 + j * 110
        d.rounded_rectangle([140, y, 200, y + 60], 10, fill=O); d.text((170, y + 30), '✓', font=ft(44), fill=(20, 20, 20), anchor='mm')
        d.text((230, y + 4), FIX[j], font=ft(50), fill=L)
    im.save(f'fix{k}.png')
enc = '-c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -r 30 -an'.split()
def run(a): sp.run(['ffmpeg', '-v', 'error', '-y'] + a[:-1] + enc + [a[-1]], check=True)
def still(img, t, out, kb=True, fade=True):
    N = int(t * 30)
    vf = (f"scale=3840:-2,zoompan=z='min(zoom+0.0005,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={N}:s=1920x1080:fps=30," if kb else "scale=1920:1080,fps=30,") + "format=yuv420p"
    if fade: vf += f",fade=in:st=0:d=0.25,fade=out:st={t-0.25:.2f}:d=0.25"
    run(['-loop', '1', '-i', img, '-vf', vf, '-t', f'{t:.2f}', out])
def clip(src, ss, t, out, fin=True, fout=True):
    vf = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30"
    if fin: vf += ",fade=in:st=0:d=0.25"
    if fout: vf += f",fade=out:st={t-0.25:.2f}:d=0.25"
    run(['-ss', str(ss), '-i', src, '-vf', vf, '-t', f'{t:.2f}', out])
def cap(img, out, t1, t2):
    im = cover(img).convert('RGBA'); ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.rectangle([0, 900, 1920, 1080], fill=(20, 22, 25, 205)); d.rectangle([0, 900, 1920, 906], fill=O + (255,))
    ctext(d, 925, t1, ft(50), L); ctext(d, 995, t2, ft(40), Y)
    Image.alpha_composite(im, ov).convert('RGB').save(out)
def outro(head, out):
    im = Image.new('RGB', (1920, 1080), BG); d = ImageDraw.Draw(im)
    d.rectangle([140, 180, 152, 900], fill=O); d.text((200, 190), head, font=ft(44), fill=O)
    d.text((200, 280), 'We can help.', font=ft(120), fill=L); d.text((200, 560), 'DIRTSAVERS', font=ft(110), fill=O)
    d.text((200, 700), 'Retaining Wall & Hardscape Engineering', font=ft(40), fill=L)
    d.text((200, 770), 'dirtsavers.com   |   plans@dirtsavers.com   |   469.834.7446', font=ft(36), fill=L)
    d.text((200, 990), 'Scenes are AI-generated illustrations. Site conditions govern; consult a licensed engineer.', font=ft(24), fill=M)
    im.save(out)
cap('p6.png', 'g_a.png', 'THE WALL IS FINE.', 'The stones are fine. The math on the wall is fine.')
cap('section.jpg', 'g_b.png', 'THE PROBLEM IS THE HILL.', 'A global check looks at the whole slope, not just the wall.')
cap('a2_trials.png', 'g_c.png', 'CHECK THE GROUND AROUND THE WALL', 'Normal wall calcs stop at the wall.')
outro('NOT SURE IF YOUR JOB NEEDS ONE?', 'g_out.png')
segs = []
def add(f): segs.append(f)
still('g_a.png', 5.6, 's00.mp4'); add('s00.mp4')
still('g_b.png', 4.6, 's01.mp4'); add('s01.mp4')
clip('a2_trials.mp4', 0, 6.8, 's02.mp4'); add('s02.mp4')
clip('a2_forces.mp4', 0, 8.0, 's03.mp4'); add('s03.mp4')
clip('a2_loads.mp4', 0, 11.0, 's04.mp4'); add('s04.mp4')
clip('a2_fail.mp4', 0, 5.0, 's05.mp4'); add('s05.mp4')
clip('k5.mp4', 5.5, 3.1, 's06.mp4'); add('s06.mp4')
still('crack_a.jpg', 3.3, 's07.mp4'); add('s07.mp4')
still('bulge_a.jpg', 4.5, 's08.mp4'); add('s08.mp4')
still('anat_a.jpg', 4.1, 's09.mp4'); add('s09.mp4')
seq = [(0, 3.6), (1, 0.7), (2, 1.7), (3, 0.8), (4, 1.4), (5, 1.8)]
open('fix.txt', 'w').write(''.join(f"file fix{k}.png\nduration {d}\n" for k, d in seq) + "file fix5.png\n")
sp.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'fix.txt', '-vf', 'fps=30,format=yuv420p,fade=in:st=0:d=0.25,fade=out:st=9.75:d=0.25', '-t', '10'] + enc + ['s10.mp4'], check=True); add('s10.mp4')
clip('k6.mp4', 3.5, 2.3, 's11.mp4'); add('s11.mp4')
still('g_c.png', 2.8, 's12.mp4'); add('s12.mp4')
still('g_out.png', 5.0, 's13.mp4', kb=False); add('s13.mp4')
run(['-f', 'lavfi', '-i', 'color=c=0x1E2327:s=1920x1080:r=30', '-vf', f"drawtext=fontfile={F}:text='NO POOLS WERE INJURED':fontsize=90:fontcolor=0xFFD600:x=(w-tw)/2:y=390:enable='lt(mod(t,0.8),0.55)',drawtext=fontfile={F}:text='during the making of this video.':fontsize=48:fontcolor=0xEDE6DA:x=(w-tw)/2:y=540,fade=in:st=0:d=0.3,format=yuv420p", '-t', '3.6', 's14.mp4']); add('s14.mp4')
open('list.txt', 'w').write(''.join(f'file {s}\n' for s in segs))
sp.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'vid.mp4'], check=True)
TT = dur('vid.mp4'); print('video', TT, flush=True)
sp.run(['sox', '-n', '-r', '48000', '-c', '2', 'rum.wav', 'synth', f'{TT:.2f}', 'brownnoise', 'lowpass', '160', 'gain', '-32'], check=True)
# clip audio: k5 at 41.0 (ss 5.5, 3.1), k6 at 66.0 (ss 3.5, 2.3)
fl = ['[1:a]aresample=48000,aformat=channel_layouts=stereo,adelay=500|500[vo]',
      '[2:a]atrim=5.5:8.6,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.2,afade=t=out:st=2.7:d=0.4,volume=0.3,adelay=41000|41000[c1]',
      '[3:a]atrim=3.5:5.8,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.2,afade=t=out:st=1.9:d=0.4,volume=0.3,adelay=66000|66000[c2]',
      f'[vo][c1][c2][0:a]amix=inputs=4:normalize=0:duration=longest,atrim=0:{TT:.2f},loudnorm=I=-16:TP=-1.5:LRA=11[out]']
sp.run(['ffmpeg', '-v', 'error', '-y', '-i', 'rum.wav', '-i', 'vo.wav', '-i', 'k5.mp4', '-i', 'k6.mp4', '-filter_complex', ';'.join(fl), '-map', '[out]', '-ar', '48000', 'mix.wav'], check=True)
sp.run(['ffmpeg', '-v', 'error', '-y', '-i', 'vid.mp4', '-i', 'mix.wav', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-maxrate', '3M', '-bufsize', '6M', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', 'global2.mp4'], check=True)
print('out', dur('global2.mp4'), flush=True)
# website stills
Image.open('a2_loads.png').convert('RGB').save('web_fs.jpg', quality=88)
Image.open('anat_a.jpg').save('web_anat.jpg', quality=88)
a = Image.open('crack_a.jpg').resize((960, 540)); b = Image.open('bulge_a.jpg').resize((960, 540))
w = Image.new('RGB', (1920, 540)); w.paste(a, (0, 0)); w.paste(b, (960, 0)); w.save('web_warn.jpg', quality=88)
ups = json.load(open('ups.json')) if os.path.exists('ups.json') else {}
for f, u in ups.items():
    ct = 'video/mp4' if f.endswith('.mp4') else 'image/jpeg'
    r = sp.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'PUT', '-H', 'Content-Type: ' + ct, '-H', 'If-None-Match: *', '--upload-file', f, u], capture_output=True, text=True)
    print('PUT', f, r.stdout, flush=True)
print('ALL DONE', flush=True)
