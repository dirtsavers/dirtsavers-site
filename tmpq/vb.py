import subprocess as sp, os, sys, json
from PIL import Image, ImageDraw, ImageFont
os.chdir('/home/user/nv')
H = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JyXhtdhOmsYLu4t2EzwOAv0iyW/hf_20260929_'
CL = {1: '191129_2ba32957-b355-4cba-becc-7c7855bf0582', 2: '191129_76eb3482-c39b-42bf-a490-af42f3ec6bb9', 3: '191129_baa3618e-3cc4-4f39-86f6-2051e5cf9015',
      4: '191129_7e755b02-8a63-4501-a1cc-d34897e5947f', 5: '191128_0a78a09b-a917-4b43-9be8-8c9411012275', 6: '191128_d948b84f-8aba-4f88-a78d-dd4d16713983',
      7: '191129_c75a0925-cb3f-478d-aeba-ae67667569bb', 8: '191129_213fbb2b-8395-4c19-ac92-61aaeba61241', 9: '191129_b749101e-fcae-4adf-aa34-faf899f0f672',
      10: '191129_7c2c2598-9902-4f47-84bf-56d8088fb435', 11: '191129_18d9cee5-7ee1-4052-a1f0-7e4dcfe4e7bd', 12: '191129_8ed88368-30c6-4790-801d-607a8ff37f19',
      13: '191211_b324d4d3-9ce9-45b5-a755-c16660e33b4b', 14: '191210_37999fda-0043-4073-a4f0-31ae73f02675', 15: '191213_50b07b8a-fdeb-4898-b7c2-e8fa71580d1f',
      16: '191210_314c2816-0567-4395-a34d-cc7728ad7523', 17: '191211_f3a0bfff-b10a-46f8-ab2c-beed170275c4', 18: '191210_adb089a3-5dba-4b87-bda0-2cf79b9034c7',
      19: '191210_d5980b33-f4e9-4a4b-a335-63c871e69d30', 20: '191211_ed395c6e-bc7f-410f-8137-8cffab337c20', 21: '191210_d97637e9-498f-4a04-8570-0d4171eeafa1',
      22: '191212_dcbc244f-2a89-49c7-a1ef-4c226edbbf98', 23: '191211_12190be8-0685-49fc-b3c4-5968bf0f525a'}
CL.update({int(k): v for k, v in json.load(open('cl_extra.json')).items()} if os.path.exists('cl_extra.json') else {})
F = '/usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf'
def ft(s): return ImageFont.truetype(F, s)
O = (224, 120, 47); L = (237, 230, 218); M = (158, 164, 170); BG = (30, 35, 39); Y = (255, 214, 0)
enc = '-c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -r 30 -an'.split()
def run(a): sp.run(['ffmpeg', '-v', 'error', '-y'] + a, check=True)
def dur(f): return float(sp.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))
def get(idx):
    f = f'c{idx}.mp4'
    if not os.path.exists(f) or os.path.getsize(f) < 10000: sp.run(['curl', '-sSf', '-o', f, H + CL[idx] + '.mp4'], check=True)
    return f
def ctext(d, y, t, f, c, W=1920):
    w = d.textlength(t, font=f); d.text(((W - w) / 2, y), t, font=f, fill=c, stroke_width=3, stroke_fill=(15, 17, 20))
def overlay_png(name, cap=None, title=None):
    im = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if title:
        w = max(d.textlength(title[0], font=ft(64)), d.textlength(title[1], font=ft(34)) if len(title) > 1 else 0)
        d.rounded_rectangle([50, 44, 50 + w + 60, 200 if len(title) > 1 else 150], 16, fill=(20, 22, 25, 220), outline=O + (255,), width=4)
        d.text((80, 58), title[0], font=ft(64), fill=O)
        if len(title) > 1: d.text((80, 140), title[1], font=ft(34), fill=L)
    if cap:
        d.rectangle([0, 912, 1920, 1080], fill=(20, 22, 25, 200)); d.rectangle([0, 912, 1920, 918], fill=O + (255,))
        ctext(d, 935, cap[0], ft(48), L)
        if len(cap) > 1: ctext(d, 1000, cap[1], ft(38), Y)
    im.save(name); return name
def seg_clip(src, ss, t, out, cap=None, title=None, speed=1.0):
    vf = f"setpts=PTS/{speed}," if speed != 1.0 else ""
    vf += "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30"
    fl = f"[0:v]{vf}[b]"
    ins = ['-ss', str(ss), '-i', src]
    if cap or title:
        ov = overlay_png(out + '.png', cap, title); ins += ['-loop', '1', '-i', ov]
        fl += f";[b][1:v]overlay=0:0:shortest=1[c];[c]fade=in:st=0:d=0.25,fade=out:st={t-0.25:.2f}:d=0.25[v]"
    else:
        fl += f";[b]fade=in:st=0:d=0.25,fade=out:st={t-0.25:.2f}:d=0.25[v]"
    run(ins + ['-filter_complex', fl, '-map', '[v]', '-t', f'{t:.2f}'] + enc + [out])
def seg_still(img, t, out, cap=None, title=None, kb=True):
    base = Image.open(img).convert('RGB'); r = max(1920 / base.width, 1080 / base.height)
    base = base.resize((int(base.width * r + .5), int(base.height * r + .5)))
    base = base.crop(((base.width - 1920) // 2, (base.height - 1080) // 2, (base.width - 1920) // 2 + 1920, (base.height - 1080) // 2 + 1080))
    if cap or title: base = Image.alpha_composite(base.convert('RGBA'), Image.open(overlay_png(out + '.png', cap, title))).convert('RGB')
    base.save(out + '.jpg', quality=92)
    N = int(t * 30)
    vf = (f"scale=3840:-2,zoompan=z='min(zoom+0.0005,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={N}:s=1920x1080:fps=30," if kb else "fps=30,") + f"format=yuv420p,fade=in:st=0:d=0.25,fade=out:st={t-0.25:.2f}:d=0.25"
    run(['-loop', '1', '-i', out + '.jpg', '-vf', vf, '-t', f'{t:.2f}'] + enc + [out])
def outro_png(head, out):
    im = Image.new('RGB', (1920, 1080), BG); d = ImageDraw.Draw(im)
    d.rectangle([140, 180, 152, 900], fill=O); d.text((200, 190), head, font=ft(44), fill=O)
    d.text((200, 280), 'We can help.', font=ft(120), fill=L); d.text((200, 560), 'DIRTSAVERS', font=ft(110), fill=O)
    d.text((200, 700), 'Retaining Wall & Hardscape Engineering', font=ft(40), fill=L)
    d.text((200, 770), 'dirtsavers.com   |   plans@dirtsavers.com   |   469.834.7446', font=ft(36), fill=L)
    d.text((200, 990), 'Scenes are AI-generated illustrations. Site conditions govern; consult a licensed engineer.', font=ft(24), fill=M)
    im.save(out); return out
def sfx():
    if not os.path.exists('crash.wav'):
        sp.run(['sox', '-n', '-r', '48000', '-c', '2', 'x1.wav', 'synth', '2.4', 'brownnoise', 'lowpass', '500', 'fade', 'q', '0.01', '2.4', '2.0', 'gain', '-4'], check=True)
        sp.run(['sox', '-n', '-r', '48000', '-c', '2', 'x2.wav', 'synth', '2.4', 'sine', '70-28', 'fade', 'q', '0.01', '2.4', '2.1', 'gain', '-5'], check=True)
        sp.run(['sox', '-m', 'x1.wav', 'x2.wav', 'crash.wav'], check=True)
        sp.run(['sox', '-n', '-r', '48000', '-c', '2', 'whoosh.wav', 'synth', '1.2', 'pinknoise', 'highpass', '400', 'lowpass', '3000', 'fade', 'q', '0.5', '1.2', '0.6', 'gain', '-14'], check=True)
def build(spec):
    name = spec['name']; segs = []; T = 0.0; marks = []
    for k, s in enumerate(spec['segs']):
        out = f'{name}_{k:02d}.mp4'
        t = s['d']
        if s['t'] == 'clip': seg_clip(get(s['c']), s.get('ss', 0), t, out, s.get('cap'), s.get('title'), s.get('speed', 1.0))
        elif s['t'] == 'still': seg_still(s['img'], t, out, s.get('cap'), s.get('title'), s.get('kb', True))
        elif s['t'] == 'outro': seg_still(outro_png(spec['outro'], f'{name}_out.png'), t, out, kb=False)
        segs.append(out); marks.append(T); T += t
    open(f'{name}_list.txt', 'w').write(''.join(f'file {x}\n' for x in segs))
    run(['-f', 'concat', '-safe', '0', '-i', f'{name}_list.txt', '-c', 'copy', f'{name}_vid.mp4'])
    TT = dur(f'{name}_vid.mp4'); sfx()
    ins = ['-i', f'{name}_vid.mp4']; fl = []; k = 1; al = []
    if spec.get('vo'):
        ins += ['-i', spec['vo']]; o = int(spec.get('vo_off', 0.5) * 1000)
        fl.append(f'[{k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={o}|{o},loudnorm=I=-16:TP=-2:LRA=7[vo]'); al.append('[vo]'); k += 1
    if spec.get('music'):
        ins += ['-i', spec['music']]; mv = spec.get('music_vol', 0.12)
        fl.append(f'[{k}:a]aresample=48000,aformat=channel_layouts=stereo,volume={mv},afade=t=in:d=1,afade=t=out:st={TT-2.5:.2f}:d=2.5[mu]'); al.append('[mu]'); k += 1
    else:
        ins += ['-f', 'lavfi', '-i', f'anoisesrc=color=brown:r=48000:a=0.5,lowpass=140,volume=0.035,aformat=channel_layouts=stereo,atrim=0:{TT:.2f}']
        fl.append(f'[{k}:a]anull[bed]'); al.append('[bed]'); k += 1
    for tm, kind, vol in spec.get('sfx', []):
        ins += ['-i', f'{kind}.wav']; fl.append(f'[{k}:a]volume={vol},adelay={int(tm*1000)}|{int(tm*1000)}[s{k}]'); al.append(f'[s{k}]'); k += 1
    fl.append(''.join(al) + f'amix=inputs={len(al)}:normalize=0:duration=longest,atrim=0:{TT:.2f},afade=t=out:st={TT-1.0:.2f}:d=1.0,alimiter=limit=0.9[out]')
    run(ins + ['-filter_complex', ';'.join(fl), '-map', '0:v', '-map', '[out]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-maxrate', '3M', '-bufsize', '6M', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-t', f'{TT:.2f}', f'{name}.mp4'])
    print(name, 'done', round(TT, 1), flush=True)
if __name__ == '__main__':
    specs = json.load(open(sys.argv[1]))
    only = sys.argv[2:]
    for s in specs:
        if only and s['name'] not in only: continue
        try: build(s)
        except Exception as e: print(s['name'], 'FAIL', e, flush=True)
    print('ALL DONE', flush=True)
