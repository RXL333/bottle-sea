"""Rebuild only the plow; preserve all other farm and character assets."""
import json, bmesh, bpy
from mathutils import Vector
from farm_common import OUTPUT, SOURCE
from farm_machines import plow
from finalize_farm import bounds, descendants, export_selected

def rebuild():
    info=plow();scene=bpy.context.scene
    root=next(o for o in scene.objects if o.get('asset_id')=='plow')
    objects=descendants(root)
    for o in objects:
        if o.type!='MESH':continue
        bm=bmesh.new();bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
        bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-8)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
    bpy.context.view_layer.update();low,high=bounds(objects)
    for o in root.children:o.location.z-=low.z
    bpy.context.view_layer.update();low,high=bounds(objects)
    triangles=0;degenerate=0
    for o in objects:
        if o.type=='MESH':
            o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
            degenerate+=sum(t.area<1e-12 for t in o.data.loop_triangles)
    info.update({'boundsBlender':{'min':list(low),'max':list(high)},'dimensions':{'width':round(high.x-low.x,5),'height':round(high.z-low.z,5),'depth':round(high.y-low.y,5)},'triangles':triangles,'meshCount':sum(o.type=='MESH' for o in objects),'parts':{o['part_id']:o.name for o in objects if o.get('part_id')},'preview':'previews/plow.png','modules':[]})
    info['notes']=['Mirrored left and right depth wheels with independent semantic pivots; working shares and Hitch_Front unchanged.']
    export_selected(scene,objects,OUTPUT/'plow.glb');info['bytes']=(OUTPUT/'plow.glb').stat().st_size
    (OUTPUT/'plow.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
    manifest=json.loads((OUTPUT/'manifest.json').read_text(encoding='utf-8'))
    manifest['assets']=[info if a['id']=='plow' else a for a in manifest['assets']]
    (OUTPUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    auditPath=SOURCE/'geometry_audit.json'
    if auditPath.exists():
        audit=json.loads(auditPath.read_text(encoding='utf-8'))
        entry={'id':'plow','degenerateTriangles':degenerate,'groundMinZ':round(low.z,7),'triangles':triangles,'parts':len(info['parts']),'modules':0}
        audit=[entry if a['id']=='plow' else a for a in audit]
        auditPath.write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    center=(low+high)/2;extent=max(high-low);cam=scene.camera
    cam.location=center+Vector((1.15,-1.6,1))*extent;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=extent*1.58
    scene.view_settings.exposure=.75;scene.render.filepath=str(SOURCE/'previews/plow.png');bpy.ops.render.render(write_still=True)
    bpy.data.libraries.write(str(SOURCE/'plow.blend'),{scene},fake_user=True)
    print(json.dumps({'asset':'plow','triangles':triangles,'wheels':[p for p in info['parts'] if 'wheel' in p],'bounds':info['boundsBlender']}))

if __name__=='__main__':rebuild()
