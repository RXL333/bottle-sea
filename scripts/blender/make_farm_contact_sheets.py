"""Assemble unaltered Blender renders for visual review; run with system Python."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE=Path(__file__).resolve().parents[2]
manifest=json.loads((BASE/'public/models/farm/manifest.json').read_text(encoding='utf-8'))
folder=BASE/'assets/blender/farm'
font_path='C:/Windows/Fonts/msyh.ttc'
font=ImageFont.truetype(font_path,23)
small=ImageFont.truetype(font_path,17)
title=ImageFont.truetype(font_path,40)
for rear in [False,True]:
    tile=360;head=110;footer=66
    image=Image.new('RGB',(tile*5,head+(tile+footer)*4+40),'#142e3c')
    draw=ImageDraw.Draw(image)
    draw.text((30,19),'农场岛 · 20 类模型'+(' · 背面检查' if rear else ' · 完整资产预览'),font=title,fill='#fff1d4')
    draw.text((32,74),'BLENDER  /  LOW POLY  /  GLB     ·     各卡片独立取景，非同比例展示',font=small,fill='#b9cbd2')
    for idx,asset in enumerate(manifest['assets']):
        x=(idx%5)*tile;y=head+(idx//5)*(tile+footer)
        source=folder/'previews'/(asset['id']+('_rear' if rear else '')+'.png')
        im=Image.open(source).convert('RGB').resize((tile-8,tile-8),Image.Resampling.LANCZOS)
        image.paste(im,(x+4,y+4))
        draw.text((x+13,y+tile+2),f"{asset['number']:02d}  {asset['label']}",font=font,fill='#fff1d4')
        draw.text((x+13,y+tile+36),f"{asset['triangles']:,} triangles · {asset['bytes']/1024:.0f} KB",font=small,fill='#aebfc6')
    dest=folder/('contact_sheet_rear.jpg' if rear else 'contact_sheet.jpg')
    image.save(dest,quality=94)
    print(dest)
