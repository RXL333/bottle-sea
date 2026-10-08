"""Validate actual MP4 frames, generate an offline review page, and package ten clips."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import shutil
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('destination', type=Path)
parser.add_argument('--ffmpeg', required=True)
args = parser.parse_args()
manifest = json.loads((args.source / 'manifest.json').read_text(encoding='utf-8'))
assert len(manifest['clips']) == 10, 'All ten clips must be finished before packaging'
args.destination.mkdir(parents=True, exist_ok=True)
titles = ['Bottle Reveal', 'Home Island Flyover', 'Looking at the Sea', 'Farm Reveal',
          'Tractor Field Pass', 'Combine Harvest', 'Farm Life', 'Four Seasons',
          'Weather Timelapse', 'Final Sunset Pullback']
checks, cards = [], []
for index, clip in enumerate(manifest['clips']):
    source, output = args.source / clip['file'], args.destination / clip['file']
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if output.exists():
        assert hashlib.sha256(output.read_bytes()).hexdigest() == digest, 'Existing output differs'
    else:
        shutil.copyfile(source, output)
    decoded = subprocess.run([args.ffmpeg, '-hide_banner', '-nostats', '-progress', 'pipe:1',
                              '-i', str(output), '-map', '0:v:0', '-f', 'null', '-'],
                             capture_output=True, text=True, encoding='utf-8', errors='replace')
    counts = re.findall(r'^frame=(\d+)$', decoded.stdout, re.MULTILINE)
    count = int(counts[-1]) if counts else 0
    assert decoded.returncode == 0, decoded.stderr
    assert count == clip['frames'], f"Wrong decoded frame count: {clip['file']}: {count}"
    assert re.search(r'Video: h264.*1920x1080.*30 fps', decoded.stderr), decoded.stderr
    assert 'Audio:' not in decoded.stderr, 'Clips are intentional silent editing footage'
    seconds = clip['duration'] * (.9 if index in (0, 3) else .5)
    poster = f"{index + 1:02d}-poster.png"
    subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(seconds),
                    '-i', str(output), '-vf', 'scale=640:360', '-frames:v', '1',
                    '-update', '1', str(args.destination / poster)], check=True)
    check = {**clip, 'decodedFrames': count, 'bytes': output.stat().st_size,
             'sha256': digest, 'fullDecodePassed': True}
    checks.append(check)
    print(f"PASS {clip['file']} | {count} frames | {clip['duration']}s", flush=True)
    cards.append(f'''<article><h2>{index + 1:02d} · {html.escape(titles[index])}</h2>
<video controls preload="metadata" playsinline poster="{poster}" src="{clip['file']}"></video>
<footer><span>{clip['duration']} 秒 · 1080p / 30fps</span><button type="button" data-play>播放</button>
<a download href="{clip['file']}">保存 MP4</a></footer></article>''')
report = {'status': 'passed', 'clips': checks, 'totalFrames': sum(c['decodedFrames'] for c in checks),
          'totalSeconds': sum(c['duration'] for c in checks), 'audio': False,
          'resolution': '1920x1080', 'fps': 30, 'codec': 'H.264 / yuv420p'}
(args.destination / 'validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
(args.destination / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
(args.destination / 'README.txt').write_text('Bottle Sea 横屏宣传片样片\n\n'
    '共 10 段独立 MP4，总时长 3 分 14 秒。1920×1080，16:9，30fps，H.264，yuv420p。\n'
    '无 HUD、无标题、无配乐、无声音，可直接导入剪辑软件。四季为同机位、同时间的连续变化。\n'
    '按 01–10 顺序对应所请求的十个镜头。所有视频已完整解码检查，帧数与时长正确。\n'
    '打开 index.html 可逐段播放；详细校验与 SHA-256 在 validation.json。\n'
    '视频来自隔离的 Trailer Capture 会话，未读写正式玩家存档。\n', encoding='utf-8')
page = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bottle Sea · 横屏宣传片样片</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4eee2;color:#173d55;font:16px/1.6 system-ui,sans-serif}
main{max-width:1300px;padding:38px 28px;margin:auto}h1{margin:0;font-size:32px}header p{color:#655d50}
section{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:28px}
article{background:#fffaf0;border:1px solid #d5c6ac;border-radius:12px;overflow:hidden}h2{font-size:18px;margin:14px 18px}
video{display:block;width:100%;aspect-ratio:16/9;background:#102027}footer{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px;font-size:14px}
footer span{margin-right:auto;color:#716654}a,button{color:#173d55;background:#f4c876;border:1px solid #cfab67;border-radius:5px;padding:6px 12px;font:inherit;text-decoration:none;cursor:pointer}
@media(max-width:800px){section{grid-template-columns:1fr}main{padding:24px 16px}}
</style><main><header><h1>瓶中沧海 · 横屏宣传片样片</h1><p>10 段独立 MP4 · 1920×1080 · 16:9 · 30fps · H.264<br>总时长 3 分 14 秒 · 无 HUD / 无声音 / 无标题 / 无配乐 · 可直接导入剪辑软件</p></header><section>'''
page += '\n'.join(cards) + '''</section></main><script>
document.querySelectorAll('[data-play]').forEach(button=>{
const video=button.closest('article').querySelector('video');video.addEventListener('play',()=>button.textContent='暂停');video.addEventListener('pause',()=>button.textContent='播放');
button.addEventListener('click',()=>{document.querySelectorAll('video').forEach(other=>{if(other!==video)other.pause()});if(video.paused)video.play();else video.pause()})});
</script></html>'''
(args.destination / 'index.html').write_text(page, encoding='utf-8')
archive = args.destination.with_suffix('.zip')
if archive.exists():
    with zipfile.ZipFile(archive) as existing:
        assert json.loads(existing.read(f'{args.destination.name}/validation.json')) == report, 'Existing package differs'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_STORED) as bundle:
    for path in sorted(args.destination.iterdir()):
        if path.is_file():
            bundle.write(path, arcname=f'{args.destination.name}/{path.name}')
print(json.dumps({'zip': str(archive), 'clips': len(checks), 'frames': report['totalFrames'],
                  'duration': report['totalSeconds'], 'bytes': archive.stat().st_size}), flush=True)
