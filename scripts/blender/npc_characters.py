"""Four original modular NPCs. Background Blender only; no game integration."""
import bpy, bmesh, json, math, runpy, contextlib, io
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve().parent
BASE=HERE.parents[1]
SRC=BASE/'assets/blender/npcs'
OUT=BASE/'public/models/npcs'
ART=BASE/'artifacts/npcs'
core=runpy.run_path(str(HERE/'player_character.py'))
appearance=runpy.run_path(str(HERE/'player_appearance.py'))
Character=core['Character'];loft=appearance['loft']
EXTRA={'navy':'303c59','navy_light':'465371','navy_dark':'252e43','teal':'277485','teal_light':'438b97',
       'green':'627541','green_light':'81914f','green_dark':'425a31','cream':'dfceb0',
       'rope':'c6a572','red':'a94e35','red_light':'ca7251','gold':'d6a14c','silver':'949b9a',
       'whitehair':'ede3ce','whitehair_shadow':'c6bfae','greyhair':'565452','greyhair_light':'74716a',
       'glow':'ffd27a','glass':'d59c46','black':'292722','fishblue':'456f8e','leaf':'608637','yellow':'e4ad49'}
core['PALETTE'].update(EXTRA)
STYLES={
 'lighthouse_keeper':{'hair':'ddd5c0','hair_dark':'bab5a9','hair_light':'f4ead4','denim':'36435f','denim_light':'4b5870','denim_dark':'2c354c','skin':'e7ad7e','shirt':'dfd1b6'},
 'merchant_captain':{'hair':'573a2b','hair_dark':'39291f','hair_light':'71503a','denim':'35435e','denim_light':'49566d','denim_dark':'29364a','skin':'e3a378','shirt':'eee0c3'},
 'fisherman':{'hair':'48443e','hair_dark':'363634','hair_light':'656159','denim':'365f7a','denim_light':'4e7e91','denim_dark':'2c4557','skin':'e1a16d','shirt':'277485','shirt_shadow':'bfb6a1'},
 'farm_steward':{'denim':'637840','denim_light':'899554','denim_dark':'465f35','skin':'f0b586','shirt':'eee0c7','cuff':'b48145'},
}
NAMES={'lighthouse_keeper':'灯塔老人','merchant_captain':'商船老板','fisherman':'渔夫','farm_steward':'农场管理员'}


def part(a,name,origin=(0,0,.8),parent='Spine'):
    a.part(name,origin,parent);return name


def erase(a,*parts):
    for key in list(a.buckets):
        if key[0] in parts:del a.buckets[key]


def ring(a,c,rx,rz,t,col,p,n=16):
    for i in range(n):
        u=i*math.tau/n;v=(i+1)*math.tau/n
        a.beam((c[0]+rx*math.cos(u),c[1],c[2]+rz*math.sin(u)),(c[0]+rx*math.cos(v),c[1],c[2]+rz*math.sin(v)),t,t,col,p)


def badge(a,c,scale,p,kind='anchor',back=False):
    x,y,z=c;s=scale
    def b(dx,dz,w,h,col):a.box((x+dx*s,y,z+dz*s),(w*s,.009,h*s),col,p)
    if kind=='lighthouse':
        b(0,0,.33,.80,'cream');b(0,.06,.36,.12,'red');b(0,-.20,.39,.12,'red');b(0,.39,.46,.12,'navy');b(0,.50,.19,.13,'gold');b(0,-.45,.60,.07,'gold')
    elif kind=='leaf':
        b(0,-.14,.10,.35,'leaf');b(-.11,.07,.24,.22,'leaf');b(.13,.21,.24,.27,'leaf')
    elif kind=='fish':
        b(0,0,.52,.27,'fishblue');b(.32,0,.17,.39,'fishblue');b(-.13,.06,.045,.05,'cream')
    else:
        ring(a,(x,y,z+.33*s),.095*s,.095*s,.045*s,'gold',p,8)
        b(0,-.02,.075,.56,'gold');b(0,.15,.4,.065,'gold');b(0,-.28,.40,.07,'gold')
        for side in [-1,1]:
            a.beam((x+side*.17*s,y,z-.28*s),(x+side*.28*s,y,z-.13*s),.067*s,.01,'gold',p)


def book(a,p,c,size=.22,anchor=True):
    x,y,z=c
    a.box((x,y,z),(size,.070,size*1.27),'leather_dark',p,.01)
    a.box((x,y-.040,z),(size*.82,.019,size*1.13),'leather',p,.004)
    a.box((x+size*.46,y+.003,z),(size*.055,.050,size*1.06),'cream',p)
    for sx in [-1,1]:
        for sz in [-1,1]:a.box((x+sx*size*.39,y-.054,z+sz*size*.52),(.033,.008,.024),'gold',p)
    badge(a,(x,y-.058,z),size*.66,p,'anchor' if anchor else 'lighthouse')


def pouch(a,p,x,y,z,color='leather'):
    a.box((x,y,z),(.12,.074,.15),color,p,.017)
    a.box((x,y-.041,z+.045),(.128,.013,.045),'leather_light',p,.004)
    a.buckle(x,y-.053,z+.02,.034,.033,p)


def scarf(a,color='red'):
    p=part(a,'Neckerchief',(0,0,1.08))
    for side in [-1,1]:a.beam((side*.13,.029,1.109),(0,-.132,1.037),.046,.03,color,p)
    a.box((0,-.139,1.043),(.068,.04,.057),color,p,.008)
    a.beam((-.015,-.141,1.031),(-.040,-.143,.925),.044,.022,color,p)
    a.beam((.015,-.14,1.029),(.045,-.136,.954),.044,.022,color,p)


def cap(a,old=False):
    erase(a,'Hat')
    a.disc((0,-.015,1.447),.263,.223,.073,'navy_dark','Hat',16)
    a.disc((0,.006,1.495),.285,.236,.108,'navy','Hat',16,.94)
    a.disc((0,.006,1.551),.265,.220,.018,'navy_light','Hat',16,.92)
    a.disc((0,-.110,1.414),.278,.215,.023,'navy_dark','Hat',16,.93)
    a.disc((0,-.013,1.446),.268,.23,.018,'gold','Hat',16)
    for side in [-1,1]:a.box((side*.242,-.13,1.446),(.032,.028,.03),'gold','Hat',.004)
    badge(a,(0,-.236,1.513),.10,'Hat','lighthouse' if old else 'anchor')
    if not old:
        p=part(a,'HatFeather',(.25,.035,1.52),'Hat')
        a.beam((.23,.04,1.48),(.35,.035,1.70),.008,.009,'cream',p)
        for i in range(5):
            a.beam((.25+i*.020,.037,1.51+i*.038),(.31+i*.014,.037,1.54+i*.038),.028,.019,'cream',p)


def beard(a,old=False):
    p=part(a,'Beard',(0,-.14,1.22),'Head');col='whitehair' if old else 'greyhair' if a.kind=='fisherman' else 'hair'
    shade='whitehair_shadow' if old else 'greyhair_light' if a.kind=='fisherman' else 'hair_light'
    for side in [-1,1]:
        for i in range(3):a.box((side*(.155+i*.015),-.151,1.20+i*.035),(.065,.105,.080),col,p,.008)
        a.beam((side*.018,-.221,1.235),(side*.111,-.224,1.214),.039,.043,col,p)
    if old:
        for row in range(3):
            for i in range(5-row):
                a.box(((i-(4-row)/2)*.062,-.214+row*.008,1.17-row*.041),(.078,.072,.077),shade if (i+row)%4==0 else col,p,.009)
        for side in [-1,1]:a.box((side*.087,-.214,1.335),(.098,.025,.032),'whitehair','Head',.006)
        a.box((0,-.227,1.267),(.083,.062,.049),'blush','Head',.008)
    else:
        for i in range(5):a.box(((i-2)*.055,-.192,1.169-abs(i-2)*.002),(.067,.062,.064),col if i%2 else shade,p,.006)
        a.box((0,-.214,1.205),(.107,.014,.032),'black',p,.003)
        a.box((0,-.224,1.214),(.087,.009,.011),'collar',p)


def coat(a,long=False):
    # Replace bib with separate open vest fronts and a back panel.
    for key in list(a.buckets):
        if key[0]=='Spine' and key[1] in ['denim','denim_light','denim_dark','brass','leather','leather_dark']:del a.buckets[key]
    p=part(a,'Coat',(0,0,.96));end=.58 if long else .79
    for side in [-1,1]:
        loft(a,[(end,.070,.030,side*.126,-.109),(.83,.063,.031,side*.118,-.122),
                (1.056,.039,.026,side*.152,-.093)],'navy',p,.16)
        a.beam((side*.16,-.11,1.066),(side*.072,-.160,.901),.044,.022,'navy_light',p)
        a.beam((side*.070,-.149,.90),(side*.077,-.145,end+.02),.014,.011,'gold' if long else 'navy_light',p)
        if long:a.box((side*.126,-.143,end+.025),(.125,.009,.022),'gold',p)
        a.box((side*.138,.034,.87),(.054,.214,.26),'navy',p,.006)
    a.box((0,.124,.938),(.307,.032,.305),'navy',p,.014)
    if long:
        for side in [-1,1]:a.box((side*.085,.130,.682),(.147,.030,.234),'navy',p,.008)
    badge(a,(0,.147,.956),.205,p,'anchor' if long else 'lighthouse',True)


def gloves(a):
    for s in ['L','R']:
        p='Hand_'+s
        for key in list(a.buckets):
            if key[0]==p:
                verts,faces=a.buckets.pop(key);a.buckets[(p,'leather_dark')]=(verts,faces)
        side=-1 if s=='L' else 1
        a.box((side*.291,-.003,.704),(.102,.111,.038),'leather',p,.008)
        for i in range(3):a.box((side*(.277+i*.023),-.051,.636),(.022,.030,.027),'skin',p,.005)


def belt(a):
    p=part(a,'UtilityBelt',(0,0,.80),'Hips')
    a.box((0,-.125,.800),(.342,.032,.056),'leather',p,.007);a.buckle(0,-.149,.8,.075,.066,p)
    for side in [-1,1]:pouch(a,p,side*.191,-.065,.73)
    return p


def watch(a,p,c):
    x,y,z=c;ring(a,c,.055,.067,.012,'gold',p)
    a.box(c,(.084,.015,.103),'cream',p,.01)
    for side in [-1,1]:
        a.beam((x,y-.013,z),(x+side*.036,y-.013,z),.008,.005,'navy',p)
        a.beam((x,y-.013,z),(x,y-.013,z+side*.048),.008,.005,'navy',p)
    a.box((x,y-.020,z),(.015,.007,.015),'gold',p)
    ring(a,(x,y,z+.085),.014,.018,.006,'gold',p,8)


def keeper(a):
    cap(a,True);beard(a,True);coat(a)
    b=belt(a)
    for i in range(19):
        x=-.165+i*.018;z=.814+.005*math.sin(i*2.5)
        a.box((x,-.151,z),(.023,.025,.022),'rope',b,.004)
    for x in [-.020,.014]:a.beam((x,-.158,.80),(x-.025,-.16,.65),.016,.016,'rope',b)
    watch(a,b,(.115,-.170,.690))
    p=part(a,'Pipe',(-.17,-.25,1.22),'Head')
    a.beam((-.10,-.244,1.22),(-.263,-.29,1.185),.019,.02,'leather_dark',p)
    a.disc((-.284,-.292,1.195),.040,.039,.070,'leather',p,8,.93)
    a.disc((-.284,-.292,1.234),.029,.028,.005,'black',p,8)
    # Backpack, rolled charts and detached journal stay individually selectable.
    p=part(a,'Charts',(0,.20,1.11),'Backpack')
    for x,z in [(-.085,1.15),(0,1.19),(.08,1.13)]:
        a.disc((x,.335,z),.032,.031,.24,'cream',p,8);a.disc((x,.335,z+.122),.022,.022,.004,'leather_light',p,8)
    badge(a,(0,.338,.944),.18,'Backpack','lighthouse')
    ring(a,(.201,.24,.893),.047,.092,.014,'rope','Backpack',14)
    p=part(a,'Journal',(.17,.10,.80));book(a,p,(.193,.08,.78),.15,False)
    p=part(a,'Lantern',(-.30,0,.64),'Hand_L')
    ring(a,(-.305,-.008,.580),.037,.057,.010,'leather_dark',p,10)
    a.box((-.305,-.008,.41),(.137,.128,.194),'glass',p,.008)
    a.box((-.305,-.078,.413),(.064,.004,.11),'glow',p)
    for z in [.304,.506]:a.box((-.305,-.008,z),(.161,.150,.034),'leather_dark',p,.008)
    for x in [-.374,-.236]:
        for y in [-.071,.054]:a.beam((x,y,.32),(x,y,.496),.015,.016,'leather_dark',p)
    a.disc((-.305,-.008,.536),.055,.052,.034,'leather',p,8,.65)


def merchant(a):
    erase(a,'Backpack');cap(a);beard(a);coat(a,True);scarf(a);gloves(a);b=belt(a)
    p=part(a,'TradeLedger',(-.30,-.085,.83),'Hand_L');book(a,p,(-.31,-.090,.814),.212)
    p=part(a,'CoinPurse',(.218,-.075,.72),'Hips');pouch(a,p,.226,-.079,.708)
    for i in range(4):a.disc((.214+(i%2)*.025,-.095+(i//2)*.028,.80),.019,.019,.007,'gold',p,10)
    for i in range(5):ring(a,(.16+i*.014,-.151,.816-i*.021),.013,.018,.005,'gold',b,8)
    watch(a,b,(-.205,-.15,.714))
    badge(a,(.118,-.156,1.016),.086,'Coat')
    # Tall boot cuffs and brass buckles distinguish him from the others.
    for side,s in [(-1,'L'),(1,'R')]:
        a.box((side*.098,.01,.247),(.164,.178,.062),'leather','Shin_'+s,.009)
        a.buckle(side*.098,-.083,.247,.050,.045,'Shin_'+s)


def fish(a,p,c,s=.1):
    x,y,z=c
    a.box((x,y,z),(s*.60,s*.22,s),'fishblue',p,.01)
    a.box((x+s*.09,y-s*.13,z),(s*.31,.012,s*.79),'cream',p,.005)
    a.box((x,y,z-s*.58),(s*.62,s*.22,s*.20),'fishblue',p,.004)
    a.box((x-s*.12,y-s*.15,z+s*.23),(s*.105,.005,s*.11),'black',p)


def fisher(a):
    erase(a,'Backpack');beard(a);gloves(a);b=belt(a)
    # Worn patchwork bucket hat, broader and lower than the captain caps.
    erase(a,'Hat');a.disc((0,0,1.427),.326,.28,.039,'cream','Hat',16,.88)
    a.disc((0,.012,1.498),.24,.21,.126,'cream','Hat',16,.82)
    a.disc((0,.009,1.465),.246,.215,.041,'denim','Hat',16,.96)
    for i in [9,11,13]:
        verts=[]
        for z,r in [(1.477,.942),(1.550,.838)]:
            for angle in [i*math.tau/16,(i+1)*math.tau/16]:
                verts.append((.241*r*math.cos(angle),.012+.211*r*math.sin(angle),z))
        a.mesh(verts,[(0,1,3,2)],'denim','Hat')
    badge(a,(.18,-.199,1.464),.104,'Hat','fish')
    # Teal open overshirt and weathered apron.
    for side in [-1,1]:
        a.beam((side*.15,-.123,1.071),(side*.117,-.155,.97),.048,.025,'teal_light','Spine')
        a.box((side*.158,-.049,.684),(.062,.14,.239),'teal','Spine',.006)
    p=part(a,'FishingApron',(0,-.13,.91))
    a.box((0,-.137,.92),(.264,.024,.24),'denim',p,.007)
    a.box((0,-.128,.681),(.33,.024,.236),'denim',p,.010)
    a.box((0,-.155,.930),(.155,.009,.095),'teal_light',p,.004);badge(a,(0,-.162,.93),.16,p,'fish')
    for x,z in [(-.113,.613),(.111,.72),(.057,.607)]:a.box((x,-.147,z),(.047,.012,.033),'cream',p,.003)
    p=part(a,'FishCharm',(-.20,-.1,.73),'Hips');fish(a,p,(-.222,-.127,.676),.118)
    p=part(a,'FishingNet',(0,.16,.93))
    # Real rope lattice draped over the back; no opaque net texture.
    levels=[(.64,.047,.030),(.69,.096,.065),(.76,.120,.080),(.83,.107,.071),(.90,.075,.053),(.97,.032,.025)]
    for j,(z,rx,ry) in enumerate(levels):
        for k in range(12):
            theta=k*math.tau/12+(j%2)*math.pi/12
            c=(rx*math.cos(theta),.230+ry*math.sin(theta),z)
            if j<len(levels)-1:
                zz,xx,yy=levels[j+1]
                for shift in [-1,1]:
                    t=theta+shift*math.pi/12
                    a.beam(c,(xx*math.cos(t),.230+yy*math.sin(t),zz),.006,.006,'rope',p)
    ring(a,(0,.23,1.011),.034,.041,.010,'rope',p,10)
    a.beam((-.14,.09,1.097),(.12,.175,.70),.022,.017,'leather','Spine')
    p=part(a,'FishingRod',(-.30,-.04,.67),'Hand_L')
    for j in range(7):
        z=.12+j*.23;x=-.41-j*.012
        a.beam((x,-.035,z),(x-.012,-.035,z+.23),.014-j*.001,.014-j*.001,'leather_dark',p)
        a.box((x,-.035,z+.20),(.023,.023,.019),'silver',p,.002)
    ring(a,(-.415,-.062,.44),.05,.05,.014,'silver',p,12)
    a.beam((-.494,-.035,1.73),(-.46,-.045,1.41),.003,.003,'cream',p)
    a.disc((-.46,-.045,1.39),.021,.021,.065,'red',p,8,.7)
    a.disc((-.46,-.045,1.347),.018,.018,.020,'cream',p,8,.7)


def farmer(a):
    erase(a,'Backpack');gloves(a);scarf(a,'yellow');b=belt(a)
    # Hat band, leaf ornament, seed emblem and apron loops.
    for key in list(a.buckets):
        if key[0]=='Hat' and key[1]=='denim':a.buckets[('Hat','green_dark')]=a.buckets.pop(key)
    a.beam((.20,-.177,1.478),(.276,-.139,1.535),.040,.012,'leaf','Hat')
    a.beam((.20,-.177,1.478),(.212,-.163,1.564),.035,.012,'green_light','Hat')
    a.box((0,-.145,.923),(.14,.008,.084),'cream','Spine',.004);badge(a,(0,-.153,.923),.115,'Spine','leaf')
    p=part(a,'SeedBag',(.20,-.02,.73),'Hips')
    loft(a,[(.619,.068,.041,.226,-.075),(.668,.076,.045,.226,-.075),(.788,.063,.039,.226,-.075)],'cream',p,.17)
    a.box((.226,-.075,.787),(.137,.093,.026),'straw_light',p,.004);badge(a,(.226,-.124,.704),.11,p,'leaf')
    for i in range(3):a.beam((.205+i*.022,-.070,.78),(.19+i*.032,-.068,.854),.019,.015,'leaf',p)
    p=part(a,'MilkBottle',(.18,.09,.8),'Hips')
    a.disc((.207,.111,.759),.038,.035,.124,'collar',p,8,.8)
    a.disc((.207,.111,.833),.023,.022,.029,'cream',p,8);a.disc((.207,.111,.854),.027,.025,.018,'leather_light',p,8)
    p=part(a,'Hoe',(-.30,-.04,.68),'Hand_L')
    a.beam((-.407,-.035,.009),(-.407,-.035,1.30),.029,.031,'leather_light',p)
    a.box((-.454,-.036,1.291),(.207,.057,.078),'silver',p,.007)
    a.box((-.540,-.035,1.247),(.048,.080,.122),'silver',p,.006)
    a.box((-.407,-.035,.061),(.040,.041,.102),'silver',p,.004)


def transform(a):
    # Shared compact NPC scale, with enough neck clearance under the larger head.
    def point(v,p):
        z=v.z
        if z<=.72:z=z*.80
        elif z<=1.09:z=.576+(z-.72)*1.11
        else:z=.9867+(z-1.09)*1.36
        head=p in ['Head','Hat','Beard','Pipe','HatFeather']
        return Vector((v.x*(1.24 if head else 1.12),v.y*(1.24 if head else 1.10),z))
    old={k:v.copy() for k,v in a.origins.items()}
    for p in a.parts:a.origins[p]=point(old[p],p)
    for (p,c),(v,f) in a.buckets.items():v[:]=[tuple(point(Vector(q)+old[p],p)-a.origins[p]) for q in v]
    for p,o in a.parts.items():
        if p!='Root':o.location=a.origins[p]-a.origins[next(k for k,v in a.parts.items() if v==o.parent)]


def build(kind):
    a=Character();a.kind=kind;a.scene.name='NPC_'+kind;a.root.name=kind;a.root['asset_id']=kind
    appearance['geometry'](a)
    {'lighthouse_keeper':keeper,'merchant_captain':merchant,'fisherman':fisher,'farm_steward':farmer}[kind](a)
    # Remove fringe tips penetrating the lower captain/bucket brim.
    if kind!='farm_steward':
        for (p,c),(verts,faces) in a.buckets.items():
            if p=='Head' and c in ['hair','hair_light','hair_dark']:
                origin=a.origins[p]
                verts[:]=[(x,y,min(z+origin.z,1.405)-origin.z) for x,y,z in verts]
    # Fit tool handles through relaxed hands instead of floating beside them.
    for (p,c),(verts,faces) in a.buckets.items():
        if p in ['Hoe','FishingRod']:verts[:]=[(x+.10,y,z) for x,y,z in verts]
    transform(a)
    # Namespace material palettes so simultaneous imported NPCs retain their own colours.
    palette={**core['PALETTE'],**STYLES[kind]}
    a.buckets={(p,kind+'_'+c):value for (p,c),value in a.buckets.items()}
    core['PALETTE'].update({kind+'_'+c:v for c,v in palette.items()})
    a.finish()
    for o in a.scene.objects:
        if o.type=='MESH':
            bm=bmesh.new();bm.from_mesh(o.data)
            bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
            bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-7)
            bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
            bm.to_mesh(o.data);bm.free();o.data.update()
    for o in a.scene.objects:
        if o.type=='MESH':
            for m in o.data.materials:
                if m.name.endswith('_glow'):
                    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
                    bs.inputs['Emission Color'].default_value=(1,.38,.025,1)
                    bs.inputs['Emission Strength'].default_value=3
    for o in a.scene.objects:
        if o.type=='MESH':o.name=kind+'__'+o.name
    a.root.location.z=-.0048;bpy.context.view_layer.update()
    body=[o for o in a.scene.objects if o.type=='MESH'];tris=0
    for o in body:o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
    for o in a.scene.objects:o.select_set(True)
    bpy.context.view_layer.objects.active=a.root
    with contextlib.redirect_stdout(io.StringIO()):bpy.ops.export_scene.gltf(filepath=str(OUT/(kind+'.glb')),use_selection=True,use_active_scene=True,export_yup=True,export_extras=True)
    core['review'](a)
    a.scene.render.resolution_x=1000;a.scene.render.resolution_y=1100
    a.scene.camera.data.ortho_scale=2.30
    bpy.data.libraries.write(str(SRC/(kind+'.blend')),{a.scene},fake_user=True)
    views={}
    for name,position in [('front',(2.6,-5,2.35)),('back',(-2.6,5,2.2)),('side',(5,0,1.2))]:
        camera=a.scene.camera;camera.location=position;camera.rotation_euler=(Vector((0,0,.89))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=2.30
        path=ART/(kind+'_'+name+'.png');a.scene.render.filepath=str(path);bpy.ops.render.render(write_still=True);views[name]=str(path.relative_to(BASE))
    data={'id':kind,'name':NAMES[kind],'blend':str((SRC/(kind+'.blend')).relative_to(BASE)),'glb':str((OUT/(kind+'.glb')).relative_to(BASE)),
          'units':'meters','up':'+Y','forward':'+Z','triangles':tris,'meshCount':len(body),'parts':list(a.parts)[1:],
          'rig':'Semantic articulated pivots, no skeletal weights or animation clips','views':views,'integrated':False}
    (OUT/(kind+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print('NPC_DONE',kind,tris,flush=True)
    return data


if __name__=='__main__':
    for p in [SRC,OUT,ART]:p.mkdir(parents=True,exist_ok=True)
    records=[build(k) for k in NAMES]
    (OUT/'manifest.json').write_text(json.dumps({'characters':records,'gameIntegration':False},ensure_ascii=False,indent=2),encoding='utf-8')
