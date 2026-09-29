"""Run in a separate background Blender process; checks and saves usable startup views."""
import bpy,json
from pathlib import Path
from mathutils import Vector

BASE=Path(__file__).resolve().parents[2]
folder=BASE/'assets/blender/farm'
assets=json.loads((BASE/'public/models/farm/manifest.json').read_text(encoding='utf-8'))['assets']
results=[]
for asset in assets:
    filename=folder/asset['blend']
    bpy.ops.wm.open_mainfile(filepath=str(filename))
    scene=next(s for s in bpy.data.scenes if s.name==f"Farm_{asset['number']:02d}_{asset['id']}")
    bpy.context.window.scene=scene
    root=next(o for o in scene.objects if o.get('asset_id')==asset['id'])
    meshes=[o for o in scene.objects if o.type=='MESH']
    tri=0
    for o in meshes:o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
    assert tri==asset['triangles'],(asset['id'],tri,asset['triangles'])
    assert scene.camera is not None,asset['id']+' missing review camera'
    if 'METRIC' in [i.identifier for i in scene.unit_settings.bl_rna.properties['system'].enum_items]:scene.unit_settings.system='METRIC'
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                sp=area.spaces.active;r=sp.region_3d
                sp.overlay.show_overlays=False
                sp.shading.color_type=next(v.identifier for v in sp.shading.bl_rna.properties['color_type'].enum_items if v.identifier=='MATERIAL')
                r.view_perspective=next(v.identifier for v in r.bl_rna.properties['view_perspective'].enum_items if v.identifier=='CAMERA')
                r.view_camera_zoom=0;r.view_camera_offset=(0,0)
    bpy.ops.wm.save_as_mainfile(filepath=str(filename))
    results.append({'id':asset['id'],'scene':scene.name,'meshes':len(meshes),'triangles':tri,'camera':scene.camera.name,'status':'opened and saved'})
    print('VERIFIED',asset['id'],flush=True)
(folder/'blend_validation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print('VERIFIED ALL',len(results),flush=True)
