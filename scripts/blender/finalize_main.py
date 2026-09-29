from main_common import *
import bmesh

def descendants(root):
    return [root]+[c for child in root.children for c in descendants(child)]

def run():
    assets=[]
    for scene in list(bpy.data.scenes):
        if not scene.name.startswith('Main_'):continue
        bpy.context.window.scene=scene
        root=next(o for o in scene.objects if o.get('asset_id'))
        slug=root['asset_id'];info=json.loads((OUTPUT/(slug+'.json')).read_text(encoding='utf-8'))
        bpy.context.view_layer.update()
        meshes=[o for o in descendants(root) if o.type=='MESH']
        points=[o.matrix_world@Vector(p) for o in meshes for p in o.bound_box]
        low=min(p.z for p in points)
        if info['pivot']=='ground' and abs(low)>1e-7:
            for child in root.children:child.location.z-=low
        bpy.context.view_layer.update()
        points=[o.matrix_world@Vector(p) for o in meshes for p in o.bound_box]
        lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
        info['boundsBlender']={'min':list(lo),'max':list(hi)}
        info['dimensions']={'width':hi.x-lo.x,'height':hi.z-lo.z,'depth':hi.y-lo.y}
        for o in scene.objects:o.select_set(False)
        for o in descendants(root):o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUTPUT/(slug+'.glb')),use_selection=True,use_active_scene=True,export_yup=True,export_extras=True)
        info['bytes']=(OUTPUT/(slug+'.glb')).stat().st_size
        info['modules']=[]
        if info['number'] in [5,6,9,10,11,12]:
            folder=OUTPUT/'modules';folder.mkdir(exist_ok=True)
            for part in list(root.children):
                if part.type!='EMPTY':continue
                for o in scene.objects:o.select_set(False)
                saved=part.location.copy();part.location=(0,0,0)
                for o in descendants(part):o.select_set(True)
                filename=f"{slug}__{part['part_id']}.glb"
                bpy.ops.export_scene.gltf(filepath=str(folder/filename),use_selection=True,use_active_scene=True,export_yup=True,export_extras=True)
                part.location=saved
                info['modules'].append({'id':part['part_id'],'file':'modules/'+filename})
        degenerate=0
        for o in descendants(root):
            if o.type!='MESH':continue
            o.data.calc_loop_triangles();degenerate+=sum(t.area<1e-12 for t in o.data.loop_triangles)
        info['degenerateTriangles']=degenerate
        info['preview']='previews/'+slug+'.png'
        scene.view_settings.exposure=.9
        scene.camera.data.ortho_scale=max(info['dimensions'].values())*1.55
        scene.render.resolution_x=640;scene.render.resolution_y=640
        bpy.ops.render.render(write_still=True)
        # Secondary angle proves back surfaces are present.
        cam=scene.camera;old=cam.location.copy();rot=cam.rotation_euler.copy()
        center=Vector([(info['boundsBlender']['min'][i]+info['boundsBlender']['max'][i])/2 for i in range(3)])
        cam.location=center+Vector((-.95,1.5,.85))*max(info['dimensions'].values());cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(PREVIEWS/(slug+'_back.png'));bpy.ops.render.render(write_still=True)
        cam.location=old;cam.rotation_euler=rot;scene.render.filepath=str(PREVIEWS/(slug+'.png'))
        for o in scene.objects:o.select_set(False)
        bpy.context.view_layer.update()
        bpy.data.libraries.write(str(SOURCE/(slug+'.blend')),{scene},fake_user=True)
        (OUTPUT/(slug+'.json')).write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8');assets.append(info)
    assets.sort(key=lambda x:x['number'])
    (OUTPUT/'manifest.json').write_text(json.dumps({'reference':'主岛 建模参考 2–12','assets':assets,'notes':'11 reference categories + one additional palm; original geometry; no external textures'},ensure_ascii=False,indent=2),encoding='utf-8')
    bpy.context.window.scene=bpy.data.scenes['Main_03_main_cottage']
    bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'assets/blender/main_island_library.blend'))
    print('FINALIZED',len(assets))

if __name__=='__main__':run()
