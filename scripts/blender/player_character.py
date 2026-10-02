"""Original low-poly protagonist from the user supplied model sheet.

Run build() in the connected Blender. Preserves existing scenes and the open
project; writes a separate editable source using bpy.data.libraries.write.
Blender -Y is forward; exported glTF is +Z forward and +Y up.
"""
import contextlib
import io
import json
import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

BASE = Path(__file__).resolve().parents[2]
SOURCE = BASE / 'assets/blender/character'
OUTPUT = BASE / 'public/models/character'
ART = BASE / 'artifacts/character'
PALETTE = {
    'skin': 'f2be98', 'skin_shadow': 'd79774', 'blush': 'e6a185',
    'hair': '49352f', 'hair_light': '60463b', 'hair_dark': '352a28',
    'straw': 'e5ae6b', 'straw_light': 'f4c589', 'straw_shadow': 'c99354',
    'shirt': 'eee4cf', 'shirt_shadow': 'd2c5af', 'collar': 'fff3de',
    'denim': '41617c', 'denim_light': '54748e', 'denim_dark': '334c62',
    'cuff': '9caab0', 'leather': '785237', 'leather_light': '956946',
    'leather_dark': '543b2a', 'sole': '443326', 'brass': 'c79a53',
    'eye': '302b29', 'eye_white': 'fff1d9', 'smile': '955f47',
}


def material(key):
    name = 'Character_' + key
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
    rgb = [int(PALETTE[key][i:i+2], 16) / 255 for i in (0, 2, 4)]
    linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m.diffuse_color = (*rgb, 1)
    shader = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = .86
    shader.inputs['Metallic'].default_value = .2 if key == 'brass' else 0
    return m


class Character:
    def __init__(self):
        self.scene = bpy.data.scenes.new('PlayerCharacter_Authoring')
        bpy.context.window.scene = self.scene
        self.root = bpy.data.objects.new('PlayerCharacter', None)
        self.scene.collection.objects.link(self.root)
        self.root['asset_id'] = 'player_character'
        self.root['forward'] = 'Blender -Y / glTF +Z'
        self.root['origin_convention'] = 'feet at ground'
        self.parts = {'Root': self.root}
        self.origins = {'Root': Vector((0, 0, 0))}
        self.buckets = {}

    def part(self, name, origin, parent='Root'):
        o = bpy.data.objects.new(name, None)
        self.scene.collection.objects.link(o)
        o.parent = self.parts[parent]
        self.origins[name] = Vector(origin)
        o.location = self.origins[name] - self.origins[parent]
        o['part_id'] = name
        self.parts[name] = o

    def mesh(self, vertices, faces, color, part):
        v, f = self.buckets.setdefault((part, color), ([], []))
        offset = len(v)
        v.extend(tuple(Vector(p) - self.origins[part]) for p in vertices)
        f.extend(tuple(index + offset for index in face) for face in faces)

    def box(self, center, size, color, part, bevel=0):
        x, y, z = size
        hx, hy, hz = x/2, y/2, z/2
        b = min(bevel, hx*.4, hy*.4, hz*.4)
        def outline(a, c):
            q = min(b, a*.4, c*.4)
            return [(-a+q,-c), (a-q,-c), (a,-c+q), (a,c-q),
                    (a-q,c), (-a+q,c), (-a,c-q), (-a,-c+q)]
        rings = ([(-hz, hx-b, hy-b), (-hz+b, hx, hy),
                  (hz-b, hx, hy), (hz, hx-b, hy-b)] if b >= .025 else
                 [(-hz,hx,hy),(hz,hx,hy)])
        if not b:
            rings = [(-hz,hx,hy),(hz,hx,hy)]
            profile = [(-hx,-hy),(hx,-hy),(hx,hy),(-hx,hy)]
            n = 4
            vertices = [(center[0]+u,center[1]+v,center[2]+h)
                        for h,_,_ in rings for u,v in profile]
        else:
            n = 8
            vertices = [(center[0]+u,center[1]+v,center[2]+h)
                        for h,a,c in rings for u,v in outline(a,c)]
        faces = [tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))]
        for r in range(len(rings)-1):
            for i in range(n):
                j = (i+1)%n
                faces.append((r*n+i,r*n+j,(r+1)*n+j,(r+1)*n+i))
        self.mesh(vertices,faces,color,part)

    def beam(self, start, end, width, depth, color, part):
        a, b = Vector(start), Vector(end)
        rotation = (b-a).to_track_quat('Z','Y')
        vertices = [(a+b)/2 + rotation @ Vector((x*width/2,y*depth/2,z*(b-a).length/2))
                    for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                                  (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        self.mesh(vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],color,part)

    def disc(self, center, rx, ry, height, color, part, n=16, top=1):
        vertices = [(center[0]+rx*r*math.cos(i*math.tau/n),
                     center[1]+ry*r*math.sin(i*math.tau/n),center[2]+h)
                    for h,r in [(-height/2,1),(height/2,top)] for i in range(n)]
        faces = [tuple(reversed(range(n))),tuple(range(n,2*n))]
        faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        self.mesh(vertices,faces,color,part)

    def buckle(self, x, y, z, w, h, part):
        self.box((x,y,z),(w,.01,h),'brass',part,.003)
        self.box((x,y-.007,z),(w*.55,.007,h*.52),'leather_dark',part)

    def finish(self):
        for (part,color),(vertices,faces) in self.buckets.items():
            mesh = bpy.data.meshes.new('Character_'+part+'_'+color)
            mesh.from_pydata(vertices,[],faces)
            mesh.update()
            bm = bmesh.new()
            bm.from_mesh(mesh)
            bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
            bm.to_mesh(mesh)
            bm.free()
            mesh.materials.append(material(color))
            obj = bpy.data.objects.new(part+'_'+color,mesh)
            self.scene.collection.objects.link(obj)
            obj.parent = self.parts[part]
        bpy.context.view_layer.update()


def geometry(a):
    a.part('Hips',(0,0,.72))
    a.part('Spine',(0,0,.86),'Hips')
    a.part('Head',(0,0,1.09),'Spine')
    a.part('Hat',(0,0,1.425),'Head')
    a.part('Backpack',(0,.20,.94),'Spine')
    a.box((0,0,.75),(.32,.215,.19),'denim','Hips',.025)
    a.box((0,-.003,.952),(.342,.24,.32),'shirt','Spine',.028)
    a.box((0,0,1.092),(.10,.10,.095),'skin','Head',.012)
    a.box((0,-.023,1.247),(.416,.345,.35),'skin','Head',.035)
    # Layered silhouette under the hat, with irregular locks rather than a helmet.
    a.box((0,.031,1.365),(.447,.345,.18),'hair','Head',.03)
    a.box((0,.123,1.285),(.423,.142,.25),'hair_dark','Head',.024)
    for i in range(5):
        a.box(((i-2)*.077,.190,1.194+(i%2)*.026),(.090,.056,.083),'hair' if i%2 else 'hair_light','Head',.007)
    for side in [-1,1]:
        a.box((side*.206,.023,1.288),(.078,.21,.19),'hair','Head',.013)
        a.box((side*.209,-.097,1.227),(.050,.083,.14),'hair_dark','Head',.008)
        a.box((side*.229,-.018,1.209),(.062,.089,.095),'skin','Head',.016)
        a.box((side*.251,-.055,1.214),(.024,.008,.052),'skin_shadow','Head',.005)
    for i,(x,z,h) in enumerate([(-.155,1.350,.105),(-.090,1.360,.10),(-.021,1.378,.063),(.048,1.356,.11),(.126,1.365,.089)]):
        a.box((x,-.184,z),(.082,.054,h),'hair_light' if i in [0,3] else 'hair','Head',.009)
    for x in [-.090,.090]:
        a.box((x,-.200,1.252),(.052,.007,.076),'eye_white','Head',.002)
        a.box((x+.006,-.206,1.251),(.036,.008,.070),'eye','Head',.002)
        a.box((x-.001,-.212,1.274),(.010,.004,.014),'eye_white','Head')
        a.box((x,-.204,1.307),(.058,.009,.015),'hair_dark','Head',.002)
        a.box((x*1.24,-.200,1.196),(.042,.004,.015),'blush','Head',.002)
    a.box((0,-.205,1.215),(.032,.023,.028),'skin','Head',.006)
    for start,end in [((-.035,-.200,1.155),(-.019,-.204,1.150)),
                      ((-.019,-.204,1.150),(.019,-.204,1.150)),
                      ((.019,-.204,1.150),(.035,-.200,1.155))]:
        a.beam(start,end,.006,.006,'smile','Head')
    # Brim and crown use a deliberately faceted, warm straw palette.
    a.disc((0,0,1.426),.337,.281,.026,'straw_shadow','Hat',20)
    a.disc((0,0,1.445),.333,.278,.028,'straw_light','Hat',20,.94)
    a.disc((0,0,1.503),.245,.214,.117,'straw','Hat',16,.92)
    a.disc((0,0,1.576),.225,.197,.046,'straw_light','Hat',16,.94)
    a.disc((0,0,1.491),.248,.217,.042,'denim','Hat',16,.97)
    a.box((.18,-.169,1.495),(.048,.018,.036),'denim_light','Hat',.004)
    # Collar, dungaree bib, stitched pocket and shoulder straps.
    for side in [-1,1]:
        v=[(side*.032,-.131,1.114),(side*.115,-.133,1.093),(side*.063,-.143,1.040)]
        vertices=v+[(x,y+.016,z) for x,y,z in v]
        a.mesh(vertices,[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'collar','Spine')
        a.beam((side*.113,-.139,1.022),(side*.116,-.040,1.121),.046,.014,'denim','Spine')
        a.beam((side*.116,-.040,1.121),(side*.116,.107,1.095),.046,.014,'denim','Spine')
        a.beam((side*.116,.107,1.095),(side*.113,.139,.891),.045,.014,'denim_dark','Spine')
        a.box((side*.109,-.156,1.011),(.024,.015,.026),'brass','Spine',.005)
        a.box((side*.175,0,.793),(.041,.25,.052),'leather','Hips',.005)
        a.box((side*.178,-.135,.793),(.034,.012,.035),'brass','Hips',.003)
    a.box((0,-.137,.929),(.258,.032,.222),'denim','Spine',.010)
    a.box((0,-.157,.924),(.145,.013,.094),'denim_dark','Spine',.008)
    a.box((0,-.166,.929),(.133,.008,.075),'denim_light','Spine',.006)
    a.box((0,-.172,.967),(.127,.004,.008),'cuff','Spine')
    a.box((0,-.125,.786),(.288,.02,.032),'denim_dark','Hips',.003)
    for side,suffix in [(-1,'L'),(1,'R')]:
        x=side*.106
        a.part('Thigh_'+suffix,(x,0,.715),'Hips')
        a.part('Shin_'+suffix,(x,0,.438),'Thigh_'+suffix)
        a.part('Foot_'+suffix,(x,0,.158),'Shin_'+suffix)
        a.box((x,0,.579),(.148,.169,.288),'denim','Thigh_'+suffix,.018)
        a.box((x,-.006,.308),(.137,.145,.279),'denim','Shin_'+suffix,.013)
        a.box((x,-.085,.548),(.117,.008,.123),'denim_light','Thigh_'+suffix,.005)
        a.box((x,0,.187),(.158,.164,.061),'cuff','Shin_'+suffix,.005)
        a.box((x,0,.190),(.143,.169,.018),'denim_light','Shin_'+suffix)
        a.box((x,-.031,.049),(.171,.242,.086),'sole','Foot_'+suffix,.010)
        a.box((x,-.037,.092),(.166,.218,.094),'leather','Foot_'+suffix,.013)
        a.box((x,.022,.150),(.141,.143,.112),'leather_dark','Foot_'+suffix,.012)
        a.box((x,-.055,.146),(.103,.124,.075),'leather_light','Foot_'+suffix,.010)
        a.box((x,-.104,.144),(.075,.012,.012),'leather_dark','Foot_'+suffix)
        a.box((x,-.070,.174),(.071,.012,.012),'leather_dark','Foot_'+suffix)
        a.part('Arm_'+suffix,(side*.224,0,1.071),'Spine')
        a.part('Forearm_'+suffix,(side*.239,0,.855),'Arm_'+suffix)
        a.part('Hand_'+suffix,(side*.246,-.006,.667),'Forearm_'+suffix)
        a.box((side*.229,0,1.018),(.175,.210,.160),'shirt','Arm_'+suffix,.020)
        a.box((side*.230,0,.955),(.180,.217,.041),'shirt_shadow','Arm_'+suffix,.005)
        a.box((side*.238,0,.915),(.108,.123,.122),'skin','Arm_'+suffix,.013)
        a.box((side*.245,0,.766),(.103,.116,.191),'skin','Forearm_'+suffix,.012)
        a.box((side*.246,-.006,.641),(.103,.112,.125),'skin','Hand_'+suffix,.014)
        a.box((side*.203,-.029,.657),(.039,.067,.070),'skin','Hand_'+suffix,.009)
        for dy in [-.037,0,.037]:
            a.box((side*.247,dy-.006,.593),(.075,.029,.022),'skin_shadow','Hand_'+suffix,.004)
    # Backpack silhouette, folded flap, pockets and two brass clasps.
    a.box((0,.199,.923),(.286,.153,.312),'leather','Backpack',.027)
    a.box((0,.202,1.047),(.305,.158,.095),'leather_light','Backpack',.020)
    a.box((0,.285,.914),(.258,.033,.190),'leather_dark','Backpack',.014)
    for side in [-1,1]:
        a.box((side*.076,.286,.935),(.041,.029,.26),'leather_light','Backpack',.006)
        # Back-facing clasps: render on the backpack's outer +Y surface.
        a.box((side*.076,.305,.958),(.051,.011,.048),'brass','Backpack',.004)
        a.box((side*.076,.312,.958),(.027,.008,.025),'leather_dark','Backpack')
        a.box((side*.157,.207,.861),(.055,.128,.128),'leather_light','Backpack',.010)
        a.beam((side*.078,.130,1.075),(side*.046,.152,1.129),.024,.027,'leather_dark','Backpack')
    a.beam((-.046,.152,1.129),(.046,.152,1.129),.024,.027,'leather_dark','Backpack')


def enum_set(owner, property_name, value):
    valid = {v.identifier for v in owner.bl_rna.properties[property_name].enum_items}
    if value in valid:
        setattr(owner,property_name,value)


def proportions(a):
    """Balanced stylised proportions: legs 0.62, torso 0.50, head/hat 0.48m."""
    def height(z):
        if z <= .72:
            return z * (.62/.72)
        if z <= 1.09:
            return .62 + (z-.72)*(.50/.37)
        return 1.12 + (z-1.09)*(.48/.509)
    def point(p,part):
        return Vector((p.x*(.92 if part in ('Head','Hat') else 1),p.y*(.92 if part in ('Head','Hat') else 1),height(p.z)))
    old={name:origin.copy() for name,origin in a.origins.items()}
    for part in a.parts:
        a.origins[part]=point(old[part],part)
    for (part,color),(vertices,faces) in a.buckets.items():
        vertices[:]=[tuple(point(Vector(p)+old[part],part)-a.origins[part]) for p in vertices]
    for part,obj in a.parts.items():
        if part=='Root':
            continue
        parent=next(name for name,value in a.parts.items() if value==obj.parent)
        obj.location=a.origins[part]-a.origins[parent]


def review(a):
    scene=a.scene
    center=Vector((0,0,.80))
    camera_data=bpy.data.cameras.new('CharacterReviewCamera')
    camera=bpy.data.objects.new('CharacterReviewCamera',camera_data)
    scene.collection.objects.link(camera)
    camera.location=(2.8,-4.5,2.4)
    camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    enum_set(camera_data,'type','ORTHO')
    camera_data.ortho_scale=2.06
    scene.camera=camera
    scene.world=bpy.data.worlds.new('CharacterReviewWorld')
    scene.world.color=(.20,.24,.24)
    try:
        scene.render.engine='BLENDER_EEVEE'
    except TypeError:
        pass
    for key,value in [('light','STUDIO'),('color_type','MATERIAL'),('background_type','WORLD'),('cavity_type','BOTH')]:
        enum_set(scene.display.shading,key,value)
    scene.display.shading.show_shadows=True
    scene.display.shading.show_cavity=True
    scene.display.shading.show_specular_highlight=True
    scene.world.use_nodes=True
    background=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
    background.inputs['Color'].default_value=(.20,.24,.24,1)
    background.inputs['Strength'].default_value=.6
    for name,position,energy,size in [('Key',(2,-4,4),300,4),('Fill',(-3,-2,2),100,3),('Rim',(1,3,3),200,3)]:
        light_data=bpy.data.lights.new('CharacterReview'+name,'AREA')
        light_data.energy=energy
        light_data.size=size
        light=bpy.data.objects.new(light_data.name,light_data)
        scene.collection.objects.link(light)
        light.location=position
        light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
    enum_set(scene.view_settings,'view_transform','Standard')
    scene.render.resolution_x=900
    scene.render.resolution_y=900
    scene.render.resolution_percentage=100
    enum_set(scene.render.image_settings,'file_format','PNG')
    scene.render.filepath=str(ART/'character-front.png')
    # Leave a clean character-focused viewport; current farm scenes remain intact.
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_location=center
            area.spaces.active.region_3d.view_distance=2.3
            area.spaces.active.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
            enum_set(area.spaces.active.shading,'type','SOLID')
            enum_set(area.spaces.active.shading,'color_type','MATERIAL')


def build():
    for folder in (SOURCE,OUTPUT,ART):
        folder.mkdir(parents=True,exist_ok=True)
    a=Character()
    geometry(a)
    proportions(a)
    a.finish()
    meshes=[o for o in a.scene.objects if o.type=='MESH']
    points=[o.matrix_world@Vector(corner) for o in meshes for corner in o.bound_box]
    lo=[min(p[i] for p in points) for i in range(3)]
    hi=[max(p[i] for p in points) for i in range(3)]
    a.root.location.z-=lo[2]
    hi[2]-=lo[2]
    lo[2]=0
    bpy.context.view_layer.update()
    triangles=0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles+=len(obj.data.loop_triangles)
        obj.select_set(True)
    for obj in a.parts.values():
        obj.select_set(True)
    bpy.context.view_layer.objects.active=a.root
    with contextlib.redirect_stdout(io.StringIO()):
        bpy.ops.export_scene.gltf(filepath=str(OUTPUT/'player_character.glb'),
                                  use_selection=True,use_active_scene=True,export_yup=True,export_extras=True)
    data={'id':'player_character','name':'瓶中沧海主角','file':'player_character.glb',
          'units':'meters','up':'+Y','forward':'+Z','pivot':'feet',
          'dimensions':{'width':hi[0]-lo[0],'height':hi[2]-lo[2],'depth':hi[1]-lo[1]},
          'boundsBlender':{'min':lo,'max':hi},'triangles':triangles,'meshCount':len(meshes),
          'parts':list(a.parts)[1:],'gameScale':.33,'seatAnchor':'Hips',
          'license':'Original authored geometry based on user supplied reference',
          'animation':'Semantic pivot hierarchy; runtime idle / walk / run / seated poses'}
    (OUTPUT/'player_character.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    review(a)
    bpy.data.libraries.write(str(SOURCE/'player_character.blend'),{a.scene},fake_user=True)
    print(json.dumps(data,ensure_ascii=False))
    return a


def render_views(a):
    scene=a.scene
    camera=scene.camera
    for name,position in [('front',(2.8,-4.5,2.4)),('back',(-2.8,4.5,2.4)),('portrait',(0,-4.5,1.8))]:
        target=Vector((0,0,1.20 if name=='portrait' else .80))
        camera.location=position
        camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.ortho_scale=1.05 if name=='portrait' else 2.06
        scene.render.filepath=str(ART/('character-'+name+'.png'))
        bpy.ops.render.render(write_still=True)
    camera.location=(2.8,-4.5,2.4)
    camera.rotation_euler=(Vector((0,0,.80))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=2.06
