"""Build bounded display assets, preserving every original score and recording cover."""
import base64
import io
import json,re
from pathlib import Path
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[1]
site=root/'workbuddy/site'; meta_path=root/'workbuddy/source/meta.json'
meta=json.loads(meta_path.read_text(encoding='utf8'))
covers=site/'tunnel/covers'; covers.mkdir(exist_ok=True)
previews=site/'score-preview'; previews.mkdir(exist_ok=True)
verified=json.loads(re.search(r'var VERIFIED_ALBUM_COVERS = (.*);',(site/'index.html').read_text(encoding='utf8')).group(1))
for song in meta['songs']:
    i=song['i']
    relative=song.get('coverPath') or verified.get(str(i)) or f'assets/covers/{i}.jpg'
    source=site/relative
    if not source.exists() and relative.startswith('legacy/'):source=root/relative.removeprefix('legacy/')
    with Image.open(source) as image:
        ImageOps.fit(image.convert('RGB'),(320,320),method=Image.Resampling.LANCZOS).save(covers/f'{i}.webp','WEBP',quality=80,method=4)
    with Image.open(site/f'assets/tabs/{i}.jpg') as image:
        song['previewWidth']=image.width
        target=previews/f'{i}.webp'
        if not target.exists():
            preview=image.convert('L');preview.thumbnail((2200,2200),Image.Resampling.LANCZOS)
            preview.save(target,'WEBP',quality=76,method=4)
# A static real-cover first frame appears before the deferred 3D module executes.
if not (site/'tunnel/first-frame.webp').exists():
    poster=Image.new('RGB',(1280,720),'#101119')
    for n,song in enumerate(meta['songs'][:15]):
        with Image.open(covers/f'{song["i"]}.webp') as image:
            poster.paste(ImageOps.fit(image,(256,240)),((n%5)*256,(n//5)*240))
    poster.save(site/'tunnel/first-frame.webp','WEBP',quality=72,method=4)
thumbnails={}
for song in meta['songs']:
    with Image.open(covers/f'{song["i"]}.webp') as image:
        image.thumbnail((80,80),Image.Resampling.LANCZOS)
        data=io.BytesIO()
        image.save(data,'WEBP',quality=58,method=4)
        thumbnails[song['i']]=base64.b64encode(data.getvalue()).decode('ascii')
(root/'workbuddy/source/cover-thumbnails.json').write_text(json.dumps(thumbnails,separators=(',',':'))+'\n',encoding='utf8')
meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=1)+'\n',encoding='utf8')
print('Verified',len(meta['songs']),'readable score previews and small covers')
print('Cover bytes:',sum(p.stat().st_size for p in covers.iterdir()))
print('Preview bytes:',sum(p.stat().st_size for p in previews.iterdir()))
