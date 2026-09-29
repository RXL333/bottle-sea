from farm_common import *

def chicken():
    a=Asset(18,'chicken','鸡与小鸡')
    def adult():
        a.box((0,.05,.49),(.49,.63,.44),'cream')
        a.box((0,.04,.70),(.42,.51,.20),'white')
        a.box((0,-.25,.72),(.31,.28,.56),'cream')
        head=a.part('head',(0,-.25,.88))
        a.box((0,-.29,.98),(.33,.32,.34),'white',head)
        a.box((0,-.485,.94),(.17,.16,.11),'yellow',head)
        a.box((0,-.52,.915),(.14,.14,.045),'yellow2',head)
        a.box((0,-.41,.81),(.11,.11,.16),'red',head)
        for y,z in [(-.37,1.20),(-.23,1.26),(-.10,1.19)]:a.box((0,y,z),(.10,.13,.20),'red2',head)
        for side in [-1,1]:
            a.box((side*.172,-.36,1.015),(.022,.082,.09),'black',head)
            a.box((side*.187,-.379,1.04),(.008,.024,.025),'white',head)
            wing=a.part('wing_left' if side<0 else 'wing_right',(side*.23,.03,.60))
            a.box((side*.275,.08,.52),(.12,.43,.24),'wool',wing)
            for j in range(3):a.box((side*.30,.23-j*.13,.47+j*.055),(.08,.16,.14),'white',wing)
            leg=a.part('leg_left' if side<0 else 'leg_right',(side*.12,.04,.32))
            a.box((side*.12,.04,.19),(.065,.065,.27),'yellow',leg)
            for dx in [-.055,0,.055]:a.beam((side*.12,.04,.055),(side*.12+dx,-.15,.035),.034,color='yellow2',part=leg)
            a.beam((side*.12,.04,.055),(side*.12,.14,.03),.03,color='yellow',part=leg)
        for i in range(4):
            a.box(((i-1.5)*.10,.43,.76+(.13 if i in [1,2] else 0)),(.11,.20,.34),'white',rot=(-.4,0,0))
    adult()
    def chick():
        x,y=.56,-.30
        a.box((x,y,.18),(.22,.25,.21),'yellow2')
        a.box((x,y-.08,.34),(.19,.18,.18),'yellow2')
        a.box((x,y-.195,.31),(.085,.09,.06),'yellow')
        for side in [-1,1]:
            a.box((x+side*.10,y-.10,.37),(.017,.04,.04),'black')
            a.box((x+side*.12,y+.015,.20),(.05,.14,.12),'yellow')
            a.box((x+side*.058,y-.04,.028),(.07,.14,.045),'yellow')
    component(a,'chick',(.56,-.30,0),chick)
    a.notes=['Includes separate chick component. Adult body and head/wing/leg pivots retained.']
    return a.finish()

def cow():
    a=Asset(19,'cow','奶牛')
    a.box((0,.12,1.05),(.77,1.53,.71),'cream')
    a.box((0,.12,1.41),(.69,1.39,.10),'white')
    # Block-shaped Holstein patches follow the torso surface.
    patterns=[(0,0),(1,0),(0,1),(1,1),(1,2),(4,0),(4,1),(5,1),(5,2),(6,2),(3,3),(4,3)]
    for side in [-1,1]:
        for iy,iz in patterns:
            y=-.52+iy*.21;z=.80+iz*.18
            a.box((side*.391,y,z),(.025,.215,.185),'black')
    for ix,iy in [(0,1),(1,1),(1,2),(2,2),(0,5),(1,5),(2,5),(2,6)]:
        a.box(((ix-1)*.23,-.53+iy*.21,1.469),(.233,.214,.024),'black')
    for side in [-1,1]:
        for y in [-.43,.66]:
            name=('front' if y<0 else 'rear')+('_left' if side<0 else '_right')
            p=a.part('leg_'+name,(side*.26,y,.90))
            a.box((side*.26,y,.53),(.16,.19,.73),'cream',p)
            a.box((side*.26,y,.18),(.175,.20,.14),'black',p)
            a.box((side*.26,y-.02,.075),(.19,.25,.15),'dark',p)
            a.box((side*.26,y-.15,.05),(.012,.01,.09),'steel',p)
    # Udder and four teats between the hind legs.
    a.box((0,.49,.64),(.37,.46,.22),'pink')
    for x in [-.11,.11]:
        for y in [.36,.60]:a.box((x,y,.47),(.065,.07,.16),'pink')
    head=a.part('head',(0,-.66,1.22))
    a.box((0,-.75,1.16),(.55,.39,.63),'black',head)
    a.box((0,-1.015,.99),(.53,.23,.28),'pink',head)
    a.box((0,-.89,1.45),(.16,.10,.29),'cream',head)
    for side in [-1,1]:
        a.box((side*.29,-.76,1.30),(.04,.13,.13),'white',head)
        a.box((side*.316,-.79,1.30),(.024,.065,.083),'black',head)
        a.box((side*.331,-.815,1.326),(.008,.02,.025),'white',head)
        a.box((side*.16,-1.137,1.025),(.082,.016,.057),'black',head)
        a.box((side*.39,-.69,1.43),(.30,.18,.11),'black',head,rot=(0,side*-.20,0))
        a.box((side*.42,-.72,1.49),(.16,.11,.035),'pink',head)
        a.cyl((side*.19,-.69,1.47),(side*.27,-.66,1.70),.073,'cream',6,r2=.036,part=head)
        a.cyl((side*.27,-.66,1.70),(side*.22,-.70,1.82),.036,'cream',6,r2=.008,part=head)
    tail=a.part('tail',(0,.92,1.23))
    a.beam((0,.92,1.23),(.12,1.00,.69),.045,color='cream',part=tail)
    a.box((.12,1.0,.62),(.105,.105,.20),'black',tail)
    return a.finish()

def sheep():
    a=Asset(20,'sheep','羊')
    a.box((0,.10,.70),(.66,1.08,.56),'wool')
    rng=random.Random(20)
    # Stepped fleece, intentionally blocky rather than smooth spheres.
    for ix in range(4):
        for iy in range(6):
            a.box(((ix-1.5)*.18,-.39+iy*.18,.99+rng.uniform(-.018,.025)),(.19,.19,.19),'wool2' if (ix+iy)%3 else 'wool')
    for side in [-1,1]:
        for iy in range(6):
            for iz in range(3):
                a.box((side*(.34+rng.uniform(0,.025)),-.39+iy*.18,.52+iz*.18),(.17,.19,.19),'wool2' if (iy+iz)%3 else 'wool')
        for y in [-.27,.47]:
            p=a.part(('leg_front_' if y<0 else 'leg_rear_')+str(side),(side*.23,y,.5))
            a.box((side*.23,y,.27),(.13,.15,.45),'black',p)
            a.box((side*.23,y-.02,.065),(.15,.19,.13),'dark',p)
    for ix in range(4):
        for iz in range(3):a.box(((ix-1.5)*.18,.65,.53+iz*.18),(.19,.14,.19),'wool2')
    head=a.part('head',(0,-.50,.78))
    a.box((0,-.61,.76),(.36,.38,.43),'black',head)
    a.box((0,-.81,.65),(.30,.17,.23),'dark',head)
    a.box((0,-.59,1.00),(.41,.32,.17),'wool2',head)
    for side in [-1,1]:
        a.box((side*.19,-.70,.84),(.028,.10,.11),'white',head)
        a.box((side*.209,-.73,.84),(.015,.049,.065),'black',head)
        a.box((side*.28,-.55,.88),(.22,.13,.09),'black',head,rot=(0,side*.22,0))
    a.box((0,.78,.71),(.20,.22,.23),'wool2')
    return a.finish()

def build():return [chicken(),cow(),sheep()]
