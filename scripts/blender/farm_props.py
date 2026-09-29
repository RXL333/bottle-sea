from farm_common import *

def fence_kit():
    a=Asset(12,'fence_kit','木围栏套件')
    component(a,'fence_straight',(-1.45,0,0),lambda:fence(a,-1.45,0,2))
    component(a,'fence_gate',(1.35,0,0),lambda:fence(a,1.35,0,2,gate=True))
    def corner():
        fence(a,-1.48,1.88,1.65);fence(a,-.655,2.705,1.65,math.pi/2)
    component(a,'fence_corner',(-.655,1.88,0),corner)
    def post():
        a.box((1.31,2.19,.54),(.18,.18,1.08),'wood');a.box((1.31,2.19,1.10),(.23,.23,.08),'wood2')
    component(a,'fence_post',(1.31,2.19,0),post)
    a.notes=['Exploded kit layout. Named components also exported individually under modules/.']
    return a.finish()

def dock_platform(a,cx,cy,w=2.35,d=2.4):
    for x in [cx-w*.41,cx+w*.41]:
        a.box((x,cy,-.22),(.17,d+.14,.22),'wood_dark')
    count=round(d/.19)
    for i in range(count):
        y=cy-d/2+(i+.5)*d/count
        a.box((cx,y,-.06),(w,d/count-.015,.12),'wood2' if i%3 else 'wood3')
        for x in [cx-w*.4,cx+w*.4]:a.cyl((x,y,.005),(x,y,.013),.019,'metal',6)

def dock_post(a,x,y,top=.54):
    a.box((x,y,(-1.2+top)/2),(.22,.22,1.2+top),'wood')
    a.box((x,y,top+.025),(.27,.27,.07),'wood3')
    for z in [.14,.20]:a.ring((x,y,z),.163,.13,.035,'cream','Z',n=8)

def ladder(a,x,y,top=0,bottom=-1.0):
    for xx in [x-.19,x+.19]:a.beam((xx,y,bottom),(xx,y,top+.14),.045,color='metal')
    for i in range(6):a.beam((x-.21,y,bottom+.10+i*(top-bottom)/5),(x+.21,y,bottom+.10+i*(top-bottom)/5),.045,color='steel')

def dock_kit():
    a=Asset(13,'dock_kit','农场码头套件','deck')
    component(a,'dock_platform',(0,0,0),lambda:dock_platform(a,0,0,2.65,2.75))
    for i,(x,y) in enumerate([(-1.24,-1.23),(1.24,-1.23),(-1.24,1.23),(1.24,1.23)]):
        component(a,'dock_pile_'+str(i+1),(x,y,0),lambda x=x,y=y:dock_post(a,x,y))
    component(a,'dock_ladder',(.48,-1.44,0),lambda:ladder(a,.48,-1.44))
    def lamp():
        a.box((-1.24,1.23,.99),(.11,.11,1.98),'wood_dark')
        a.beam((-1.24,1.23,1.91),(-.91,1.23,1.91),.055,color='metal')
        lantern(a,(-.91,1.23,1.50),1)
    component(a,'dock_lamp',(-1.24,1.23,0),lamp)
    component(a,'dock_barrel',(.79,.78,0),lambda:barrel(a,(.79,.78,0),1.15))
    def ring():
        a.ring((-.66,-1.44,-.10),.30,.19,.10,'cream','Y')
        for x,z in [(-.66,.15),(-.66,-.35),(-.91,-.10),(-.41,-.10)]:a.box((x,-1.50,z),(.11,.04,.12),'red')
    component(a,'life_ring',(-.66,-1.44,-.10),ring)
    a.notes=['Deck elevation is Y=0 after export; piles extend below deck. Includes reusable modules.']
    return a.finish()

def chair(a,x,y,z=0):
    for dx in [-.22,.22]:
        for dy in [-.22,.22]:a.box((x+dx,y+dy,z+.26),(.065,.065,.52),'wood')
    for i in range(4):a.box((x+(i-1.5)*.13,y,z+.54),(.12,.58,.075),'wood2')
    for dx in [-.23,.23]:a.box((x+dx,y+.23,z+.85),(.065,.075,.66),'wood')
    for h in [.79,1.05]:a.box((x,y+.24,z+h),(.52,.07,.13),'wood2')
    for dx in [-.28,.28]:
        a.box((x+dx,y,z+.76),(.07,.58,.06),'wood3')
        a.box((x+dx,y-.20,z+.64),(.06,.06,.24),'wood')

def bucket(a,x,y,z):
    a.cyl((x,y,z),(x,y,z+.31),.15,'metal',10,r2=.21,caps=False)
    a.cyl((x,y,z+.015),(x,y,z+.025),.145,'dark',10)
    a.ring((x,y,z+.31),.22,.183,.045,'steel','Z',n=12)
    a.ring((x,y,z+.34),.195,.177,.026,'metal','Y',n=12)

def fishing_deck():
    a=Asset(14,'fishing_deck','钓鱼台','deck')
    component(a,'fishing_platform',(0,0,0),lambda:dock_platform(a,0,0,2,1.95))
    for i,(x,y) in enumerate([(-.89,-.85),(.89,-.85),(-.89,.85),(.89,.85)]):
        component(a,'fishing_pile_'+str(i),(x,y,0),lambda x=x,y=y:dock_post(a,x,y,.46))
    component(a,'fishing_chair',(-.27,.26,0),lambda:chair(a,-.27,.26))
    component(a,'fishing_bucket',(.50,.35,0),lambda:bucket(a,.5,.35,0))
    component(a,'fishing_ladder',(.4,-1.03,0),lambda:ladder(a,.4,-1.03))
    def lamp():
        a.box((-.9,.85,1.05),(.10,.10,2.1),'wood')
        a.beam((-.9,.85,1.99),(-.6,.85,1.99),.035,color='metal')
        lantern(a,(-.6,.85,1.58))
    component(a,'fishing_lamp',(-.9,.85,0),lamp)
    def rod():
        a.cyl((.58,-.10,0),(.58,-.10,.21),.06,'metal',8)
        pts=[(.58,-.10,.16),(.69,-.33,.76),(.73,-.60,1.34),(.68,-.89,1.79),(.55,-1.17,2.08)]
        for i in range(4):a.cyl(pts[i],pts[i+1],.020-i*.003,'wood_dark',6)
        a.cyl((.58,-.1,.16),(.64,-.225,.5),.038,'wood2',8)
        a.cyl((.64,-.24,.55),(.73,-.24,.55),.065,'metal',10)
        a.cyl(pts[-1],(.55,-1.18,-.26),.006,'cream',5)
        a.box((.55,-1.18,-.16),(.055,.055,.10),'red')
    component(a,'fishing_rod',(.58,-.1,0),rod)
    return a.finish()

def bed():
    a=Asset(15,'bed','床与床头柜')
    def makebed():
        for x in [-.69,.69]:
            for y in [-1.02,1.02]:
                h=1.16 if y>0 else .71
                a.box((x,y,h/2),(.12,.12,h),'wood')
                a.box((x,y,h+.045),(.15,.15,.09),'wood2')
        for x in [-.66,.66]:a.box((x,0,.33),(.12,2.12,.29),'wood2')
        for y in [-1.02,1.02]:
            a.box((0,y,.49 if y<0 else .92),(1.28,.105,.36 if y<0 else .46),'wood2')
            for x in [-.49,-.25,0,.25,.49]:a.box((x,y-.06,.49 if y<0 else .92),(.025,.026,.31 if y<0 else .41),'wood')
        a.box((0,0,.55),(1.27,1.98,.30),'white')
        a.box((0,-.29,.715),(1.32,1.42,.09),'blue')
        for ix in range(8):
            for iy in range(9):
                x=(ix-3.5)*.164;y=-.91+iy*.154
                a.box((x,y,.766),(.162,.153,.019),['blue','blue2','blue3'][(ix//2+iy//2)%3])
        for side in [-1,1]:
            for iy in range(9):a.box((side*.682,-.91+iy*.154,.59),(.055,.153,.31),'blue2' if iy//2%2 else 'blue')
        for x in [-.33,.33]:
            a.box((x,.69,.79),(.59,.43,.17),'cream')
            a.box((x,.66,.88),(.53,.37,.07),'white')
    component(a,'bed_frame',(0,0,0),makebed)
    def table():
        x,y=1.22,.70
        for dx in [-.23,.23]:
            for dy in [-.21,.21]:a.box((x+dx,y+dy,.33),(.065,.065,.66),'wood')
        a.box((x,y,.53),(.50,.46,.24),'wood')
        a.box((x,y-.245,.55),(.42,.035,.17),'wood2')
        a.cyl((x,y-.27,.55),(x,y-.31,.55),.035,'yellow',8)
        a.box((x,y,.70),(.61,.57,.10),'wood3')
        a.box((x,y,.16),(.48,.45,.06),'wood2')
        a.cyl((x,y,.76),(x,y,.81),.12,'yellow',10)
        a.cyl((x,y,.80),(x,y,1.12),.025,'yellow',8)
        a.cyl((x,y,1.03),(x,y,1.35),.22,'cream',8,r2=.12)
        a.cyl((x,y,1.35),(x,y,1.38),.045,'yellow',8)
    component(a,'bedside_table',(1.22,.70,0),table)
    return a.finish()

def stove():
    a=Asset(16,'kitchen_stove','厨房炉灶与锅')
    # Stone firebox built with an actual open front, not a painted hole.
    for row in range(5):
        z=.12+row*.21
        for x in [-.54,.54]:
            a.box((x,0,z),(.23,.80,.19),'stone' if row%2 else 'stone_dark')
        a.box((0,.35,z),(1.16,.18,.19),'stone_dark')
    a.box((0,0,1.10),(1.44,1.01,.17),'stone')
    for x in [-.49,-.16,.17,.50]:a.box((x,-.41,.88),(.31,.21,.24),'stone2' if x<0 else 'stone')
    a.box((0,-.02,.13),(1.12,.82,.16),'stone_dark')
    for x in [-.27,0,.27]:
        a.cyl((x,-.41,.24),(x,.16,.24),.075,'wood_dark',8)
        a.cyl((x,-.427,.24),(x,-.439,.24),.060,'endgrain',8)
    for x,h in [(-.26,.27),(0,.43),(.23,.30)]:
        a.cyl((x,-.10,.26),(x+.035,-.1,.26+h),.13,'fire',5,r2=0)
        a.cyl((x,-.13,.26),(x+.015,-.13,.26+h*.65),.075,'fire2',5,r2=0)
    for x in [-.33,-.16,0,.16,.33]:a.beam((x,-.42,.22),(x,-.42,.57),.029,color='dark')
    a.beam((-.41,-.43,.53),(.41,-.43,.53),.035,color='metal')
    p=a.part('cooking_pot',(0,0,1.19))
    a.cyl((0,0,1.19),(0,0,1.57),.31,'metal',12,part=p)
    a.ring((0,0,1.58),.34,.285,.07,'dark','Z',part=p,n=12)
    a.cyl((0,0,1.615),(0,0,1.66),.30,'metal',12,r2=.20,part=p)
    a.cyl((0,0,1.67),(0,0,1.75),.06,'dark',8,part=p)
    for side in [-1,1]:a.ring((side*.35,0,1.47),.105,.061,.045,'dark','Y',part=p,n=8)
    # Rear chimney, hanging utensils and stacked firewood.
    a.box((-.46,.31,1.54),(.20,.21,.87),'stone_dark')
    a.box((-.46,.31,2),(.30,.30,.13),'stone')
    for x in [.66,1.72]:a.box((x,.29,1.23),(.07,.07,2.46),'wood_dark')
    a.box((1.19,.29,2.44),(1.20,.10,.10),'wood2')
    for i in range(3):
        x=.84+i*.34
        a.cyl((x,.27,2.39),(x,.27,1.94),.019,'metal',8)
        a.box((x,.26,1.82),(.17,.045,.22),'metal')
        a.ring((x,.27,2.44),.045,.026,.025,'dark','Y',n=8)
    for x in [.76,1.67]:a.box((x,0,.42),(.10,.75,.84),'wood')
    for z in [.10,.84]:a.box((1.21,0,z),(1.02,.82,.10),'wood2')
    for row in range(3):
        for i in range(4):
            x=.87+i*.22+(row%2)*.035;z=.24+row*.19
            a.cyl((x,-.34,z),(x,.3,z),.093,'wood_dark',8)
            a.cyl((x,-.345,z),(x,-.36,z),.075,'endgrain',8)
    return a.finish()

def storage():
    a=Asset(17,'storage_set','储物箱与食材柜')
    def chest():
        x=-.78
        a.box((x,0,.43),(.94,.77,.78),'wood')
        for i in range(6):
            a.box((x+(i-2.5)*.148,-.401,.43),(.13,.05,.69),'wood2')
        for yy in [-.4,.4]:
            for z in [.12,.73]:a.box((x,yy,z),(1.0,.075,.10),'wood3')
        for xx in [x-.45,x+.45]:a.box((xx,0,.43),(.085,.88,.8),'wood_dark')
        lid=a.part('chest_lid',(x,.43,.84))
        a.box((x,0,.84),(1.05,.91,.11),'wood2',lid)
        for i in range(6):a.box((x+(i-2.5)*.163,0,.90),(.15,.86,.027),'wood3',lid)
        a.box((x,-.46,.70),(.12,.04,.23),'metal')
        a.cyl((x,-.49,.69),(x,-.515,.69),.037,'yellow',8)
        for xx in [x-.34,x+.34]:
            for z in [.13,.72]:a.cyl((xx,-.44,z),(xx,-.47,z),.022,'dark',6)
    component(a,'storage_chest',(-.78,0,0),chest)
    def cupboard():
        x=.85;y=.17
        a.box((x,y+.24,.99),(1.15,.075,1.96),'wood_dark')
        for xx in [x-.56,x+.56]:a.box((xx,y,.99),(.10,.64,1.96),'wood')
        for z in [.10,.62,1.17,1.77,2.01]:a.box((x,y,z),(1.20,.69,.095),'wood2')
        a.box((x,y,2.09),(1.34,.79,.10),'wood3')
        for xx in [x-.29,x+.29]:
            a.box((xx,y-.33,.38),(.51,.075,.39),'wood2')
            a.box((xx,y-.38,.38),(.13,.035,.035),'dark')
        # Preserves, jars, crockery and grain sack; open shelves.
        for level in [.675,1.225,1.82]:
            for i in range(3):
                xx=x+(i-1)*.32
                a.cyl((xx,y-.05,level),(xx,y-.05,level+.23),.11,['food','yellow','green'][i],10)
                a.box((xx,y-.16,level+.11),(.15,.02,.10),'cream')
                a.cyl((xx,y-.05,level+.23),(xx,y-.05,level+.265),.12,'metal',10)
    component(a,'food_cupboard',(.85,.17,0),cupboard)
    def sack():
        a.cyl((-.02,-.78,.02),(-.02,-.78,.41),.24,'wool',8,r2=.19)
        a.cyl((-.02,-.78,.41),(-.02,-.78,.53),.19,'wood3',8,r2=.11)
        a.ring((-.02,-.78,.47),.14,.11,.04,'wood','Z',n=8)
    component(a,'grain_sack',(-.02,-.78,0),sack)
    return a.finish()

def build():return [fence_kit(),dock_kit(),fishing_deck(),bed(),stove(),storage()]
