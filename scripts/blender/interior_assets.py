"""Editable modular maritime cottage assets. Run via interior_build.py in Blender."""
import bpy, math, random, json, bmesh
from pathlib import Path
from mathutils import Vector
import main_common as mc

BASE=Path(__file__).resolve().parents[2]
OUT=BASE/'public/models/interior'
SRC=BASE/'assets/blender/interior'
for p in [OUT,SRC,SRC/'modules',SRC/'previews']:p.mkdir(parents=True,exist_ok=True)
mc.PALETTE.update({'plaster':'e5d7bd','plaster2':'f1e5ce','plaster3':'d9c7af','oak':'88502b','oak2':'a76a34','oak3':'c38944','grain':'774420','navy':'234573','azure':'2862a0','linen':'f0e2b8','brass':'d49b37','sky':'74c6dc','sea':'2694b8','cloud':'fff5de','glow':'ffcb67','ink':'23313d'})
ASSETS={}
def family(root):return [root]+[n for child in root.children for n in family(child)]
class Module(mc.Asset):
    def __init__(self,slug,category='decor',label=None):
        super().__init__(len(ASSETS)+1,slug,label or slug)
        self.scene.name='Asset_'+slug;self.root['category']=category;self.root['modular']=True
    def done(self):
        for (part,color),(v,f) in self.buckets.items():
            me=bpy.data.meshes.new(self.slug+'_'+part+'_'+color);me.from_pydata(v,[],f);me.update()
            bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
            o=bpy.data.objects.new(self.slug+'__'+part+'__'+color,me);self.scene.collection.objects.link(o);o.parent=self.parts[part];me.materials.append(mc.mat(color))
            bevel=o.modifiers.new('Tiny crafted edge','BEVEL');bevel.width=.006;bevel.segments=1
        # Tiny engraving and nail pieces can collapse bevel corners. Bake per mesh,
        # then remove only zero-area triangles; objects and semantic parts stay separate.
        bpy.context.view_layer.update()
        deps=bpy.context.evaluated_depsgraph_get()
        for o in family(self.root):
            if o.type!='MESH':continue
            baked=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps)
            o.modifiers.clear();o.data=baked
            bm=bmesh.new();bm.from_mesh(baked);bmesh.ops.triangulate(bm,faces=list(bm.faces))
            bad=[f for f in bm.faces if f.calc_area()<1e-9]
            if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
            bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(baked);bm.free()
        ASSETS[self.slug]=self;return self

def bolt(a,x,y,z):a.cyl((x,y,z),(x,y-.012,z),.022,'metal',8)
def grain(a,x,y,z,w,d,seed=0):
    rng=random.Random(seed)
    for i in range(2):
        xx=x+rng.uniform(-w*.3,w*.3);yy=y+rng.uniform(-d*.27,d*.27)
        a.box((xx,yy,z),(.008,d*rng.uniform(.16,.36),.0018),'grain')
def floor():
    a=Module('floor_tile','architecture');rng=random.Random(14)
    for j in range(4):
        y=-.375+j*.25
        x=0
        a.box((x,y,-.045),(.994,.243,.09),['oak','oak2','oak3'][rng.randrange(3)])
        grain(a,x,y,.001,.99,.24,j*4)
        for xx in [-.42,.42]:a.cyl((xx,y,-.002),(xx,y,.003),.007,'metal',6)
    a.done()
    a=Module('foundation_block','architecture');a.box((0,0,-.19),(.99,.49,.37),'stone');a.done()
    a=Module('edge_beam','architecture');a.box((0,0,-.09),(1,.20,.20),'oak');a.box((0,-.105,-.085),(.95,.008,.02),'grain');a.done()

def masonry(a,w,h,holes=()):
    rng=random.Random(31);row=.28;cw=.45
    for j in range(math.ceil(h/row)):
        z0=j*row;z1=min(h,(j+1)*row)
        for i in range(-1,math.ceil(w/cw)+1):
            x0=max(-w/2,-w/2+i*cw+(j%2)*cw/2);x1=min(w/2,-w/2+(i+1)*cw+(j%2)*cw/2)
            if x1-x0<.02:continue
            segments=[(x0,x1,z0,z1)]
            for hx0,hx1,hz0,hz1 in holes:
                out=[]
                for u,v,b,t in segments:
                    if v<=hx0 or u>=hx1 or t<=hz0 or b>=hz1:out.append((u,v,b,t));continue
                    if u<hx0:out.append((u,hx0,b,t))
                    if v>hx1:out.append((hx1,v,b,t))
                    if b<hz0:out.append((max(u,hx0),min(v,hx1),b,hz0))
                    if t>hz1:out.append((max(u,hx0),min(v,hx1),hz1,t))
                segments=out
            for u,v,b,t in segments:
                if v-u>.01 and t-b>.01:a.box(((u+v)/2,0,(b+t)/2),(v-u-.007,.18,t-b-.009),rng.choice(['plaster','plaster','plaster2','plaster3']))

def architecture():
    floor()
    a=Module('wall_panel','architecture');masonry(a,2,3.55);a.done()
    a=Module('wall_window','architecture');masonry(a,2,3.55,[(-.66,.66,1.15,2.64)]);a.done()
    a=Module('wall_door','architecture');masonry(a,2,3.55,[(-.59,.59,0,2.40)]);a.done()
    a=Module('roof_panel','architecture')
    for i in range(8):a.box((-.875+i*.25,0,0),(.244,2,.10),'oak')
    for j in range(6):
        for i in range(8):a.box((-.875+i*.25,-.84+j*.335,.085),(.244,.37,.075),'azure' if (i+j)%3 else 'navy')
    a.done()
    a=Module('wall_low','architecture');masonry(a,1,.45);a.done()
    a=Module('timber_post','architecture');a.box((0,0,1.78),(.22,.26,3.56),'oak');a.box((0,-.139,1.8),(.028,.009,3.35),'grain');
    for z in [.24,2.68]:
        a.box((0,0,z),(.24,.28,.17),'metal')
        for x in [-.066,.066]:bolt(a,x,-.148,z)
    a.done()
    a=Module('timber_beam','architecture');a.box((0,0,0),(2,.22,.22),'oak2');a.box((0,-.116,.025),(1.95,.009,.027),'grain');a.done()
    a=Module('diagonal_brace','architecture');a.beam((0,0,0),(1,0,.65),.15,.18,'oak');a.done()
    a=Module('roof_blue_trim','architecture')
    for i in range(5):
        for row in range(2):a.box((-.4+i*.2,row*.18,.03+row*.04),(.196,.24,.095),'azure' if i%3 else 'navy')
    a.done()
    a=Module('gable_left','architecture')
    a.mesh([(-4,0,3.55),(0,0,4.9),(0,0,3.55),(-4,.18,3.55),(0,.18,4.9),(0,.18,3.55)],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],'plaster');a.done()
    a=Module('entry_frame','architecture')
    for x in [-.68,.68]:
        a.box((x,0,1.3),(.24,.26,2.6),'oak');a.box((x,0,.13),(.29,.31,.26),'stone')
    a.box((0,0,2.6),(1.68,.33,.23),'oak2');a.done()
    a=Module('blue_door','architecture');p=a.part('door_hinge',(-.57,0,0))
    for i in range(6):a.box((-.475+i*.19,0,1.19),(.182,.12,2.38),'azure' if i%3 else 'navy',p)
    for z in [.43,1.95]:
        a.box((0,-.076,z),(1.12,.04,.12),'metal',p)
        for x in [-.48,-.19,.19,.48]:a.cyl((x,-.10,z),(x,-.12,z),.025,'steel',8,part=p)
    a.box((.36,-.089,1.07),(.14,.04,.24),'wood_dark',p);a.ring((.36,-.15,1.07),.105,.066,.03,'brass','Y',p,12);a.done()
    a=Module('entry_steps','architecture')
    for i in range(3):
        for j in range(6):a.box((-.625+j*.25,-.2-i*.26,-.08-i*.15),(.241,.27,.16),'oak2' if j%2 else 'oak3')
    a.done()
    a=Module('chimney_section','architecture')
    for j in range(4):
        for i in range(2):a.box((-.18+i*.36,0,.12+j*.24),(.352,.52,.23),'stone' if (i+j)%2 else 'stone_dark')
    a.done()
    a=Module('chimney_cap','architecture')
    for x in [-.37,.37]:a.box((x,0,.12),(.17,.86,.24),'stone')
    for y in [-.34,.34]:a.box((0,y,.12),(.6,.18,.24),'stone_dark')
    a.done()

def window():
    a=Module('ocean_window','architecture')
    for x in [-.67,0,.67]:a.box((x,-.03,.76),(.075,.14,1.55),'azure')
    for z in [0,.76,1.52]:a.box((0,-.03,z),(1.43,.14,.07),'azure')
    a.box((0,-.10,-.10),(1.61,.33,.14),'oak2');a.box((0,-.03,1.64),(1.60,.20,.18),'stone_dark')
    # Embedded geometry postcard gives both windows the illustrated ocean view, no image dependency.
    a.box((0,.055,.76),(1.29,.02,1.47),'sky');a.box((0,.036,.36),(1.28,.012,.70),'sea')
    a.box((-.35,.022,.69),(.42,.012,.09),'linen');a.box((-.30,.009,.76),(.25,.01,.08),'green2')
    for i in range(7):a.box((-.54+i*.17,.014,.14+(i%3)*.13),(.10,.008,.012),'cloud')
    for x,z in [(-.38,1.22),(.3,1.1)]:
        for dx,dz,w in [(-.08,0,.24),(.04,.06,.16),(.12,-.015,.16)]:a.box((x+dx,.024,z+dz),(w,.012,.085),'cloud')
    a.beam((-.28,.003,.80),(-.25,.003,1.02),.022,color='wood')
    for dx,dz in [(-.15,.04),(.15,.04),(-.1,-.02),(.12,-.03)]:a.beam((-.25,-.003,1.02),(-.25+dx,-.003,1.02+dz),.055,.015,'green')
    a.done()

def table():
    a=Module('navigation_table','furniture')
    for x in [-.98,.98]:
        for y in [-.57,.57]:
            a.box((x,y,.61),(.15,.17,1.22),'oak');a.box((x,y,.12),(.21,.23,.15),'metal')
            bolt(a,x,y-.1,.18)
    for y in [-.6,.6]:a.box((0,y,.31),(2.1,.11,.14),'oak2')
    for x in [-1,1]:a.box((x,0,.35),(.13,1.25,.15),'oak')
    for i in range(8):
        x=-.98+i*.28;a.box((x,0,1.25),(.271,1.42,.16),'oak2' if i%3 else 'oak3');grain(a,x,0,1.332,.27,1.4,i)
        for y in [-.58,.58]:a.cyl((x,y,1.33),(x,y,1.345),.012,'metal',8)
    for y in [-.65,.65]:a.box((0,y,1.04),(2.16,.10,.25),'oak')
    a.part('drawer',(0,-.7,1.04));a.box((0,-.71,1.04),(.8,.06,.21),'oak2','drawer');a.box((0,-.76,1.04),(.20,.045,.05),'metal','drawer');a.done()
    a=Module('blue_chair','furniture')
    for x in [-.28,.28]:
        for y in [-.26,.26]:a.box((x,y,.35),(.095,.10,.70),'oak')
    a.box((0,0,.72),(.69,.66,.11),'oak2');a.box((0,-.01,.81),(.56,.54,.11),'navy')
    for x in [-.29,.29]:a.box((x,.26,1.02),(.10,.11,.74),'oak2')
    for z in [1.08,1.36]:a.box((0,.27,z),(.65,.13,.16),'oak3')
    for x in [-.18,0,.18]:a.box((x,.27,1.21),(.08,.09,.20),'oak')
    for y in [-.25,.25]:a.box((0,y,.26),(.60,.07,.08),'oak')
    a.done()
    a=Module('nightstand','furniture')
    for x in [-.28,.28]:
        for y in [-.25,.25]:a.box((x,y,.38),(.085,.085,.76),'oak')
    for z in [.2,.68]:a.box((0,0,z),(.64,.56,.13),'oak')
    a.box((0,-.28,.59),(.53,.06,.23),'oak2');a.box((0,-.326,.59),(.14,.035,.035),'metal')
    for i in range(4):a.box((-.27+i*.18,0,.81),(.17,.67,.12),'oak2' if i%2 else 'oak3')
    a.done()

def wardrobe():
    a=Module('sailor_wardrobe','furniture')
    a.box((0,.28,1.3),(1.4,.08,2.6),'wood_dark')
    for x in [-.7,.7]:a.box((x,0,1.3),(.12,.70,2.6),'oak')
    for z in [.11,2.6]:a.box((0,0,z),(1.58,.83,.17),'oak2')
    for side in [-1,1]:
        name=a.part('door_left' if side<0 else 'door_right',(side*.69,-.39,.18))
        for i in range(4):a.box((side*.35+(i-1.5)*.163,-.37,1.35),(.156,.09,2.3),'oak2' if i%2 else 'oak',name)
        for z in [.37,2.29]:
            a.box((side*.37,-.429,z),(.60,.04,.12),'metal',name)
            for x in [side*.14,side*.59]:a.cyl((x,-.46,z),(x,-.475,z),.018,'steel',8,part=name)
        a.box((side*.095,-.445,1.18),(.04,.065,.20),'metal',name)
    for i in range(5):a.box((-.6+i*.30,0,2.705),(.292,.84,.07),'oak3' if i%2 else 'oak2')
    a.done()
    a=Module('ironbound_chest','furniture')
    for i in range(7):
        x=-.60+i*.2;a.box((x,0,.43),(.192,.82,.78),'oak2' if i%2 else 'oak')
    lid=a.part('lid',(0,.44,.86))
    for i in range(7):a.box((-.6+i*.2,0,.91),(.192,.93,.13),'oak3',lid)
    for x in [-.58,.58]:
        a.box((x,0,.45),(.11,.89,.89),'metal')
        a.box((x,0,.98),(.11,.96,.07),'metal',lid)
        for z in [.13,.38,.73]:bolt(a,x,-.455,z)
    a.box((0,-.448,.75),(.16,.055,.30),'metal');a.ring((0,-.492,.66),.059,.026,.024,'dark','Y',n=10)
    a.done()
    a=Module('wall_shelf','furniture');a.box((0,0,0),(1.6,.36,.10),'oak2')
    for x in [-.54,.54]:a.beam((x,.12,-.43),(x,-.14,-.04),.08,.08,'oak');a.box((x,.14,-.2),(.11,.07,.43),'oak')
    for x in [-.68,.68]:bolt(a,x,-.19,0)
    a.done()

def rug(slug,w,d,anchor=False):
    a=Module(slug,'textile');a.box((0,0,.018),(w,d,.035),'navy')
    for k,col in [(0,'linen'),(.07,'azure'),(.13,'linen')]:
        for x in [-1,1]:a.box((x*(w/2-.07-k),0,.040+k*.02),(.032,d-.12,.003),col)
        for y in [-1,1]:a.box((0,y*(d/2-.07-k),.044+k*.02),(w-.12,.032,.003),col)
    for y in [-1,1]:
        for i in range(round(w/.075)):a.box((-w/2+.05+i*.075,y*(d/2+.047),.021),(.035,.12,.025),'linen')
    if anchor:
        a.beam((0,-.3,.046),(0,.26,.046),.035,.015,'linen');a.ring((0,.32,.048),.085,.055,.008,'linen','Z',n=12)
        a.box((0,.12,.047),(.32,.035,.01),'linen')
        for s in [-1,1]:a.beam((0,-.30,.048),(s*.22,-.17,.048),.045,.013,'linen');a.beam((s*.22,-.17,.048),(s*.23,-.03,.048),.035,.013,'linen')
    a.done()

def lamp():
    a=Module('warm_lantern','lighting')
    a.box((0,0,.22),(.20,.20,.31),'glow')
    for z in [.04,.40]:a.box((0,0,z),(.29,.29,.075),'dark')
    for x in [-.12,.12]:
        for y in [-.12,.12]:a.box((x,y,.22),(.026,.026,.34),'brass')
    a.cyl((0,0,.42),(0,0,.52),.18,'metal',4,r2=.095);a.ring((0,0,.58),.07,.043,.025,'metal','Y',n=12)
    a.done();m=mc.mat('glow');bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Emission Color'].default_value=(1,.49,.07,1);bs.inputs['Emission Strength'].default_value=4

def telescope():
    a=Module('brass_telescope','decor')
    for y in [-.27,.26]:
        a.box((0,y,.035),(.28,.22,.07),'wood_dark');a.cyl((0,y,.05),(0,y,.25),.035,'brass',10)
        a.ring((0,y,.31),.14,.10,.04,'brass','Y',n=12)
    a.cyl((0,-.60,.32),(0,.43,.38),.10,'brass',16,r2=.14)
    a.cyl((0,-.68,.315),(0,-.59,.32),.065,'metal',12)
    a.cyl((0,.431,.38),(0,.45,.381),.113,'glass',16)
    for y in [-.47,-.22,.14,.38]:a.ring((0,y,.32+(y+.60)*.058),.117 if y<0 else .145,.09,.035,'wood_dark','Y',n=16)
    a.done()

def smalls():
    a=Module('compass','decor');a.cyl((0,0,.012),(0,0,.06),.16,'brass',16);a.cyl((0,0,.062),(0,0,.072),.132,'navy',16)
    for i in range(8):
        t=i*math.pi/4;a.beam((0,0,.078),(.10*math.sin(t),.10*math.cos(t),.078),.018,.008,'linen')
    a.mesh([(-.025,0,.085),(.025,0,.085),(0,.113,.085),(0,-.113,.085)],[(0,1,2),(1,0,3)],'red');a.done()
    a=Module('sea_chart','decor');a.box((0,0,.009),(1.0,.76,.018),'linen')
    rng=random.Random(61)
    for i in range(45):
        x=rng.uniform(-.3,.29);y=rng.uniform(-.20,.22)
        if (x+.04)**2+(y*.8)**2<.075:a.box((x,y,.021+i*.0004),(.07,.06,.006),'green2' if i%3 else 'oak3')
    for i in range(6):a.box((-.39+i*.15,-.30,.022),(.025,.009,.005),'wood')
    for x,y in [(-.39,.23),(.37,-.22)]:
        for j in range(8):t=j*math.pi/4;a.beam((x,y,.024),(x+.075*math.cos(t),y+.075*math.sin(t),.024),.008,.005,'red')
    for x in [-.49,.49]:a.cyl((x,-.37,.03),(x,.37,.03),.023,'cream',8)
    a.done()
    for slug,col in [('blue_book','azure'),('green_book','green'),('red_book','red_dark')]:
        a=Module(slug,'decor');a.box((0,0,.065),(.24,.32,.10),'linen')
        for z in [.009,.12]:a.box((0,0,z),(.28,.35,.025),col)
        a.box((-.135,0,.065),(.027,.35,.11),col)
        for y in [-.125,.125]:a.box((0,y,.135),(.18,.018,.008),'brass')
        a.box((.02,0,.136),(.08,.07,.009),'linen');a.done()
    a=Module('inkwell_quill','decor');a.cyl((0,0,0),(0,0,.13),.076,'ink',10);a.ring((0,0,.14),.055,.025,.035,'metal','Z',n=10)
    a.beam((0,0,.14),(.21,.05,.49),.012,color='linen')
    for i in range(7):
        t=i/7;a.beam((.05+t*.16,.015,.22+t*.25),(.12+t*.13,.045,.25+t*.25),.036,.012,'white')
    a.done()
    a=Module('small_lockbox','decor');a.box((0,0,.13),(.33,.27,.26),'wood_dark')
    for x in [-.11,.11]:a.box((x,0,.27),(.055,.29,.03),'metal')
    a.box((0,-.145,.13),(.065,.025,.1),'brass');a.done()
    a=Module('ceramic_mug','decor');a.cyl((0,0,0),(0,0,.16),.08,'cream',12,caps=False);a.ring((0,0,.16),.086,.063,.025,'white','Z',n=12);a.ring((.10,0,.095),.06,.035,.025,'cream','Y',n=12);a.done()
    a=Module('preserve_jar','decor');a.cyl((0,0,0),(0,0,.23),.085,'food',12);a.box((0,-.085,.11),(.115,.013,.09),'linen');a.cyl((0,0,.23),(0,0,.265),.095,'brass',12);a.done()
    a=Module('cutting_board','decor');a.box((0,0,.02),(.42,.28,.04),'wood3');a.box((0,.19,.02),(.11,.17,.035),'wood2');a.done()
    a=Module('cheese_bread','decor');a.box((-.10,0,.085),(.20,.18,.17),'yellow2');
    for x,z in [(-.15,.09),(-.06,.13)]:a.cyl((x,-.095,z),(x,-.10,z),.02,'yellow',8)
    for i in range(3):a.box((.10+i*.05,0,.045),(.042,.16,.09),'cream')
    a.done()

def rope_coil():
    a=Module('rope_coil','decor')
    for layer in range(3):
        for r in [.12,.18,.24]:
            pts=[(r*math.cos(i*math.tau/32),r*math.sin(i*math.tau/32),.04+layer*.05) for i in range(33)]
            for p,q in zip(pts,pts[1:]):a.cyl(p,q,.027,'wood3',6)
    a.beam((.22,.05,.12),(.38,.21,.02),.04,color='wood3');a.done()
    a=Module('hanging_rope','decor')
    for k in range(3):
        pts=[((.19+k*.018)*math.sin(i*math.tau/32),-.03*k,.31+.28*math.cos(i*math.tau/32)) for i in range(33)]
        for p,q in zip(pts,pts[1:]):a.cyl(p,q,.025,'wood3',6)
    a.beam((0,0,.04),(.05,-.02,-.16),.045,color='wood3');a.done()

def plants():
    a=Module('ceramic_fern','decor');a.cyl((0,0,0),(0,0,.36),.20,'cream',10,r2=.26)
    for i in range(10):
        t=i*math.tau/10;a.box((.233*math.cos(t),.233*math.sin(t),.22),(.07,.07,.08),'azure')
    a.cyl((0,0,.35),(0,0,.37),.22,'soil',10)
    for j in range(9):
        t=j*math.tau/9;end=(.35*math.cos(t),.35*math.sin(t),.64+(j%3)*.16)
        a.beam((0,0,.35),end,.025,color='green')
        for k in range(3):
            d=(k+1)/3;a.box((end[0]*d,end[1]*d,.35+(end[2]-.35)*d),(.18,.13,.09),'green2' if j%2 else 'green')
    a.done()
    a=Module('trailing_ivy','decor');mc.plant(a,(0,0,0),.65)
    for j in range(3):
        for i in range(8):
            x=(j-1)*.11+math.sin(i*.8+j)*.035;y=-.16-i*.026;z=.15-i*.105
            a.box((x,y,z),(.12,.10,.10),'leaf2' if (i+j)%3 else 'green');
            if i:a.beam((x,y,z),(x,y+.026,z+.12),.012,color='green')
    a.done()
    a=Module('small_pot','decor');mc.plant(a,(0,0,0),.53);a.done()

def picture():
    a=Module('island_picture','decor')
    a.box((0,0,.4),(1.02,.055,.78),'sky');a.box((0,-.033,.23),(.99,.015,.41),'sea')
    for x in [-.54,.54]:a.box((x,-.045,.40),(.065,.07,.89),'oak3')
    for z in [-.03,.83]:a.box((0,-.045,z),(1.13,.07,.065),'oak2')
    a.box((.08,-.047,.3),(.69,.016,.12),'linen');a.box((.12,-.06,.37),(.39,.012,.13),'green2')
    for x,z in [(-.29,.64),(.22,.7)]:a.box((x,-.035,z),(.25,.01,.065),'cloud')
    for x in [.03,.24]:
        a.beam((x,-.073,.39),(x+.025,-.073,.59),.02,color='wood')
        for dx,dz in [(-.1,.01),(.1,.03),(-.08,-.03)]:a.beam((x+.025,-.08,.59),(x+dx,-.08,.59+dz),.044,.015,'green')
    a.done()
    a=Module('mini_sailboat','decor');a.box((0,0,.06),(.45,.16,.10),'azure');a.box((0,0,.125),(.38,.14,.04),'linen')
    a.beam((0,0,.1),(0,0,.67),.02,color='oak')
    a.mesh([(-.015,0,.63),(-.015,0,.20),(-.24,0,.20),(-.015,.009,.63),(-.015,.009,.20),(-.24,.009,.20)],[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'white')
    a.mesh([(.025,0,.52),(.025,0,.2),(.18,0,.2),(.025,.009,.52),(.025,.009,.2),(.18,.009,.2)],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],'cream');a.done()
    a=Module('striped_fish','decor')
    for i in range(7):
        z=.1+i*.07;w=.12*math.sin((i+.6)/8*math.pi);a.box((0,0,z),(w*2,.075,.067),'azure' if i%2 else 'linen')
    a.box((0,0,.04),(.19,.07,.07),'azure');a.box((-.065,-.044,.50),(.025,.018,.025),'ink');a.done()

def build_new():
    architecture();window();table();wardrobe();rug('bed_rug',2.9,2.5,True);rug('table_rug',2.9,2.5);rug('hearth_rug',1.55,.70);rug('entry_mat',1.25,.6);lamp();telescope();smalls();rope_coil();plants();picture()
    a=Module('wooden_barrel','decor');mc.barrel(a,(0,0,0),1.3);a.done()
