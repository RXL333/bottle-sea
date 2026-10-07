"""Reopen saved NPC source libraries in background Blender for delivery checks."""
import bpy,json
from pathlib import Path
base=Path(__file__).resolve().parents[2]
manifest=json.loads((base/'public/models/npcs/manifest.json').read_text(encoding='utf-8'))
reports=[]
for a in manifest['characters']:
 with bpy.data.libraries.load(str(base/a['blend']),link=False) as (src,dst):dst.scenes=src.scenes
 scene=dst.scenes[0]
 roots=[o for o in scene.objects if o.get('asset_id')==a['id']]
 assert len(roots)==1,a['id']
 parts={o.get('part_id') for o in scene.objects if o.get('part_id')}
 assert set(a['parts'])==parts
 meshes=[o for o in scene.objects if o.type=='MESH']
 assert len(meshes)==a['meshCount']
 assert all(o.parent and o.data.materials for o in meshes)
 assert scene.camera
 reports.append({'id':a['id'],'meshes':len(meshes),'parts':len(parts),'editable':True,'camera':True})
(base/'assets/blender/npcs/source_validation.json').write_text(json.dumps({'status':'passed','characters':reports},indent=2),encoding='utf-8')
print('SOURCE_VALIDATION',json.dumps(reports))
