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


def enum_set(owner, property_name, value):
    valid = {v.identifier for v in owner.bl_rna.properties[property_name].enum_items}
    if value in valid:
        setattr(owner,property_name,value)


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
    import runpy
    appearance=runpy.run_path(str(Path(__file__).with_name("player_appearance.py")))
    appearance["geometry"](a)
    appearance["proportions"](a)
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
    for name,position in [('front',(2.8,-4.5,2.4)),('back',(-2.8,4.5,2.4)),('side',(4.5,0,1.0)),('portrait',(0,-4.5,1.8))]:
        target=Vector((0,0,1.20 if name=='portrait' else .80))
        camera.location=position
        camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.ortho_scale=1.05 if name=='portrait' else 2.06
        scene.render.filepath=str(ART/('character-'+name+'.png'))
        bpy.ops.render.render(write_still=True)
    camera.location=(2.8,-4.5,2.4)
    camera.rotation_euler=(Vector((0,0,.80))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=2.06

if __name__ == "__main__":
    render_views(build())
