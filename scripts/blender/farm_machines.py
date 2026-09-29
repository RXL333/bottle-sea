from farm_common import *

def tractor():
    a=Asset(2,'tractor','拖拉机')
    a.box((0,0,.7),(1.04,2.35,.27),'dark')
    a.box((0,-.67,1.20),(.98,1.22,.65),'red')
    a.box((0,-.65,1.55),(1.04,1.24,.10),'red2')
    a.box((0,-1.30,1.13),(.83,.05,.50),'dark')
    for i in range(10):a.box(((i-4.5)*.075,-1.34,1.13),(.025,.035,.44),'steel')
    a.box((0,-1.45,.69),(1.16,.25,.2),'metal')
    for x in [-.38,.38]:
        a.box((x,-1.36,1.37),(.19,.075,.15),'cream')
        a.box((x,-1.41,1.36),(.10,.02,.08),'yellow2')
    a.cyl((-.39,-.36,1.54),(-.39,-.36,2.37),.043,'dark',8)
    a.cyl((-.39,-.36,2.37),(-.39,-.43,2.41),.05,'metal',8)
    a.box((0,.47,1.14),(1.04,1.14,.24),'red_dark')
    # Cab glass and strong red/cream frame; separate entry door pivot.
    a.box((0,.47,1.86),(.96,1.09,.99),'glass')
    for x in [-.50,.50]:
        for y in [-.09,1.03]:a.box((x,y,1.84),(.075,.075,1.12),'cream')
        a.box((x,.47,1.34),(.09,1.15,.1),'red')
        a.box((x,.47,2.33),(.09,1.15,.08),'red')
        a.box((x,.59,1.81),(.08,.055,.94),'dark')
        a.box((x*1.07,.36,1.73),(.055,.15,.035),'steel')
        a.beam((x,-.07,2.14),(x*1.46,-.22,2.14),.035,color='dark')
        a.box((x*1.50,-.22,2.12),(.08,.18,.21),'dark')
    a.box((0,.46,2.43),(1.25,1.40,.16),'red2')
    a.box((0,.46,2.52),(1.10,1.24,.06),'red')
    a.cyl((.40,.78,2.56),(.40,.78,2.74),.065,'yellow2',8)
    for x in [-.42,.42]:a.box((x,-.255,2.39),(.18,.075,.11),'cream')
    # Rear fenders, steps and three-point hitch.
    for side in [-1,1]:
        a.box((side*.78,.77,1.59),(.52,1.38,.12),'red')
        a.box((side*1.04,.77,1.46),(.07,1.38,.23),'red2')
        for j in range(2):
            a.box((side*(.65+j*.12),-.1,.58+j*.21),(.28,.48,.07),'metal')
        a.box((side*.85,1.50,1.5),(.13,.05,.11),'red2')
        a.beam((side*.30,1.1,.57),(side*.42,1.70,.45),.085,color='metal')
        wheel(a,side*.78,-.94,.47,.47,.31,'cream',f'wheel_front_{side}')
        wheel(a,side*.86,.82,.70,.70,.40,'cream',f'wheel_rear_{side}')
    a.beam((-.44,1.68,.45),(.44,1.68,.45),.08,color='steel')
    a.notes=['Four wheel pivots retained for future driving animation.']
    return a.finish()

def seeder():
    a=Asset(3,'seeder','播种机')
    a.box((0,0,.83),(2.72,.8,.17),'green_dark')
    a.box((0,0,1.31),(2.53,.72,.62),'green')
    a.box((0,-.38,1.42),(2.54,.055,.16),'yellow')
    a.box((0,0,1.67),(2.68,.86,.12),'yellow2')
    for x in [-.75,0,.75]:
        a.box((x,0,1.75),(.46,.38,.06),'dark')
        a.box((x,-.03,1.80),(.22,.055,.06),'metal')
    for side in [-1,1]:
        wheel(a,side*1.45,0,.44,.44,.25,'yellow',f'transport_wheel_{side}')
        a.box((side*1.4,0,.95),(.12,.48,.26),'green2')
    # Six distinct seed-metering units and coulter discs.
    for i in range(6):
        x=(i-2.5)*.43;p=a.part(f'row_unit_{i+1}',(x,.45,.7))
        a.box((x,.55,.78),(.20,.83,.11),'green',p)
        a.cyl((x,.13,1.02),(x,.76,.44),.048,'rubber',8,part=p)
        a.box((x,.79,.53),(.22,.31,.19),'yellow',p)
        a.cyl((x-.05,.90,.24),(x+.05,.90,.24),.23,'metal',12,part=p)
        a.cyl((x-.07,1.16,.18),(x+.07,1.16,.18),.17,'rubber',12,part=p)
        a.cyl((x-.075,1.16,.18),(x+.075,1.16,.18),.08,'yellow',8,part=p)
    for x in [-.85,.85]:a.beam((x,-.36,.85),(0,-1.5,.55),.09,color='green')
    a.ring((0,-1.56,.55),.12,.065,.06,'metal','Z',n=10)
    a.beam((0,-1.13,.6),(0,-1.13,.09),.055,color='metal')
    a.box((0,-1.13,.05),(.22,.19,.06),'dark')
    return a.finish()

def combine():
    a=Asset(4,'combine_harvester','联合收割机')
    a.box((0,.1,.79),(1.4,3.2,.25),'dark')
    a.box((0,.62,1.61),(1.83,2.20,1.35),'yellow')
    a.box((0,.70,2.32),(1.91,2.22,.14),'yellow2')
    for side in [-1,1]:
        a.box((side*.93,.70,1.72),(.04,1.61,.055),'yellow2')
        for j in range(6):a.box((side*.96,1.07+(j-2.5)*.12,1.9),(.035,.055,.31),'dark')
        a.box((side*.94,.53,1.24),(.05,1.96,.065),'dark')
        wheel(a,side*.94,-.58,.65,.65,.42,'yellow',f'drive_wheel_{side}')
        wheel(a,side*.84,1.26,.43,.43,.30,'yellow',f'steer_wheel_{side}')
    a.box((0,-1.10,1.85),(1.35,1.12,1.25),'glass')
    for x in [-.69,.69]:
        for y in [-1.67,-.53]:a.box((x,y,1.87),(.075,.075,1.32),'dark')
        a.box((x,-1.1,1.26),(.09,1.18,.08),'yellow')
    a.box((0,-1.1,2.54),(1.61,1.35,.16),'yellow2')
    a.box((0,-1.1,1.22),(1.46,1.27,.17),'yellow')
    for x in [-.53,.53]:a.box((x,-1.8,2.50),(.19,.06,.11),'cream')
    a.beam((0,-1.70,1.4),(.34,-1.70,2.09),.025,color='dark')
    # Grain tank, access ladder, auger with downward discharge.
    a.box((0,.5,2.62),(1.64,1.32,.45),'dark')
    a.box((0,.5,2.86),(1.80,1.46,.08),'metal')
    a.box((0,.5,2.9),(1.50,1.15,.05),'black')
    for x in [-1.08,-.80]:a.beam((x,-.20,.4),(x,-.20,1.38),.035,color='metal')
    for z in [.47,.70,.93,1.16]:a.beam((-1.10,-.2,z),(-.78,-.2,z),.04,color='metal')
    p=a.part('unloading_auger',(.78,1.13,2.12))
    a.cyl((.78,1.13,2.12),(1.22,1.18,2.67),.15,'yellow',10,part=p)
    a.cyl((1.22,1.18,2.67),(2.55,1.18,2.67),.13,'yellow',10,part=p)
    a.cyl((2.55,1.18,2.67),(2.61,1.18,2.27),.16,'dark',10,part=p)
    header=a.part('header',(0,-1.45,.7))
    a.box((0,-2.05,.40),(3.38,.88,.35),'yellow',header)
    a.cyl((-1.52,-2.08,.68),(1.52,-2.08,.68),.18,'dark',12,part=header)
    for i in range(22):
        x=(i-10.5)*.142
        a.box((x,-2.50,.32),(.075,.35,.055),'steel',header)
        a.beam((x,-2.3,.92),(x,-2.54,.62),.025,color='dark',part=header)
    reel=a.part('header_reel',(0,-2.13,.95))
    a.cyl((-1.62,-2.13,.95),(1.62,-2.13,.95),.055,'metal',10,part=reel)
    for i in range(6):
        t=i*math.tau/6;y=-2.13+math.sin(t)*.36;z=.95+math.cos(t)*.36
        a.beam((-1.53,y,z),(1.53,y,z),.035,color='dark',part=reel)
        for x in [-1.48,0,1.48]:a.beam((x,-2.13,.95),(x,y,z),.034,color='yellow',part=reel)
    for side in [-1,1]:
        a.box((side*1.70,-2.06,.53),(.12,1.04,.61),'yellow2',header)
        a.beam((side*.52,-1.25,.79),(side*.70,-1.93,.57),.17,color='metal')
    return a.finish()

def trailer():
    a=Asset(5,'farm_trailer','农用拖车')
    a.box((0,0,.53),(1.44,2.50,.16),'green_dark')
    for i in range(10):a.box((0,(i-4.5)*.25,.67),(1.53,.242,.11),'wood2' if i%3 else 'wood')
    for side in [-1,1]:
        for y in [-1.25,0,1.25]:a.box((side*.81,y,1.14),(.095,.12,1.03),'green')
        for j in range(4):a.box((side*.80,0,.80+j*.23),(.10,2.53,.20),'green' if j<2 else 'wood2')
        for y in [-.76,.79]:wheel(a,side*.88,y,.37,.37,.24,'wood',f'wheel_{side}_{y}')
        for y in [-1.14,1.14]:
            for z in [.8,1.24]:a.cyl((side*.856,y,z),(side*.88,y,z),.027,'steel',6)
    for y in [-1.27,1.27]:
        for j in range(4):a.box((0,y,.80+j*.23),(1.61,.09,.20),'green' if j<2 else 'wood2')
        for x in [-.76,0,.76]:a.box((x,y*1.02,1.12),(.09,.07,1.04),'green2')
    for x in [-.60,.60]:a.beam((x,-1.1,.53),(0,-2.32,.40),.09,color='metal')
    a.ring((0,-2.38,.40),.12,.065,.065,'metal','Z',n=10)
    a.beam((0,-1.92,.44),(0,-1.92,.10),.055,color='steel')
    a.box((0,-1.92,.06),(.24,.20,.08),'metal')
    for x in [-.66,.66]:a.box((x,1.35,.69),(.18,.05,.12),'red2')
    return a.finish()

def plow():
    a=Asset(6,'plow','犁 / 耕地机')
    a.box((0,0,.78),(2.6,.16,.17),'red')
    a.box((0,.51,.76),(2.6,.13,.14),'red_dark')
    for x in [-1.10,-.38,.38,1.10]:
        a.box((x,.26,.78),(.12,.65,.13),'red2')
        a.beam((x,.12,.75),(x,.35,.35),.09,color='metal')
        # Faceted curved mouldboard and pointed share.
        v=[(x-.20,.26,.12),(x+.22,.16,.09),(x+.29,.39,.20),(x+.16,.56,.44),(x-.13,.58,.49),(x-.23,.41,.28)]
        back=[(xx,yy+.055,zz) for xx,yy,zz in v]
        a.mesh(v+back,[(0,1,2,5),(2,3,4,5),(6,11,8,7),(8,11,10,9)]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)],'metal')
        a.beam((x-.22,.25,.11),(x+.23,.14,.08),.06,.10,'steel')
        a.cyl((x,-.096,.80),(x,-.12,.80),.035,'yellow',6)
    for side in [-1,1]:
        a.beam((side*.53,0,.82),(0,-.35,1.46),.11,color='red')
        a.beam((side*.53,0,.82),(side*.38,-.66,.60),.095,color='red')
    a.box((0,-.35,1.47),(.18,.17,.18),'red2')
    a.cyl((-.12,-.35,1.48),(.12,-.35,1.48),.055,'steel',8)
    a.beam((-1.15,.1,.81),(-1.47,.11,.35),.10,color='red')
    wheel(a,-1.50,.10,.32,.32,.22,'red','depth_wheel')
    return a.finish()

def build():return [tractor(),seeder(),combine(),trailer(),plow()]
