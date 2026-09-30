"""Build a separated asset library and reference-layout cottage assembly in background Blender."""
import sys, os, json, math, contextlib, io
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
from mathutils import Vector,Matrix
from interior_assets import *

def enum(obj,prop,wanted):
    values=[x.identifier for x in obj.bl_rna.properties[prop].enum_items]
    assert wanted in values,(prop,wanted,values)
    setattr(obj,prop,wanted)

def reuse(slug,relative):
    a=Module(slug,'reused');a.root['source_file']=relative
    bpy.ops.import_scene.gltf(filepath=str(BASE/'public/models'/relative))
    imported=list(bpy.context.selected_objects)
    for o in imported:
        if o.parent not in imported:o.parent=a.root
    ASSETS[slug]=a;return a

def split_stove():
    src=reuse('_stove_import','farm/kitchen_stove.glb');bpy.context.view_layer.update()
    buckets={k:{} for k in ['stove_firebox','cooking_pot','firewood_rack','utensil_rack']}
    for ob in family(src.root):
        if ob.type!='MESH':continue
        me=ob.data;verts=[ob.matrix_world@v.co for v in me.vertices];adj=[set() for v in verts]
        # glTF splits vertices at hard normals. Connect coincident vertices before
        # finding authored pieces, otherwise one side of a brick becomes a module.
        coincident={}
        for i,v in enumerate(verts):
            key=tuple(round(c,6) for c in v)
            if key in coincident:
                j=coincident[key];adj[i].add(j);adj[j].add(i)
            else:coincident[key]=i
        for edge in me.edges:
            i,j=edge.vertices;adj[i].add(j);adj[j].add(i)
        groups={};visited=set()
        for start in range(len(verts)):
            if start in visited:continue
            stack=[start];group=[];visited.add(start)
            while stack:
                i=stack.pop();group.append(i)
                for j in adj[i]:
                    if j not in visited:visited.add(j);stack.append(j)
            lo=Vector([min(verts[i][k] for i in group) for k in range(3)]);hi=Vector([max(verts[i][k] for i in group) for k in range(3)])
            node=ob;pot=False
            while node:
                if node.get('part_id')=='cooking_pot':pot=True
                node=node.parent
            category='cooking_pot' if pot else ('utensil_rack' if hi.z>1.7 else 'firewood_rack') if (lo.x+hi.x)/2>.61 else 'stove_firebox'
            for i in group:groups[i]=category
        for face in me.polygons:
            category=groups[face.vertices[0]];material=me.materials[face.material_index]
            vv,ff=buckets[category].setdefault(material.name,([],[]));off=len(vv)
            vv.extend([verts[i] for i in face.vertices]);ff.append(tuple(range(off,off+len(face.vertices))))
    for slug,materials in buckets.items():
        a=Module('reused_'+slug,'reused');a.root['source_file']='farm/kitchen_stove.glb';a.root['reuse_note']='Original connected pieces separated; no re-authoring of stove geometry'
        points=[v for vv,ff in materials.values() for v in vv];center=(min(v.x for v in points)+max(v.x for v in points))/2;low=min(v.z for v in points)
        for matname,(vv,ff) in materials.items():
            me=bpy.data.meshes.new(a.slug+'_'+matname);me.from_pydata([(v.x-center,v.y,v.z-low) for v in vv],[],ff);me.materials.append(bpy.data.materials[matname]);me.update()
            o=bpy.data.objects.new(a.slug+'_'+matname,me);a.scene.collection.objects.link(o);o.parent=a.root
        ASSETS[a.slug]=a
    del ASSETS['_stove_import']
    bpy.data.scenes.remove(src.scene)

def bounds(root):
    bpy.context.view_layer.update()
    pts=[o.matrix_world@Vector(v) for o in family(root) if o.type=='MESH' for v in o.bound_box]
    return [min(v[i] for v in pts) for i in range(3)],[max(v[i] for v in pts) for i in range(3)]

def camera(scene,name,pos,target,ortho):
    data=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,data);scene.collection.objects.link(o)
    o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();enum(data,'type','ORTHO');data.ortho_scale=ortho;scene.camera=o;return o

def export_assets():
    records=[]
    for slug,a in ASSETS.items():
        bpy.context.window.scene=a.scene
        for o in a.scene.objects:o.select_set(False)
        for o in family(a.root):o.select_set(True)
        bpy.context.view_layer.objects.active=a.root
        path=OUT/(slug+'.glb')
        with contextlib.redirect_stdout(io.StringIO()):bpy.ops.export_scene.gltf(filepath=str(path),use_selection=True,use_active_scene=True,export_yup=True,export_extras=True,export_apply=True)
        lo,hi=bounds(a.root)
        cam=camera(a.scene,'Review_'+slug,Vector(lo).lerp(Vector(hi),.5)+Vector((1.1,-1.5,1))*max(hi[i]-lo[i] for i in range(3)),Vector(lo).lerp(Vector(hi),.5),max(hi[i]-lo[i] for i in range(3))*1.7)
        try:a.scene.render.engine='BLENDER_WORKBENCH'
        except TypeError:pass
        enum(a.scene.display.shading,'color_type','MATERIAL');a.scene.display.shading.show_cavity=True
        a.scene.render.resolution_x=400;a.scene.render.resolution_y=400;a.scene.render.resolution_percentage=100
        bpy.data.libraries.write(str(SRC/'modules'/(slug+'.blend')),{a.scene},fake_user=True)
        records.append({'id':slug,'category':a.root['category'],'file':slug+'.glb','blend':'modules/'+slug+'.blend','source':a.root.get('source_file','original authored geometry'),'boundsBlender':{'min':lo,'max':hi},'bytes':path.stat().st_size,'meshCount':sum(o.type=='MESH' for o in family(a.root))})
        print('EXPORTED',slug,flush=True)
    return records

def assemble():
    scene=bpy.data.scenes.new('Cottage_Interior_Assembly');bpy.context.window.scene=scene
    collections={}
    for category in ['Architecture','Furniture','Decor','Textiles','Lighting','Presentation','Full_Enclosure_Hidden']:
        col=bpy.data.collections.new(category);scene.collection.children.link(col);collections[category]=col
    layout=[]
    def place(slug,pos=(0,0,0),rotation=0,scale=1,category=None):
        asset=ASSETS[slug];mapping={}
        cat=category or {'architecture':'Architecture','furniture':'Furniture','reused':'Furniture','textile':'Textiles','lighting':'Decor'}.get(asset.root['category'],'Decor')
        for original in family(asset.root):
            copy=original.copy();copy.name=slug+'__instance';collections[cat].objects.link(copy);mapping[original]=copy
        for original,copy in mapping.items():copy.parent=mapping.get(original.parent)
        root=mapping[asset.root];root.location=pos;root.rotation_euler.z=rotation;root.scale=(scale,)*3 if isinstance(scale,(int,float)) else scale;root['module_id']=slug
        layout.append({'module':slug,'position':list(pos),'rotationZ':rotation,'scale':list(root.scale),'collection':cat})
        return root
    def light(name,pos,power,color,size=.18):
        data=bpy.data.lights.new(name,'POINT');data.energy=power;data.color=color;data.shadow_soft_size=size
        o=bpy.data.objects.new(name,data);o.location=pos;collections['Lighting'].objects.link(o)
    def lantern(pos,scale=1,power=22):
        place('warm_lantern',pos,scale=scale);light('Lantern warm pool',(pos[0],pos[1]-.12,pos[2]+.23*scale),power*3,(1,.40,.055),.16)
    # Eight by 7.4 m floor, laid as individual repeatable one-metre modules.
    for ix in range(8):
        for iy in range(7):place('floor_tile',(-3.5+ix,-3+iy,0))
    for ix in range(8):
        for y in [-3.5,3.5]:place('foundation_block',(-3.5+ix,y,-.04));place('edge_beam',(-3.5+ix,y,0))
    for iy in range(7):
        for x in [-4,4]:place('foundation_block',(x,-3+iy,-.04),math.pi/2);place('edge_beam',(x,-3+iy,0),math.pi/2)
    # Back wall and left wall have true window holes. Front/right cut away for presentation.
    for x in [-3,-1,1,3]:place('wall_window' if x==1 else 'wall_panel',(x,3.5,0))
    for y in [-2.5,-.5,1.5]:place('wall_window' if y==-.5 else 'wall_panel',(-4,y,0),math.pi/2)
    place('wall_panel',(-4,3,0),math.pi/2,(.5,1,1))
    for x in [-4,-2,0,2,4]:place('timber_post',(x,3.38,0))
    for y in [-3.5,-1.5,.5,3.5]:place('timber_post',(-3.88,y,0),math.pi/2)
    for z in [.18,2.85,3.5]:
        for x in [-3,-1,1,3]:place('timber_beam',(x,3.33,z))
        for y in [-2.5,-.5,1.5]:place('timber_beam',(-3.84,y,z),math.pi/2)
    for x in [-3.88,-1.9,.1,2.1]:place('diagonal_brace',(x,3.19,2.88))
    # A shallow pitched gable silhouette, with separate rafters and blue tile coping.
    place('gable_left',(0,3.5,0));g=place('gable_left',(0,3.68,0),math.pi)
    for side in [-1,1]:
        for j in range(4):
            x=side*(j+.5);z=4.9-abs(x)*.3375
            beam=place('timber_beam',(x,3.32,z),scale=(.53,1,1));beam.rotation_euler.y=side*math.atan(.3375);layout[-1]["rotationY"]=beam.rotation_euler.y
            tile=place('roof_blue_trim',(x,3.41,z+.13));tile.rotation_euler.y=side*math.atan(.3375);layout[-1]["rotationY"]=tile.rotation_euler.y
    for y in [-3,-2,-1,0,1,2,3]:place('roof_blue_trim',(-4,y,3.65),math.pi/2)
    place('ocean_window',(1,3.39,1.15))
    place('ocean_window',(-3.89,-.5,1.15),math.pi/2)
    # Door wall retained only around the entrance to keep the diorama legible.
    place('entry_frame',(-2.55,-3.48,0));place('blue_door',(-2.55,-3.49,.02));place('entry_steps',(-2.55,-3.60,-.04))
    for x in [-3.5,-1.5]:place('wall_low',(x,-3.49,0));place('timber_beam',(x,-3.49,.54),scale=(.5,1,1))
    place('timber_post',(-1.8,-3.48,0),scale=(1,1,.77));place('entry_mat',(-2.55,-4.01,-.185))
    # Bed, cabinet and stove are existing farm models, retained as source-labelled independent assets.
    place('bed_rug',(-2.2,-.22,.015),math.pi/2)
    place('reused_bed',(-2.52,-.24,.075),math.pi/2,1.08)
    place('nightstand',(-2.63,1.28,.01),math.pi/2)
    lantern((-2.65,1.43,.88),.8,18);place('small_pot',(-2.39,1.48,.88),scale=.7)
    place('blue_book',(-2.62,1.1,.88),rotation=.3,scale=.8)
    place('red_book',(-2.62,1.1,.994),rotation=.18,scale=.8)
    place('green_book',(-1.95,-.52,.91),rotation=-.2)
    place('sailor_wardrobe',(-2.72,3.03,0),scale=1.0)
    place('reused_food_cupboard',(-1.28,3.04,0),scale=(.85,1,1.16))
    lantern((-3.16,2.98,2.75),.95,33);place('wooden_barrel',(-2.6,3.0,2.76),scale=.70)
    place('small_lockbox',(-1.99,2.99,2.76),scale=1.3)
    place('ironbound_chest',(-.55,2.20,.045),scale=.92);place('hearth_rug',(-.55,2.17,.01),scale=(1.08,1.4,1))
    place('reused_grain_sack',(.44,2.36,.02));place('wooden_barrel',(.8,2.81,.015),scale=.9)
    # Reused firebox and pot; old wood storage and utensil rack are separated and relocated to its left.
    place('reused_stove_firebox',(2.91,2.96,0),scale=1.05)
    place('reused_cooking_pot',(2.91,2.95,1.26),scale=1.05)
    place('reused_firewood_rack',(1.60,2.96,0),scale=1.05)
    place('reused_utensil_rack',(2.18,3.0,.08),scale=.9)
    for z in [1.18,2.14,3.1,4.06]:place('chimney_section',(3.05,3.47,z),scale=.8)
    place('chimney_cap',(3.05,3.47,4.85),scale=.8)
    light('Fire glow',(2.91,2.60,.4),105,(1,.20,.012),.15)
    place('hearth_rug',(2.53,1.82,.012))
    place('wall_shelf',(2.78,3.22,2.56),scale=1.15)
    lantern((1.30,2.95,.94),.77,24);place('cutting_board',(1.78,2.86,.94));place('ceramic_mug',(1.82,3.05,.99))
    for i in range(3):place('preserve_jar',(2.27+i*.30,3.19,2.63),scale=.95)
    place('small_pot',(3.2,3.2,2.63),scale=.8);place('cheese_bread',(3.36,2.69,1.29),scale=.85)
    place('wooden_barrel',(3.69,2.09,0),scale=.67)
    # Navigation workspace is foreground centre, with independent tabletop objects.
    place('table_rug',(.40,-1.24,.012));place('navigation_table',(.40,-1.12,.055))
    place('blue_chair',(.27,-2.37,.06),math.pi);place('sea_chart',(.43,-1.18,1.39),rotation=-.13)
    place('brass_telescope',(-.34,-.79,1.39),math.pi/2,1.08)
    place('compass',(.02,-1.52,1.42),scale=.85)
    place('inkwell_quill',(.94,-1.51,1.40),rotation=-.6)
    place('small_lockbox',(1.13,-.74,1.40),rotation=.15)
    for i in range(2):place('blue_book',(.35,-.72,1.39+i*.14),rotation=.12 if i else -.08)
    lantern((.78,-.65,1.40),.82,27)
    place('ceramic_fern',(-1.05,-2.78,.015),scale=.85);place('rope_coil',(-.49,-2.81,.015))
    place('wooden_barrel',(-1.04,-3.58,-.25));place('blue_book',(-1.04,-3.58,.5),scale=.9)
    # Wall story details face the room and stay separately selectable.
    place('wall_shelf',(-3.72,1.05,2.06),math.pi/2,1.0)
    place('island_picture',(-3.79,1.05,2.11),math.pi/2,.83)
    place('mini_sailboat',(-3.64,1.53,2.12),math.pi/2,.65)
    place('trailing_ivy',(-3.59,.45,2.12),math.pi/2,.70)
    place('hanging_rope',(-.02,3.26,1.76),scale=.85)
    place('striped_fish',(1.92,3.2,1.50),scale=.95)
    place('small_pot',(1.21,3.08,1.20),scale=.75)
    lantern((-3.44,-3.70,1.57),1,28);place('trailing_ivy',(-3.95,-3.39,.54),scale=.85)
    # Optional complete enclosure; hidden for the reference cutaway render.
    full='Full_Enclosure_Hidden'
    for y in [-2.5,-.5,1.5]:place('wall_panel',(4,y,0),math.pi/2,category=full)
    place('wall_panel',(4,3,0),math.pi/2,(.5,1,1),category=full)
    place('wall_door',(-2.55,-3.5,0),category=full)
    place('wall_panel',(-3.775,-3.5,0),scale=(.225,1,1),category=full)
    for x,scale in [(-.55,1),(1.45,1),(3.225,.775)]:place('wall_panel',(x,-3.5,0),scale=(scale,1,1),category=full)
    for side in [-1,1]:
        for x in [1,3]:
            for y,sy in [(-2.5,1),(-.5,1),(1.5,1),(3,.5)]:
                panel=place('roof_panel',(side*x,y,4.94-x*.3375),scale=(1.055,sy,1),category=full)
                panel.rotation_euler.y=side*math.atan(.3375);layout[-1]["rotationY"]=panel.rotation_euler.y
    collections[full].hide_render=True;collections[full].hide_viewport=True
    # Studio is presentation-only and is never exported with modules.
    groundmesh=bpy.data.meshes.new('Studio ground');groundmesh.from_pydata([(-200,-200,-.69),(200,-200,-.69),(200,200,-.69),(-200,200,-.69)],[],[(0,1,2,3)]);ground=bpy.data.objects.new('Studio ground',groundmesh);collections['Presentation'].objects.link(ground);groundmesh.materials.append(mc.mat('blue2'))
    world=bpy.data.worlds.new('Soft blue studio');world.use_nodes=True;bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.25,.39,.60,1);bg.inputs['Strength'].default_value=.23;scene.world=world
    def area(name,loc,power,size,color):
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);collections['Lighting'].objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
    area('Warm softbox',(-3,-4,9),1050,7,(1,.78,.52));area('Ocean fill',(4,-1,6),650,6,(.62,.79,1));area('Roof rim',(-1,5,8),1050,5,(1,.74,.46))
    camera(scene,'Hero',(11,-15,12),(0,-.10,1.60),12.9)
    scene.render.resolution_x=1550;scene.render.resolution_y=1450;scene.render.resolution_percentage=100
    try:scene.render.engine='CYCLES'
    except TypeError:pass
    scene.cycles.samples=48;scene.cycles.use_denoising=True
    enum(scene.render.image_settings,'file_format','PNG');scene.render.film_transparent=False
    scene.view_settings.exposure=0
    scene.render.filepath=str(SRC/'previews'/'interior_hero.png')
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                sp=area.spaces.active;enum(sp.shading,'color_type','MATERIAL');sp.overlay.show_overlays=False;enum(sp.region_3d,'view_perspective','CAMERA');sp.region_3d.view_camera_zoom=0
    (OUT/'layout.json').write_text(json.dumps({'units':'meters','coordinateSystem':'Blender Z up; convert to glTF with x,y,z -> x,z,-y','room':[8,7,3.55],'hiddenCollections':['Full_Enclosure_Hidden'],'instances':layout},ensure_ascii=False,indent=2),encoding='utf-8')
    return scene

if __name__=='__main__':
    print('BLENDER',bpy.app.version_string,flush=True)
    build_new()
    reuse('reused_bed','farm/modules/bed__bed_frame.glb')
    reuse('reused_food_cupboard','farm/modules/storage_set__food_cupboard.glb')
    reuse('reused_grain_sack','farm/modules/storage_set__grain_sack.glb')
    split_stove()
    # Give brass a real metallic response and illuminate the stylised window views.
    for key in ['brass']:
        bs=next(n for n in mc.mat(key).node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Metallic'].default_value=.72;bs.inputs['Roughness'].default_value=.29
    bs=next(n for n in mc.mat('sky').node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Emission Color'].default_value=(.12,.48,.72,1);bs.inputs['Emission Strength'].default_value=.32
    records=export_assets();scene=assemble()
    (OUT/'manifest.json').write_text(json.dumps({'title':'Modular maritime cottage interior','assetCount':len(records),'assets':records,'assembly':'layout.json','reference':'User supplied ChatGPT image 2026-09-28 21:18:45','wholeRoomMerged':False},ensure_ascii=False,indent=2),encoding='utf-8')
    bpy.context.window.scene=scene
    bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'cottage_interior.blend'))
    print('SAVED ASSEMBLY',len(records),'modules',flush=True)
    bpy.ops.render.render(write_still=True)
    print('RENDER COMPLETE',flush=True)
