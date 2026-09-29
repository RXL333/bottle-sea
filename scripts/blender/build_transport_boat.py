"""Run in Blender's Python console. Standalone reference-inspired transport launch."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion

BASE = Path('D:/Projects/D_vibe_coding/瓶中沧海')
scene = bpy.data.scenes.new('Farm_01_TransportBoat')
bpy.context.window.scene = scene
collection = scene.collection
parts = []
materials = {}
palette = {'cream':'e8dfc4','red':'a83e2c','wood':'976035','wood_light':'b7834a',
           'dark':'29343b','glass':'294f60','brass':'dcaa46','roof':'f4ecd7',
           'rubber':'20282b','white':'faf2dd','crate':'b34c30'}
for key,h in palette.items():
    rgb = tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
    linear = tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)
    m=bpy.data.materials.new('Boat_'+key); m.use_nodes=True
    m.diffuse_color=(*linear,1)
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs.get('Base Color').default_value=(*linear,1)
    bs.inputs.get('Roughness').default_value=.76
    materials[key]=m

def mesh(name,verts,faces,mat):
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces); data.update()
    o=bpy.data.objects.new(name,data); collection.objects.link(o)
    o.data.materials.append(materials[mat]); parts.append(o); return o

def box(name,loc,size,mat):
    x,y,z=[v/2 for v in size]
    vs=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    o=mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
    o.location=loc; return o

def rod(name,a,b,r,mat,n=8):
    a,b=Vector(a),Vector(b); length=(b-a).length
    verts=[(r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),z) for z in (-length/2,length/2) for i in range(n)]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    o=mesh(name,verts,faces,mat); o.location=(a+b)/2
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o

def ring(name,loc,outer,inner,depth,mat,n=12):
    vs=[(r*math.cos(i*math.tau/n),y,r*math.sin(i*math.tau/n)) for y,r in [(-depth/2,outer),(depth/2,outer),(-depth/2,inner),(depth/2,inner)] for i in range(n)]
    fs=[]
    for i in range(n):
        j=(i+1)%n
        fs += [(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)]
    o=mesh(name,vs,fs,mat); o.location=loc; return o

# Bow points towards Blender -Y, exported as glTF +Z; sea level is Z=0.
outline=[(-.66,1.7),(.66,1.7),(.86,1.3),(.86,-.8),(.69,-1.43),(.34,-1.84),(0,-1.98),(-.34,-1.84),(-.69,-1.43),(-.86,-.8),(-.86,1.3)]
def hull_band(name,z0,z1,s0,s1,mat):
    n=len(outline); vs=[(x*s,y*s,z) for z,s in [(z0,s0),(z1,s1)] for x,y in outline]
    fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,vs,fs,mat)
hull_band('Hull_red_keel',-.42,-.13,.64,.9,'red')
hull_band('Hull_dark_waterline',-.15,-.07,.90,.93,'dark')
hull_band('Hull_cream_sides',-.07,.31,.93,1,'cream')
hull_band('Deck_base',.31,.36,.94,.94,'wood')
# Planked working deck follows the tapered hull.
for i in range(18):
    y=1.58-i*.192
    width=1.55 if y>-.75 else max(.30,1.55-(abs(y)-.75)*1.22)
    box('Deck_plank_%02d'%i,(0,y,.376),(width,.183,.043),'wood_light' if i%3==0 else 'wood')
for i,((x,y),(xx,yy)) in enumerate(zip(outline,outline[1:]+outline[:1])):
    length=math.hypot(xx-x,yy-y)
    for z,h,mat in [(.44,.18,'cream'),(.56,.08,'dark'),(.62,.09,'wood_light')]:
        o=box('Gunwale_%02d'%i,((x+xx)/2,(y+yy)/2,z),(.095,length+.025,h),mat)
        o.rotation_euler.z=-math.atan2(xx-x,yy-y)
    box('Rail_post_%02d'%i,(x,y,.66),(.11,.11,.30),'wood')

box('Cabin_body',(0,.28,.84),(1.03,1.13,.95),'cream')
box('Cabin_base',(0,.28,.43),(1.12,1.19,.1),'dark')
for x in [-.29,.29]:
    box('Front_window',(x,-.291,1.04),(.37,.024,.42),'glass')
    box('Front_window_sill',(x,-.32,.805),(.41,.065,.05),'wood')
for x in [-.522,.522]:
    for y in [-.02,.49]:
        box('Side_window',(x,y,1.035),(.025,.37,.43),'glass')
        box('Window_sill',(x*1.02,y,.802),(.055,.41,.045),'wood')
box('Rear_door',(0,.853,.78),(.40,.04,.67),'wood')
box('Rear_door_glass',(0,.879,.94),(.26,.02,.25),'glass')
box('Door_handle',(.14,.905,.71),(.035,.035,.07),'brass')
box('Roof_trim',(0,.28,1.35),(1.20,1.30,.08),'wood_light')
box('Cabin_roof',(0,.28,1.414),(1.25,1.36,.08),'roof')
box('Chimney',(.28,.57,1.64),(.20,.22,.39),'red')
box('Chimney_cap',(.28,.57,1.85),(.26,.28,.07),'dark')
box('Roof_vent',(-.25,.29,1.52),(.30,.35,.13),'wood')
box('Vent_top',(-.25,.29,1.60),(.34,.39,.045),'cream')

rod('Mast',(-.3,1.18,.38),(-.3,1.18,2.08),.039,'wood')
rod('Mast_crossbar',(-.58,1.18,1.85),(-.02,1.18,1.85),.03,'brass')
box('Navigation_lamp',(-.3,1.18,2.05),(.13,.13,.16),'brass')
box('Navigation_lamp_cap',(-.3,1.18,2.16),(.17,.17,.055),'dark')
for x in [-.65,.65]: rod('Mast_stay',(-.3,1.18,1.95),(x,1.48,.64),.008,'cream',6)
for side in [-1,1]:
    for y in [-.75,1.03]:
        o=ring('Tire_fender',(side*.88,y,.26),.19,.095,.105,'rubber')
        o.rotation_euler.z=math.pi/2
        rod('Fender_rope',(side*.88,y,.42),(side*.87,y,.69),.013,'cream',6)
for x,y in [(-.45,-1.27),(.43,1.40)]:
    box('Bollard_base',(x,y,.41),(.19,.17,.06),'dark')
    rod('Bollard',(x,y,.43),(x,y,.60),.038,'dark')
    rod('Bollard_crossbar',(x-.10,y,.57),(x+.10,y,.57),.028,'dark')
box('Cargo_crate',(-.13,-1.0,.53),(.42,.42,.29),'crate')
for y in [-1.16,-.84]: box('Crate_band',(-.13,y,.54),(.45,.045,.32),'wood')
rod('Barrel',(.45,1.1,.40),(.45,1.1,.80),.18,'wood',10)
for z in [.46,.72]: rod('Barrel_hoop',(.45,1.1,z-.027),(.45,1.1,z+.027),.184,'dark',10)
ring('Life_ring',(0,1.765,.33),.23,.13,.09,'white')
for x,z in [(0,.52),(0,.14),(-.19,.33),(.19,.33)]:
    box('Life_ring_red_band',(x,1.817,z),(.10,.03,.10),'red')

root=bpy.data.objects.new('TransportBoat',None); collection.objects.link(root)
for o in parts: o.parent=root
root['asset_id']='transport_boat'; root['blender_forward']='-Y'; root['gltf_forward']='+Z'
root['pivot']='waterline'; root['reference']='User supplied farm reference sheet, item 01'
scene['notes']='Original geometry inspired by supplied reference. No external asset dependencies.'
for o in scene.objects: o.select_set(False)
root.select_set(True)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active=root
out=BASE/'public/models/farm/transport_boat.glb'
bpy.ops.export_scene.gltf(filepath=str(out),use_selection=True,use_active_scene=True,export_yup=True)
manifest={'id':'transport_boat','file':'transport_boat.glb','forward':'+Z','up':'+Y','pivot':'waterline',
          'dimensionsMeters':{'width':2.07,'length':3.8,'height':2.61},'websiteSuggestedScale':.27,
          'status':'reference-inspired first model; website integration pending','meshObjects':len(parts)}
(BASE/'public/models/farm/transport_boat.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')

# Review camera; existing original scene is preserved.
camdata=bpy.data.cameras.new('Boat_ReviewCamera'); cam=bpy.data.objects.new('Boat_ReviewCamera',camdata)
collection.objects.link(cam); cam.location=(5,-7,4.4)
cam.rotation_euler=(Vector((0,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler()
camdata.type=next(v.identifier for v in camdata.bl_rna.properties['type'].enum_items if v.identifier=='ORTHO')
camdata.ortho_scale=5.3; scene.camera=cam
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
        area.spaces.active.region_3d.view_distance=6
        area.spaces.active.region_3d.view_location=Vector((0,0,.6))
        shading=area.spaces.active.shading
        shading.color_type=next(v.identifier for v in shading.bl_rna.properties['color_type'].enum_items if v.identifier=='MATERIAL')
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'assets/blender/transport_boat.blend'))
print('SAVED',out,'Mesh objects:',len(parts))
