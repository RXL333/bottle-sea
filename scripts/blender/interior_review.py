"""Reopen every editable module, verify hierarchy, and render detail cameras."""
import bpy,json
from pathlib import Path
from mathutils import Vector
BASE=Path(__file__).resolve().parents[2];SRC=BASE/'assets/blender/interior'
manifest=json.loads((BASE/'public/models/interior/manifest.json').read_text(encoding='utf-8'))
checks=[]
for a in manifest['assets']:
    bpy.ops.wm.open_mainfile(filepath=str(SRC/a['blend']))
    scene=bpy.data.scenes.get('Asset_'+a['id']);assert scene,a['id']
    bpy.context.window.scene=scene
    roots=[o for o in scene.objects if o.get('asset_id')==a['id']];assert len(roots)==1,a['id']
    assert scene.camera is not None,a['id']
    meshes=[o for o in scene.objects if o.type=='MESH'];assert len(meshes)==a['meshCount'],a['id']
    assert all(len(o.data.polygons)>0 for o in meshes),a['id']
    # Library writes lack startup UI state. Save a native file with the asset scene
    # active so a user opening an individual module does not land in an empty Scene.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                sp=area.spaces.active;sp.overlay.show_overlays=False
                sp.shading.color_type=next(v.identifier for v in sp.shading.bl_rna.properties['color_type'].enum_items if v.identifier=='MATERIAL')
                sp.region_3d.view_perspective=next(v.identifier for v in sp.region_3d.bl_rna.properties['view_perspective'].enum_items if v.identifier=='CAMERA')
                sp.region_3d.view_camera_zoom=0
    bpy.ops.wm.save_as_mainfile(filepath=str(SRC/a['blend']))
    checks.append({'id':a['id'],'meshes':len(meshes),'source':roots[0].get('source_file','new'),'camera':scene.camera.name,'status':'opened and verified'})
    print('VERIFIED',a['id'],flush=True)
bpy.ops.wm.open_mainfile(filepath=str(SRC/'cottage_interior.blend'))
scene=bpy.data.scenes['Cottage_Interior_Assembly'];bpy.context.window.scene=scene
instances=[o for o in scene.objects if o.get('module_id')]
assert len(instances)>200
assert len({o.get('module_id') for o in instances})==manifest['assetCount']
assert bpy.data.collections['Full_Enclosure_Hidden'].hide_render
hero=scene.camera
for name,pos,target,scale in [
    ('interior_desk',(6,-9,7),(.4,-1.1,1.0),5.2),
    ('interior_bed',(4,-7,5),(-2.2,.25,1.0),5.4),
    ('interior_hearth',(6,-5,5),(2.1,2.7,1.5),4.7),
]:
    camera=scene.objects.get(name)
    if camera is None:
        data=bpy.data.cameras.new(name);camera=bpy.data.objects.new(name,data);scene.collection.objects.link(camera)
    data=camera.data;camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    data.type=next(v.identifier for v in data.bl_rna.properties['type'].enum_items if v.identifier=='ORTHO');data.ortho_scale=scale;scene.camera=camera
    scene.render.resolution_x=1100;scene.render.resolution_y=1000;scene.cycles.samples=64;scene.render.filepath=str(SRC/'previews'/(name+'.png'));bpy.ops.render.render(write_still=True)
scene.camera=hero;scene.render.resolution_x=1550;scene.render.resolution_y=1450;scene.render.filepath=str(SRC/'previews/interior_hero.png')
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'cottage_interior.blend'))
(SRC/'source_validation.json').write_text(json.dumps({'status':'passed','modules':checks,'assemblyInstances':len(instances),'separateMeshObjects':sum(o.type=='MESH' for o in scene.objects),'collections':[c.name for c in scene.collection.children]},indent=2),encoding='utf-8')
print('REVIEW COMPLETE',len(checks),'modules',len(instances),'instances',flush=True)
