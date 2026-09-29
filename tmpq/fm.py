import subprocess as sp, os, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.chdir('/home/user/fm')
H='https://d8j0ntlcm91z4.cloudfront.net/user_3JyXhtdhOmsYLu4t2EzwOAv0iyW/hf_20260929_'
G='https://raw.githubusercontent.com/dirtsavers/dirtsavers-site/main/tmpq/'
UP=open('up.txt').read().strip()
dl={'k1.mp4':'171139_1ddf3998-90ab-489c-b2fe-ec8da551fde8.mp4','k2.mp4':'171138_635499c1-c5d7-4fe5-bea1-df4750e7a867.mp4',
'k3.mp4':'171138_053699f4-5ce8-485e-9a55-59f136251df6.mp4','k4.mp4':'171138_a2bd1f0a-91a4-4dec-ade6-d7a710182ea6.mp4',
'k5.mp4':'182702_25f655c5-e611-439e-848f-e1b8002ffa2e.mp4','k6.mp4':'171138_7bfcd04a-d176-4f2a-8ec8-780a394c940f.mp4',
'gk.mp4':'181855_6cefe1da-cdd1-4e74-83c2-1eb111d2b16a.mp4','g3.mp4':'171058_3263d550-257c-4efb-b4a2-72bce194e3e3.mp4',
'n0.wav':'171205_0b688dec-36ab-4577-b5d2-14d7de5ca66c.wav','n1.wav':'171205_fb6e7d6b-051c-4515-8b7b-be8ff5d074a0.wav',
'n2.wav':'171205_080ba864-d992-4a7f-94b3-47142ebbd6e9.wav','n3.wav':'171205_a1debcb1-afb3-4722-8250-8ac4a3b8d864.wav',
'n4.wav':'171206_e62b110b-4a85-4643-95fd-8af341428f05.wav','n5.wav':'171205_288233b7-0d5c-4a2b-9763-0ae85d7564f2.wav',
'n6.wav':'171205_44ef4a02-e081-4b56-a6fa-23b28c504b39.wav','n7.wav':'171205_b77b1ebe-3694-4da9-9238-960f29a8d9aa.wav',
'n8.wav':'171429_b4ef28a5-960b-44ef-b7f2-d1e3695310d4.wav'}
ps=[]
for f,u in dl.items():
    if not os.path.exists(f): ps.append(sp.Popen(['curl','-sSf','-o',f,H+u]))
for i in range(1,8):
    if not os.path.exists(f'c{i}.jpg'): ps.append(sp.Popen(['curl','-sSf','-o',f'c{i}.jpg',G+f'c{i}.jpg']))
for p in ps: p.wait()
print('dl ok',flush=True)
F='/usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf'
def ft(s): return ImageFont.truetype(F,s)
O=(224,120,47);L=(237,230,218);M=(158,164,170);BG=(30,35,39);Y=(255,214,0)
def dur(f): return float(sp.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
def ctext(d,y,t,f,c,W=1920):
    w=d.textlength(t,font=f); d.text(((W-w)/2,y),t,font=f,fill=c)
MODES=[('OVERTURNING','a.k.a. "The Slow Bow"','CAUSE: the soil pushes harder than the wall can push back','FIX: wider base, more batter, deeper embedment'),
('BULGING','a.k.a. "The Dad Bod"','CAUSE: water and pressure build up behind the face','FIX: drainage aggregate, reinforcement spacing, real compaction'),
('TOE SCOUR','a.k.a. "Pulling the Rug"','CAUSE: water washes out the ground at the base','FIX: embedment, toe armor, grading that sends water away'),
('DRAINAGE FAILURE','a.k.a. "The Bathtub"','CAUSE: trapped water adds load the wall never saw coming','FIX: clean stone, drain pipe, outlets that actually daylight'),
('SLIDING','a.k.a. "The Sled Push"','CAUSE: not enough friction at the base','FIX: wider base, shear key, better foundation soil'),
('TIMBER ROT','a.k.a. "The Nap"','CAUSE: old ties rot at the ground line','FIX: replace it with a designed wall system'),
('GLOBAL STABILITY','a.k.a. "The Whole Enchilada"','CAUSE: a slip surface below and behind the walls','FIX: a global stability analysis before you build')]
def title(i,n,a):
    im=Image.new('RGB',(1920,1080),BG);d=ImageDraw.Draw(im)
    ctext(d,300,f'FAILURE MODE No. {i}',ft(46),M)
    f=ft(150 if len(n)<12 else 118); ctext(d,390,n,f,O)
    ctext(d,610,a,ft(60),L)
    d.rectangle([860,720,1060,730],fill=O)
    im.save(f't{i}.png')
def banner(i,c,x):
    im=Image.open(f'c{i}.jpg').convert('RGB');im=im.resize((1920,int(im.height*1920/im.width)))
    if im.height<1080: 
        b=im.resize((1920,1080)).filter(ImageFilter.GaussianBlur(30));b.paste(im,(0,(1080-im.height)//2));im=b
    else: im=im.crop((0,(im.height-1080)//2,1920,(im.height-1080)//2+1080))
    ov=Image.new('RGBA',(1920,1080),(0,0,0,0));d=ImageDraw.Draw(ov)
    d.rectangle([0,880,1920,1080],fill=(20,22,25,215));d.rectangle([0,880,1920,888],fill=O+(255,))
    ctext(d,915,c,ft(44),L);ctext(d,985,x,ft(44),Y)
    im=Image.alpha_composite(im.convert('RGBA'),ov).convert('RGB');im.save(f'b{i}.png')
for i,(n,a,c,x) in enumerate(MODES,1): title(i,n,a);banner(i,c,x)
# intro and outro cards
sp.run(['ffmpeg','-v','error','-y','-ss','0.2','-i','k1.mp4','-frames:v','1','f0.png'])
im=Image.open('f0.png').convert('RGB').resize((1920,1080)).filter(ImageFilter.GaussianBlur(8))
im=Image.blend(im,Image.new('RGB',(1920,1080),(0,0,0)),0.6);d=ImageDraw.Draw(im)
ctext(d,330,'WHEN RETAINING WALLS',ft(110),L);ctext(d,470,'GO BAD',ft(190),O)
ctext(d,720,'a mostly serious documentary by DirtSavers',ft(46),L);im.save('intro.png')
im=Image.new('RGB',(1920,1080),BG);d=ImageDraw.Draw(im)
d.rectangle([140,180,152,900],fill=O)
d.text((200,190),'EVERY ONE OF THESE CAN BE DESIGNED OUT.',font=ft(44),fill=O)
d.text((200,280),'We can help.',font=ft(120),fill=L)
d.text((200,560),'DIRTSAVERS',font=ft(110),fill=O)
d.text((200,700),'Retaining Wall & Hardscape Engineering',font=ft(40),fill=L)
d.text((200,770),'dirtsavers.com   |   plans@dirtsavers.com   |   469.834.7446',font=ft(36),fill=L)
d.text((200,990),'Scenes are AI-generated illustrations. Site conditions govern; consult a licensed engineer.',font=ft(24),fill=M)
im.save('outro.png')
print('cards ok',flush=True)
enc='-c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -r 30 -an'.split()
def run(a): sp.run(['ffmpeg','-v','error','-y']+a+enc+[a[-1]] if False else ['ffmpeg','-v','error','-y']+a[:-1]+enc+[a[-1]],check=True)
def still(img,t,out,kb=False):
    N=int(t*30)
    vf=(f"scale=3840:-2,zoompan=z='min(zoom+0.0008,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={N}:s=1920x1080:fps=30," if kb else "fps=30,")+f"format=yuv420p,fade=in:st=0:d=0.25,fade=out:st={t-0.25:.2f}:d=0.25"
    run(['-loop','1','-i',img,'-vf',vf,'-t',str(t),out])
def clip(src,ss,t,out):
    run(['-ss',str(ss),'-i',src,'-vf',f"scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,fade=in:st=0:d=0.25,fade=out:st={t-0.25:.2f}:d=0.25",'-t',str(t),out])
segs=[];narr=[];booms=[];T=0.0
def add(f,t): 
    global T; segs.append(f); T+=t
still('intro.png',9.4,'v00.mp4',kb=True); narr.append(('n0.wav',0.5)); booms.append(0.0); add('v00.mp4',9.4)
for i in range(1,7):
    s0=T; booms.append(T); narr.append((f'n{i}.wav',T+0.5))
    still(f't{i}.png',2.0,f'v{i}a.mp4'); add(f'v{i}a.mp4',2.0)
    cd=min(dur(f'k{i}.mp4')-0.1,9.6); clip(f'k{i}.mp4',0,cd,f'v{i}b.mp4'); add(f'v{i}b.mp4',cd)
    still(f'b{i}.png',4.0,f'v{i}c.mp4',kb=True); add(f'v{i}c.mp4',4.0)
    print('seg',i,flush=True)
booms.append(T); narr.append(('n7.wav',T+0.5))
still('t7.png',2.0,'v7a.mp4'); add('v7a.mp4',2.0)
clip('g3.mp4',0.8,8.4,'v7b.mp4'); add('v7b.mp4',8.4)
clip('gk.mp4',3.5,4.6,'v7c.mp4'); add('v7c.mp4',4.6)
still('b7.png',4.0,'v7d.mp4',kb=True); add('v7d.mp4',4.0)
narr.append(('n8.wav',T+0.5)); still('outro.png',10.2,'v8.mp4'); add('v8.mp4',10.2)
F2=F
run(['-f','lavfi','-i','color=c=0x1E2327:s=1920x1080:r=30','-vf',f"drawtext=fontfile={F2}:text='NO POOLS WERE INJURED':fontsize=96:fontcolor=0xFFD600:x=(w-tw)/2:y=390:enable='lt(mod(t,0.8),0.55)',drawtext=fontfile={F2}:text='during the making of this video.':fontsize=48:fontcolor=0xEDE6DA:x=(w-tw)/2:y=540,fade=in:st=0:d=0.3,format=yuv420p",'-t','3.6','v9.mp4']); add('v9.mp4',3.6)
open('list.txt','w').write(''.join(f'file {s}\n' for s in segs))
sp.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i','list.txt','-c','copy','vid.mp4'],check=True)
TT=dur('vid.mp4'); print('video',TT,T,flush=True)
# audio: boom + rumble + narration
sp.run(['sox','-n','-r','48000','-c','2','boom.wav','synth','1.6','sine','90-28','fade','0','1.6','1.4','gain','-4'],check=True)
sp.run(['sox','-n','-r','48000','-c','2','rum.wav','synth',f'{TT:.2f}','brownnoise','lowpass','180','gain','-30'],check=True)
ins=['-i','rum.wav'];fl=[];k=1
for f,t in narr:
    ins+=['-i',f];fl.append(f'[{k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(t*1000)}|{int(t*1000)}[a{k}]');k+=1
for t in booms:
    ins+=['-i','boom.wav'];fl.append(f'[{k}:a]adelay={int(t*1000)}|{int(t*1000)},volume=0.9[a{k}]');k+=1
fl.append(''.join(f'[a{j}]' for j in range(1,k))+f'[0:a]amix=inputs={k}:normalize=0:duration=longest,atrim=0:{TT:.2f},loudnorm=I=-16:TP=-1.5:LRA=11[out]')
sp.run(['ffmpeg','-v','error','-y']+ins+['-filter_complex',';'.join(fl),'-map','[out]','-ar','48000','mix.wav'],check=True)
sp.run(['ffmpeg','-v','error','-y','-i','vid.mp4','-i','mix.wav','-c:v','libx264','-preset','medium','-crf','24','-maxrate','3M','-bufsize','6M','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart','out.mp4'],check=True)
print('out',dur('out.mp4'),os.path.getsize('out.mp4'),flush=True)
json.dump({'narr':narr,'booms':booms},open('tl.json','w'))
r=sp.run(['curl','-s','-o','/dev/null','-w','%{http_code}','-X','PUT','-H','Content-Type: video/mp4','-H','If-None-Match: *','--upload-file','out.mp4',UP],capture_output=True,text=True)
print('PUT',r.stdout,'DONE',flush=True)
