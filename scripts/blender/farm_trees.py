"""Original reference-inspired voxel trees. Run inside Blender; retain user scenes.

Solid foliage uses exposed voxel faces, merged by palette instead of hundreds
of cube objects. Game ground/pasture/fences remain separate from tree assets.
"""
import contextlib
import json
import math
import random
from pathlib import Path
import bpy
from mathutils import Vector
import farm_common as farm

BASE = Path(__file__).resolve().parents[2]
SOURCE = BASE / 'assets/blender/farm/trees'
OUTPUT = BASE / 'public/models/farm/trees'
PREVIEWS = SOURCE / 'previews'
for directory in (SOURCE, OUTPUT, PREVIEWS):
    directory.mkdir(parents=True, exist_ok=True)

farm.PALETTE.update({'tree_leaf_shadow':'285b48', 'tree_leaf_mid':'62843d',
    'tree_leaf_light':'94b449', 'tree_leaf_sun':'b5c954',
    'tree_pine_dark':'20584e', 'tree_pine_mid':'327c68', 'tree_pine_light':'559c79',
    'tree_blossom_dark':'d97491', 'tree_blossom_mid':'f3a4b6', 'tree_blossom_light':'ffd2d2'})
LEAVES = ('tree_leaf_shadow', 'tree_leaf_mid', 'tree_leaf_light', 'tree_leaf_sun')
PINE = ('tree_pine_dark', 'tree_pine_mid', 'tree_pine_light')
PINK = ('tree_blossom_dark', 'tree_blossom_mid', 'tree_blossom_light')
SPECS = [('tree_broadleaf','阔叶树'), ('tree_poplar','杨树'), ('tree_apple','苹果树'),
         ('tree_pear','梨树'), ('tree_sapling','果树幼苗'), ('tree_pine','松树'),
         ('tree_willow','垂柳'), ('tree_blossom','花树')]
AUTHORED = {}

@contextlib.contextmanager
def export_paths():
    previous = farm.SOURCE, farm.OUTPUT, farm.PREVIEWS
    farm.SOURCE, farm.OUTPUT, farm.PREVIEWS = SOURCE, OUTPUT, PREVIEWS
    try:
        yield
    finally:
        farm.SOURCE, farm.OUTPUT, farm.PREVIEWS = previous

def branch(a,start,end,width,color='wood',tip=None):
    a.cyl(start,end,width,color,7,r2=tip if tip is not None else width*.48)

def trunk(a,height=1.9,width=.23,pale=False):
    color='cream' if pale else 'wood'
    branch(a,(0,0,0),(.06,-.02,height*.58),width,color,width*.77)
    branch(a,(.06,-.02,height*.58),(-.03,.04,height),width*.77,color,width*.36)
    for i in range(5):
        angle=i*math.tau/5+.2;reach=width*2.4
        branch(a,(math.cos(angle)*reach,math.sin(angle)*reach,.055),(.03,0,.42),width*.37,'wood2' if not pale else 'stone2',width*.22)
    for angle in [.25,2.6,4.3]:
        r=width*.83
        branch(a,(math.cos(angle)*r,math.sin(angle)*r,.15),
               (math.cos(angle)*r*.65,math.sin(angle)*r*.65,height*.6),.025,'wood_dark',.016)
    if pale:
        for i in range(7):
            z=.23+i*.24
            a.box((-.09 if i%2 else .10,-.11,z),(.12,.025,.045),'wood_dark')

def foliage(a,clumps,step=.18,palette=LEAVES):
    """Union of irregular ellipsoid lobes with closed exterior faces only."""
    occupied=set()
    for x,y,z,rx,ry,rz in clumps:
        for ix in range(math.floor((x-rx)/step),math.ceil((x+rx)/step)+1):
            for iy in range(math.floor((y-ry)/step),math.ceil((y+ry)/step)+1):
                for iz in range(math.floor((z-rz)/step),math.ceil((z+rz)/step)+1):
                    qx,qy,qz=(ix+.5)*step,(iy+.5)*step,(iz+.5)*step
                    ripple=.055*math.sin(ix*1.7+iy*.9+iz*.6)
                    if ((qx-x)/rx)**2+((qy-y)/ry)**2+((qz-z)/rz)**2 <= 1+ripple:
                        occupied.add((ix,iy,iz))
    low=min(p[2] for p in occupied);high=max(p[2] for p in occupied)
    faces=[((1,0,0),[(1,0,0),(1,1,0),(1,1,1),(1,0,1)]),
           ((-1,0,0),[(0,1,0),(0,0,0),(0,0,1),(0,1,1)]),
           ((0,1,0),[(1,1,0),(0,1,0),(0,1,1),(1,1,1)]),
           ((0,-1,0),[(0,0,0),(1,0,0),(1,0,1),(0,0,1)]),
           ((0,0,1),[(0,0,1),(1,0,1),(1,1,1),(0,1,1)]),
           ((0,0,-1),[(0,1,0),(1,1,0),(1,0,0),(0,0,0)])]
    for ix,iy,iz in sorted(occupied):
        # Coherent warm-lit patches, rather than random checkerboard leaves.
        light=.40+.32*(iz-low)/max(1,high-low)+.18*math.sin(ix*.48-iy*.36)+.10*math.cos(iy*.67+iz*.55)
        color=palette[min(len(palette)-1,max(0,int(light*len(palette))))]
        for (dx,dy,dz),corners in faces:
            if (ix+dx,iy+dy,iz+dz) not in occupied:
                a.mesh([((ix+x)*step,(iy+y)*step,(iz+z)*step) for x,y,z in corners],[(0,1,2,3)],color,'canopy')
    # Small overlapping leaf tufts break broad flat patches without alpha cards.
    # They protrude from the shell, so no coplanar surfaces or flickering overlays.
    candidates=[p for p in sorted(occupied) if (p[0],p[1]-1,p[2]) not in occupied or (p[0],p[1]+1,p[2]) not in occupied]
    stride=max(1,len(candidates)//32)
    for i,(ix,iy,iz) in enumerate(candidates[::stride][:32]):
        side=-1 if (ix,iy-1,iz) not in occupied else 1
        a.box(((ix+.5)*step,(iy+.5+side*.48)*step,(iz+.58)*step),
              (step*1.6,step*.85,step*.80),palette[1+i%(len(palette)-1)],'canopy')

def rounded_clumps(wide=1,height=0):
    return [(x*wide,y*wide,z+height,rx*wide,ry*wide,rz) for x,y,z,rx,ry,rz in [
        (-.92,.10,2.19,.68,.67,.61),(.87,.16,2.33,.75,.68,.67),
        (.08,-.82,2.51,.86,.70,.71),(-.23,.70,2.72,.78,.74,.72),
        (-.54,-.14,2.92,.91,.78,.72),(.61,-.01,2.97,.80,.69,.65),
        (0,.12,3.38,.73,.68,.62)]]

def crown_branches(a,wide=1):
    for x,y,z in [(-.92,.12,2.2),(.87,.16,2.3),(.05,-.72,2.6),(-.2,.65,2.75)]:
        branch(a,(.02,0,1.12),(x*wide*.8,y*wide*.8,z),.14,'wood2',.045)
        branch(a,(x*wide*.52,y*wide*.52,z-.38),(x*wide,y*wide,z+.15),.065,'wood',.025)

def fruit(a,p,pear=False):
    x,y,z=p;main='yellow2' if pear else 'red2';shade='yellow' if pear else 'red';s=.15
    a.box((x,y,z),(.34,.30,.30),main,'fruit')
    a.box((x,y,z-.08),(.30,.28,.15),shade,'fruit')
    a.box((x,y,z+.13),(.18 if pear else .28,.19 if pear else .25,.17 if pear else .10),main,'fruit')
    if pear:a.box((x,y,z+.23),(.11,.11,.10),'yellow2','fruit')
    a.box((x-.07,y-.135,z+.05),(.07,.014,.08),'cream','fruit')
    branch(a,(x,y,z+.16 if not pear else z+.28),(x+.02,y,z+.25 if not pear else z+.36),.017,'wood_dark',.012)
    a.box((x+.08,y,z+.25 if not pear else z+.34),(.16,.075,.035),'leaf2','fruit',rot=(0,.22,-.3))

def fruit_surface(p,clumps):
    x,y,z=p;side=-1 if y<0 else 1;edges=[]
    for cx,cy,cz,rx,ry,rz in clumps:
        distance=((x-cx)/rx)**2+((z-cz)/rz)**2
        if distance<1:edges.append(cy+side*ry*math.sqrt(1-distance))
    if edges:y=(min(edges) if side<0 else max(edges))+side*.12
    return x,y,z

def build_tree(index):
    slug,label=SPECS[index]
    a=farm.Asset(60+index,slug,label);a.part('canopy');a.part('fruit')
    if index in [0,2,3,7]:
        trunk(a,1.9,.24 if index==0 else .21);crown_branches(a)
        foliage(a,rounded_clumps(wide=1.05 if index==0 else .93),.18,PINK if index==7 else LEAVES)
        if index in [2,3]:
            for p in [(-1.06,-.48,2.22),(.93,-.50,2.56),(-.42,-1.13,2.60),
                      (.37,-.90,3.12),(-.87,-.62,3.17),(.97,.52,2.29),(-.58,.92,2.66),(.2,.72,3.21)]:
                fruit(a,fruit_surface(p,rounded_clumps(wide=.93)),index==3)
        if index==7:
            for i,(x,y,z) in enumerate([(-1.2,-.32,2.3),(-.5,-.87,2.7),(.32,-1.02,2.7),(.97,-.54,2.9),(-.65,-.56,3.5),(.28,-.55,3.7),(1.1,.33,2.5),(-.5,.88,2.98)]):
                for dx,dz in [(0,0),(-.13,0),(.13,0),(0,.13),(0,-.13)]:
                    a.box((x+dx,y-.03,z+dz),(.19,.045,.19),'tree_blossom_light' if i%2 else 'tree_blossom_mid','canopy')
                a.box((x,y-.063,z),(.065,.02,.065),'yellow2','fruit')
    elif index==1:
        trunk(a,3.35,.16,True)
        clumps=[]
        for i in range(5):
            z=1.5+i*.53;width=.63 if i<3 else .55-(i-3)*.12
            clumps.append((.10*math.sin(i*2),0,z,width,.54,.62))
            for angle in [.1,2.2,4.4]:
                x,y=math.cos(angle)*width*.55,math.sin(angle)*width*.55
                branch(a,(0,0,z-.6),(x,y,z+.12),.055,'cream',.018)
                clumps.append((x,y,z-.04,width*.56,.41,.53))
        foliage(a,clumps,.16)
    elif index==4:
        trunk(a,1.42,.08)
        for i,(x,y,z) in enumerate([(-.40,-.08,.67),(.39,.08,.94),(-.29,.04,1.29),(.16,-.1,1.66)]):
            branch(a,(0,0,z-.3),(x,y,z),.035,'wood2',.014)
            foliage(a,[(x,y,z,.32,.24,.22)],.10)
        # The nursery stake is narrow; no baked grass plate or fence base.
        a.box((.16,.10,.65),(.055,.055,1.30),'wood2')
        a.box((.06,.10,.70),(.27,.065,.035),'hay')
    elif index==5:
        trunk(a,3.8,.19)
        clumps=[]
        for layer in range(5):
            z=1.04+layer*.57;r=1.20-layer*.21
            clumps.append((0,0,z+.20,r*.75,r*.75,.37))
            for i in range(7):
                angle=i*math.tau/7+layer*.47;x,y=math.cos(angle)*r*.65,math.sin(angle)*r*.65
                branch(a,(0,0,z+.14),(x,y,z-.06),.05,'wood_dark',.017)
                clumps.append((x,y,z,r*.53,r*.45,.27))
        clumps.append((0,0,3.90,.24,.23,.43));foliage(a,clumps,.16,PINE)
    elif index==6:
        trunk(a,2.2,.25)
        clumps=[]
        for i in range(8):
            angle=i*math.tau/8;x,y=math.cos(angle)*1.12,math.sin(angle)*1.12
            branch(a,(0,0,1.45),(x*.8,y*.8,2.75),.12,'wood2',.038)
            clumps.append((x*.63,y*.63,3.04,.76,.67,.68))
            for strand in range(3):
                angle2=angle+(strand-1)*.17;r=1.33+.06*strand
                for segment in range(7+strand%2):
                    z=3.04-segment*.25;x2=math.cos(angle2)*(r+segment*.023);y2=math.sin(angle2)*(r+segment*.023)
                    clumps.append((x2,y2,z,.18,.17,.24))
        clumps.append((0,0,3.27,.95,.88,.65));foliage(a,clumps,.17)
    a.notes=['Reference-inspired original geometry; decorative only, no harvesting state.',
             'Exposed voxel canopy; shared palette; separate canopy/fruit semantic nodes.',
             'No baked ground plate, fence, lights or collision mesh.']
    # Sloping root cylinders can extend a few millimetres below their centres.
    # Normalize actual vertices before export so every species has a true ground pivot.
    lowest=min(v[2] for vertices,_ in a.buckets.values() for v in vertices)
    for key,(vertices,faces) in a.buckets.items():
        a.buckets[key]=([(x,y,z-lowest) for x,y,z in vertices],faces)
    with export_paths():
        info=a.finish()
    AUTHORED[slug]=a
    return info

def build_all():
    infos=[build_tree(i) for i in range(len(SPECS))]
    radii=[.24,.16,.21,.21,.10,.19,.25,.21]
    catalog={info['id']:{'label':info['label'],'file':'trees/'+info['file'],
             'trunkRadius':radii[i], 'boundsBlender':info['boundsBlender'],
             'triangles':info['triangles']} for i,info in enumerate(infos)}
    (BASE/'src/worlds/farm/farmTreeCatalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUTPUT/'manifest.json').write_text(json.dumps({'version':1,'assets':infos},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return infos

def gallery():
    scene=bpy.data.scenes.new('Farm_Tree_Reference_Gallery');bpy.context.window.scene=scene
    for i,(slug,label) in enumerate(SPECS):
        source=AUTHORED[slug];offset=Vector(((i%4-1.5)*5,(i//4)*6,0))
        clones={}
        for obj in source.scene.objects:
            if obj.type not in ['MESH','EMPTY']:continue
            copy=obj.copy();scene.collection.objects.link(copy);clones[obj]=copy
        for obj,copy in clones.items():
            if obj.parent in clones:copy.parent=clones[obj.parent]
            elif obj.parent is None:copy.location+=offset
    bpy.context.view_layer.update()
    data=bpy.data.cameras.new('TreeGalleryCamera');cam=bpy.data.objects.new('TreeGalleryCamera',data);scene.collection.objects.link(cam)
    cam.location=(13,-23,17);cam.rotation_euler=(Vector((0,3,1.7))-cam.location).to_track_quat('-Z','Y').to_euler()
    data.type=next(i.identifier for i in data.bl_rna.properties['type'].enum_items if i.identifier=='ORTHO');data.ortho_scale=24;scene.camera=cam
    try:scene.render.engine='BLENDER_WORKBENCH'
    except TypeError:pass
    for prop,value in [('color_type','MATERIAL'),('light','STUDIO'),('background_type','WORLD'),('cavity_type','BOTH')]:
        if value in [i.identifier for i in scene.display.shading.bl_rna.properties[prop].enum_items]:setattr(scene.display.shading,prop,value)
    scene.display.shading.show_cavity=True;scene.display.shading.show_shadows=True
    scene.world=bpy.data.worlds.new('TreeGalleryWorld');scene.world.color=(.62,.68,.69)
    scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.render.filepath=str(PREVIEWS/'farm_tree_gallery.png')
    bpy.data.libraries.write(str(SOURCE/'farm_tree_gallery.blend'),{scene},fake_user=True)
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_location=Vector((0,2.5,1.8))
            area.spaces.active.region_3d.view_distance=24
            area.spaces.active.region_3d.view_rotation=(Vector((0,2.5,1.8))-Vector((10,-20,17))).to_track_quat('-Z','Y')
            shade=area.spaces.active.shading
            for prop,value in [('color_type','MATERIAL'),('light','STUDIO')]:
                if value in [item.identifier for item in shade.bl_rna.properties[prop].enum_items]:setattr(shade,prop,value)
            shade.show_cavity=True
    return scene.name

def render_previews():
    previous=bpy.context.window.scene
    try:
        for a in AUTHORED.values():
            bpy.context.window.scene=a.scene
            bpy.ops.render.render(write_still=True)
    finally:
        bpy.context.window.scene=previous
