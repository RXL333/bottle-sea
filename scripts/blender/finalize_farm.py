"""Normalize, audit, render and package the twenty generated asset scenes."""
from farm_common import *
import bmesh, re

SLUGS=['transport_boat','tractor','seeder','combine_harvester','farm_trailer','plow','barn','tool_shed','farmhouse','windmill','water_tower','fence_kit','dock_kit','fishing_deck','bed','kitchen_stove','storage_set','chicken','cow','sheep']

def descendants(root):
    result=[root]
    for child in root.children:result.extend(descendants(child))
    return result

def bounds(objects):
    points=[o.matrix_world@Vector(v) for o in objects if o.type=='MESH' for v in o.bound_box]
    return Vector([min(p[i] for p in points) for i in range(3)]),Vector([max(p[i] for p in points) for i in range(3)])

def export_selected(scene,objects,path):
    bpy.context.window.scene=scene
    for o in scene.objects:o.select_set(False)
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    with contextlib.redirect_stdout(io.StringIO()):
        bpy.ops.export_scene.gltf(filepath=str(path),use_selection=True,use_active_scene=True,export_yup=True,export_extras=True)
    for o in objects:o.select_set(False)

def build_modules(scene,root,info):
    folder=OUTPUT/'modules';folder.mkdir(exist_ok=True)
    selected=[o for o in root.children if o.type=='EMPTY']
    if info['number']==18:selected=[o for o in selected if o.get('part_id')=='chick']
    if info['number'] not in [12,13,14,15,16,17,18]:return []
    results=[]
    for part in selected:
        sub=descendants(part);stage=bpy.data.scenes.new('EXPORT_MODULE_TEMP')
        bpy.context.window.scene=stage
        copies={}
        for o in sub:
            c=o.copy();stage.collection.objects.link(c);copies[o]=c
        for o,c in copies.items():
            c.parent=copies.get(o.parent)
            c.matrix_parent_inverse=o.matrix_parent_inverse.copy()
            c.matrix_basis=o.matrix_basis.copy()
        copies[part].location=(0,0,0)
        bpy.context.view_layer.update()
        filename=info['id']+'__'+part['part_id']+'.glb'
        export_selected(stage,list(copies.values()),folder/filename)
        low,high=bounds(list(copies.values()))
        results.append({'id':part['part_id'],'file':'modules/'+filename,'dimensions':list(high-low),'origin':'component local origin; orientation matches parent asset'})
        bpy.context.window.scene=scene
        for o in copies.values():bpy.data.objects.remove(o,do_unlink=True)
        bpy.data.scenes.remove(stage)
    return results

def finalize(render=True):
    manifest=[];audit=[];pack_scenes=[]
    for number,slug in enumerate(SLUGS,1):
        scene=bpy.data.scenes[f'Farm_{number:02d}_{slug}'];bpy.context.window.scene=scene
        root=next(o for o in scene.objects if o.get('asset_id')==slug)
        info=json.loads((OUTPUT/(slug+'.json')).read_text(encoding='utf-8'))
        root['origin_convention']=info['pivot']
        if 'pivot' in root:del root['pivot']
        # Canonical semantic nodes, independent of Blender's global .001 suffixes.
        for o in list(root.children):
            if o.type=='EMPTY':
                part=o.get('part_id') or re.sub(r'\.\d+$','',o.name).removeprefix(slug+'__')
                o['part_id']=part;o.name=slug+'__'+part
        if slug=='storage_set':
            chest=next(o for o in root.children if o.get('part_id')=='storage_chest')
            lid=next(o for o in descendants(root) if o.get('part_id')=='chest_lid')
            if lid.parent!=chest:
                world=lid.matrix_world.copy();lid.parent=chest;lid.matrix_world=world
        # Clean collapsed cone-tip faces, preserving all intentional hard edges.
        for o in descendants(root):
            if o.type!='MESH':continue
            bm=bmesh.new();bm.from_mesh(o.data)
            bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
            bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-8)
            bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
        bpy.context.view_layer.update();low,high=bounds(descendants(root))
        if info['pivot']=='ground' and abs(low.z)>1e-7:
            # Move only direct children, leaving the asset root at identity.
            for o in root.children:o.location.z-=low.z
        bpy.context.view_layer.update();low,high=bounds(descendants(root))
        triangles=0;degenerate=0
        for o in descendants(root):
            if o.type!='MESH':continue
            o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
            degenerate+=sum(1 for t in o.data.loop_triangles if t.area<1e-12)
        info.update({'boundsBlender':{'min':list(low),'max':list(high)},'dimensions':{'width':round(high.x-low.x,5),'height':round(high.z-low.z,5),'depth':round(high.y-low.y,5)},'triangles':triangles,'meshCount':sum(o.type=='MESH' for o in descendants(root)),
            'parts':{o['part_id']:o.name for o in descendants(root) if o.get('part_id')},'preview':f'previews/{slug}.png'})
        info['modules']=build_modules(scene,root,info)
        export_selected(scene,descendants(root),OUTPUT/(slug+'.glb'))
        info['bytes']=(OUTPUT/(slug+'.glb')).stat().st_size
        (OUTPUT/(slug+'.json')).write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
        center=(low+high)/2;extent=max(high-low);cam=scene.camera
        scene.view_settings.exposure=.75
        cam.location=center+Vector((1.15,-1.6,1.0))*extent
        cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.ortho_scale=extent*1.58
        scene.render.filepath=str(PREVIEWS/(slug+'.png'))
        if render:
            bpy.ops.render.render(write_still=True)
            cam.location=center+Vector((-1.2,1.5,.85))*extent
            cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
            scene.render.filepath=str(PREVIEWS/(slug+'_rear.png'));bpy.ops.render.render(write_still=True)
            cam.location=center+Vector((1.15,-1.6,1.0))*extent
            cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
            scene.render.filepath=str(PREVIEWS/(slug+'.png'))
        bpy.data.libraries.write(str(SOURCE/(slug+'.blend')),{scene},fake_user=True)
        audit.append({'id':slug,'degenerateTriangles':degenerate,'groundMinZ':round(low.z,7),'triangles':triangles,'parts':len(info['parts']),'modules':len(info['modules'])})
        manifest.append(info);pack_scenes.append(scene)
    document={'title':'农场岛 · 20 类低多边形模型','version':1,'style':'reference-inspired low-poly / block forms','assetCount':20,'units':'meters','glTFUp':'+Y','glTFForward':'+Z','assets':manifest}
    (OUTPUT/'manifest.json').write_text(json.dumps(document,ensure_ascii=False,indent=2),encoding='utf-8')
    (SOURCE/'geometry_audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    bpy.data.libraries.write(str(BASE/'assets/blender/farm_asset_library.blend'),set(pack_scenes),fake_user=True)
    print(json.dumps({'assets':len(manifest),'modules':sum(len(i['modules']) for i in manifest),'triangles':sum(i['triangles'] for i in manifest),'bytes':sum(i['bytes'] for i in manifest),'degenerateTriangles':sum(a['degenerateTriangles'] for a in audit)}))
    return document

if __name__=='__main__':finalize()
