"""Deterministic mesh authoring utilities; Blender 5.2, no third-party assets."""
import bpy, math, json, random, contextlib, io
from pathlib import Path
from mathutils import Vector, Matrix

BASE=Path('D:/Projects/D_vibe_coding/瓶中沧海')
SOURCE=BASE/'assets/blender/main'
OUTPUT=BASE/'public/models/main'
PREVIEWS=SOURCE/'previews'
for d in (SOURCE,OUTPUT,PREVIEWS): d.mkdir(parents=True,exist_ok=True)
PALETTE={
 'red':'bd422f','red2':'e2563d','red_dark':'85382f','cream':'eee3c7','white':'fff3d7',
 'yellow':'e7aa26','yellow2':'ffcb43','green':'39764b','green2':'619b51','green_dark':'245744',
 'wood':'956039','wood2':'b78047','wood3':'cf9958','wood_dark':'60432e','endgrain':'d4a16a',
 'rubber':'242b30','tread':'343b3e','metal':'49565a','steel':'9ca5a0','dark':'26333a',
 'glass':'326173','glass2':'538193','slate':'456663','slate2':'597b71',
 'tile':'ab5833','tile2':'c77843','stone':'9d9986','stone2':'b8b09a','stone_dark':'716f65',
 'blue':'46668a','blue2':'7091ae','blue3':'344f70','pink':'d8927e','black':'33302d',
 'wool':'e8dab5','wool2':'f6e9cc','hay':'dba93a','leaf':'5a8240','leaf2':'87a953',
 'fire':'f08a26','fire2':'ffd365','food':'9c4132','soil':'6d5035'
}

def mat(key):
    name='Main_'+key
    m=bpy.data.materials.get(name)
    if m: return m
    h=PALETTE[key];rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*linear,1)
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=(*linear,1)
    bs.inputs['Roughness'].default_value=.73 if key not in ['glass','steel'] else .32
    bs.inputs['Metallic'].default_value=.35 if key in ['metal','steel'] else 0
    if key in ['fire','fire2']:
        bs.inputs['Emission Color'].default_value=(*linear,1);bs.inputs['Emission Strength'].default_value=.7
    return m

class Asset:
    def __init__(self,number,slug,label,pivot='ground'):
        self.number=number;self.slug=slug;self.label=label;self.pivot=pivot;self.buckets={};self.parts={};self.notes=[]
        self.scene=bpy.data.scenes.new(f'Main_{number:02d}_{slug}')
        bpy.context.window.scene=self.scene
        self.root=bpy.data.objects.new(slug,None);self.scene.collection.objects.link(self.root)
        self.root['asset_id']=slug;self.root['reference_number']=number;self.root['label']=label
        self.root['forward']='Blender -Y / glTF +Z';self.root['origin_convention']=pivot
        self.parts['body']=self.root
    def part(self,name,loc=(0,0,0)):
        if name not in self.parts:
            o=bpy.data.objects.new(self.slug+'__'+name,None);self.scene.collection.objects.link(o);o.parent=self.root;o.location=loc
            o['part_id']=name
            self.parts[name]=o
        return name
    def mesh(self,verts,faces,color='wood',part='body'):
        origin=self.parts[part].location if part!='body' else Vector((0,0,0))
        key=(part,color);v,f=self.buckets.setdefault(key,([],[]));offset=len(v)
        v.extend([tuple(Vector(p)-origin) for p in verts]);f.extend([tuple(i+offset for i in face) for face in faces])
    def box(self,p,size,color='wood',part='body',rot=None):
        x,y,z=[s/2 for s in size]
        v=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
        if rot is not None:
            from mathutils import Euler
            r=Euler(rot).to_matrix();v=[r@Vector(q) for q in v]
        v=[Vector(p)+Vector(q) for q in v]
        self.mesh(v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],color,part)
    def beam(self,a,b,width,depth=None,color='wood',part='body'):
        a,b=Vector(a),Vector(b);r=(b-a).to_track_quat('Z','Y').to_euler()
        self.box((a+b)/2,(width,depth or width,(b-a).length),color,part,r)
    def cyl(self,a,b,r,color='metal',n=12,r2=None,part='body',caps=True):
        a,b=Vector(a),Vector(b);q=(b-a).to_track_quat('Z','Y');r2=r if r2 is None else r2
        v=[a+q@Vector((r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),0)) for i in range(n)]
        if r2==0:
            v.append(b);f=[(i,(i+1)%n,n) for i in range(n)]
            if caps:f.append(tuple(reversed(range(n))))
            self.mesh(v,f,color,part);return
        v += [b+q@Vector((r2*math.cos(i*math.tau/n),r2*math.sin(i*math.tau/n),0)) for i in range(n)]
        f=[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        if caps:f.extend([tuple(reversed(range(n))),tuple(range(n,2*n))])
        self.mesh(v,f,color,part)
    def ring(self,center,outer,inner,depth,color='metal',axis='Y',part='body',n=16):
        q=Vector((1,0,0) if axis=='X' else (0,1,0) if axis=='Y' else (0,0,1)).to_track_quat('Z','Y')
        c=Vector(center)
        v=[c+q@Vector((r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),z)) for z,r in [(-depth/2,outer),(depth/2,outer),(-depth/2,inner),(depth/2,inner)] for i in range(n)]
        f=[]
        for i in range(n):
            j=(i+1)%n;f.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
        self.mesh(v,f,color,part)
    def finish(self):
        import bmesh
        for (part,color),(v,f) in self.buckets.items():
            me=bpy.data.meshes.new(self.slug+'_'+part+'_'+color);me.from_pydata(v,[],f);me.update()
            bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
            o=bpy.data.objects.new(part+'__'+color,me);self.scene.collection.objects.link(o);o.parent=self.parts[part]
            me.materials.append(mat(color))
        self.scene.view_layers.update();bpy.context.view_layer.update()
        points=[o.matrix_world@Vector(c) for o in self.scene.objects if o.type=='MESH' for c in o.bound_box]
        self.lo=Vector([min(p[i] for p in points) for i in range(3)]);self.hi=Vector([max(p[i] for p in points) for i in range(3)])
        triangles=0
        for o in self.scene.objects:
            if o.type=='MESH':o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
        for o in self.scene.objects:o.select_set(True)
        bpy.context.view_layer.objects.active=self.root
        with contextlib.redirect_stdout(io.StringIO()):
            bpy.ops.export_scene.gltf(filepath=str(OUTPUT/(self.slug+'.glb')),use_selection=True,use_active_scene=True,export_yup=True,export_extras=True)
        self.info={'number':self.number,'id':self.slug,'label':self.label,'file':self.slug+'.glb','blend':self.slug+'.blend',
            'dimensions':{'width':round(self.hi.x-self.lo.x,4),'height':round(self.hi.z-self.lo.z,4),'depth':round(self.hi.y-self.lo.y,4)},
            'boundsBlender':{'min':list(self.lo),'max':list(self.hi)},'up':'+Y','forward':'+Z','units':'meters','pivot':self.pivot,
            'parts':list(self.parts),'triangles':triangles,'meshCount':len(self.buckets),'bytes':(OUTPUT/(self.slug+'.glb')).stat().st_size,
            'notes':self.notes,'animation':'semantic pivot nodes only; no animation clips','license':'Original authored geometry; no third-party model dependencies'}
        (OUTPUT/(self.slug+'.json')).write_text(json.dumps(self.info,ensure_ascii=False,indent=2),encoding='utf-8')
        self.stage()
        bpy.data.libraries.write(str(SOURCE/(self.slug+'.blend')),{self.scene},fake_user=True)
        print(f'{self.number:02d} {self.slug}: {triangles} triangles / {len(self.buckets)} meshes')
        return self.info
    def stage(self):
        s=self.scene;center=(self.lo+self.hi)/2;extent=max(self.hi-self.lo)
        d=bpy.data.cameras.new(self.slug+'_camera');cam=bpy.data.objects.new('ReviewCamera',d);s.collection.objects.link(cam)
        cam.location=center+Vector((1.15,-1.6,1.0))*extent
        cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
        d.type=next(v.identifier for v in d.bl_rna.properties['type'].enum_items if v.identifier=='ORTHO');d.ortho_scale=extent*1.58;s.camera=cam
        try:s.render.engine='BLENDER_WORKBENCH'
        except TypeError: pass
        sh=s.display.shading
        for prop,val in [('light','STUDIO'),('color_type','MATERIAL'),('background_type','WORLD'),('cavity_type','BOTH')]:
            valid=[v.identifier for v in sh.bl_rna.properties[prop].enum_items]
            if val in valid:setattr(sh,prop,val)
        sh.show_shadows=True;sh.show_cavity=True;sh.show_specular_highlight=True
        sh.curvature_ridge_factor=1.1;sh.curvature_valley_factor=.8
        s.world=bpy.data.worlds.new(self.slug+'_world');s.world.color=(.19,.26,.31)
        s.render.resolution_x=720;s.render.resolution_y=720;s.render.resolution_percentage=100
        s.render.image_settings.file_format=next(v.identifier for v in s.render.image_settings.bl_rna.properties['file_format'].enum_items if v.identifier=='PNG')
        s.render.film_transparent=False
        s.render.filepath=str(PREVIEWS/(self.slug+'.png'))
        for o in s.objects:o.select_set(False)

def wheel(a,x,y,z,r,width=.28,hub='cream',name='wheel'):
    p=a.part(name,(x,y,z));sgn=1 if x>=0 else -1
    a.cyl((x-width/2,y,z),(x+width/2,y,z),r*.93,'rubber',16,part=p)
    a.cyl((x-width*.54,y,z),(x+width*.54,y,z),r*.53,hub,12,part=p)
    a.cyl((x+sgn*width*.55,y,z),(x+sgn*width*.63,y,z),r*.22,'metal',10,part=p)
    for i in range(16):
        t=i*math.tau/16
        for dx in [-width*.24,width*.24]:
            a.box((x+dx,y+math.sin(t)*r*.95,z+math.cos(t)*r*.95),(width*.56,r*.23,r*.12),'tread',p,(t,0,.27*(1 if dx>0 else -1)))
    for i in range(6):
        t=i*math.tau/6
        a.cyl((x+sgn*width*.55,y+math.sin(t)*r*.32,z+math.cos(t)*r*.32),(x+sgn*width*.59,y+math.sin(t)*r*.32,z+math.cos(t)*r*.32),r*.045,'steel',6,part=p)

def barrel(a,p,scale=1):
    x,y,z=p;r=.23*scale;h=.55*scale
    a.cyl((x,y,z),(x,y,z+h),r,'wood2',12)
    for i in range(12):
        t=math.tau*i/12;a.beam((x+r*math.cos(t),y+r*math.sin(t),z+.02*scale),(x+r*math.cos(t),y+r*math.sin(t),z+h-.02*scale),.013*scale,color='wood_dark')
    for dz in [.08,.43]:a.ring((x,y,z+dz*scale),r*1.035,r*.95,.055*scale,'metal','Z')
    a.cyl((x,y,z+h),(x,y,z+h+.02*scale),r*.9,'wood3',12)

def crate(a,p,size=.55):
    x,y,z=p
    a.box((x,y,z+size/2),(size,size,size),'wood')
    for i in range(4):
        off=(i-1.5)*size/4
        a.box((x+off,y,z+size+.01),(size/4-.012,size,.035),'wood2')
        for yy in [-1,1]:a.box((x+off,y+yy*(size/2+.009),z+size/2),(size/4-.015,.03,size),'wood2')
    for yy in [-1,1]:
        for zz in [.1,.9]:a.box((x,y+yy*(size/2+.026),z+size*zz),(size+.025,.04,.06),'wood3')

def lantern(a,p,scale=1):
    x,y,z=p;w=.17*scale;h=.28*scale
    a.box((x,y,z+h/2),(w,w,h),'yellow2')
    for dz in [0,h]:a.box((x,y,z+dz),(w*1.3,w*1.3,.04*scale),'dark')
    for dx in [-w/2,w/2]:
        for dy in [-w/2,w/2]:a.beam((x+dx,y+dy,z),(x+dx,y+dy,z+h),.022*scale,color='dark')
    a.cyl((x,y,z+h),(x,y,z+h+.08*scale),w*.7,'dark',4,r2=0)
    a.ring((x,y,z+h+.1*scale),.055*scale,.033*scale,.022*scale,'dark','Y',n=8)

def fence(a,x,y,length=2,angle=0,gate=False):
    def q(u,z):return (x+u*math.cos(angle),y+u*math.sin(angle),z)
    for u in [-length/2,length/2]:
        a.box(q(u,.54),(.16,.16,1.08),'wood');a.box(q(u,1.10),(.20,.20,.08),'wood2')
        for z in [.35,.78]:a.cyl(Vector(q(u,z))+Vector((0,-.088,0)),Vector(q(u,z))+Vector((0,-.105,0)),.025,'metal',6)
    for z in [.34,.77]:a.beam(q(-length/2,z),q(length/2,z),.12,.16,'wood2')
    if gate:
        a.beam(q(-length/2+.12,.24),q(length/2-.12,.9),.085,.09,'wood3')
        for u in [-.6,-.2,.2,.6]:a.box(q(u,.55),(.095,.09,.81),'wood',rot=(0,0,angle))

def roof(a,cx,cy,width,depth,eave,ridge,color='slate',tile=False):
    half=width/2;rise=ridge-eave;angle=math.atan2(rise,half);slope=math.hypot(half,rise)
    for side in [-1,1]:
        a.box((cx+side*half/2,cy,(eave+ridge)/2),(slope,depth,.13),color,rot=(0,side*angle,0))
        if tile:
            rows=max(3,int(slope/.3));cols=max(4,int(depth/.34))
            for row in range(rows):
                t=(row+.5)/rows
                for col in range(cols):
                    yy=cy-depth/2+(col+.5)*depth/cols
                    a.box((cx+side*half*t,yy,ridge-rise*t+.085),(slope/rows*1.05,depth/cols-.018,.065),'tile2' if (row+col)%3==0 else 'tile',rot=(0,side*angle,0))
        else:
            for i in range(int(depth/.28)+1):
                yy=cy-depth/2+i*depth/int(depth/.28)
                a.beam((cx,yy,ridge+.07),(cx+side*half,yy,eave+.07),.035,.03,'slate2')
    a.beam((cx,cy-depth/2-.03,ridge+.1),(cx,cy+depth/2+.03,ridge+.1),.14,.14,'tile2' if tile else 'slate2')

def gable(a,cx,cy,width,depth,eave,ridge,color):
    h=width/2
    v=[(cx-h,cy-depth/2,eave),(cx+h,cy-depth/2,eave),(cx,cy-depth/2,ridge),(cx-h,cy+depth/2,eave),(cx+h,cy+depth/2,eave),(cx,cy+depth/2,ridge)]
    a.mesh(v,[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],color)

def window(a,x,y,z,w=.65,h=.75,shutters=False):
    a.box((x,y,z),(w+.14,.1,h+.14),'wood_dark')
    a.box((x,y-.06,z),(w,.035,h),'glass')
    for xx in [x-w/2,x,x+w/2]:a.box((xx,y-.09,z),(.045,.045,h+.08),'cream')
    for zz in [z-h/2,z,z+h/2]:a.box((x,y-.09,zz),(w+.08,.045,.045),'cream')
    a.box((x,y-.12,z-h/2-.07),(w+.22,.23,.08),'wood2')
    if shutters:
        for side in [-1,1]:
            a.box((x+side*(w*.75+.08),y,z),(w*.43,.1,h+.06),'green')
            for i in range(5):a.box((x+side*(w*.75+.08),y-.06,z+(i-2)*h/5),(w*.4,.05,.04),'green2')

def plant(a,p,scale=.5):
    x,y,z=p
    a.cyl((x,y,z),(x,y,z+.3*scale),.21*scale,'tile',8,r2=.26*scale)
    for dx,dy,h in [(-.18,0,.65),(.13,.1,.8),(0,-.14,.9)]:
        a.beam((x,y,z+.25*scale),(x+dx*scale,y+dy*scale,z+h*scale),.025*scale,color='green')
        a.box((x+dx*scale,y+dy*scale,z+h*scale),(.3*scale,.27*scale,.18*scale),'leaf2')

def component(a,name,origin,build):
    """Author with world coordinates, then keep a named reusable local component."""
    previous=a.buckets;a.buckets={};build();fresh=a.buckets;a.buckets=previous
    a.part(name,origin)
    for (part,color),(verts,faces) in fresh.items():
        if part=='body':a.mesh(verts,faces,color,name)
        else:
            v,f=a.buckets.setdefault((part,color),([],[]));off=len(v);v.extend(verts);f.extend([tuple(i+off for i in face) for face in faces])

