from farm_common import *

def barn():
    a=Asset(7,'barn','农场谷仓与筒仓')
    a.box((0,0,.13),(4.35,4.9,.26),'stone_dark')
    a.box((0,0,1.55),(4.10,4.7,2.84),'red_dark')
    for side in [-1,1]:
        for i in range(23):a.box((side*2.065,(i-11)*.2,1.6),(.065,.17,2.73),'red' if i%3 else 'red2')
        for y in [-2.38,2.38]:a.box((side*2.065,y,1.58),(.17,.15,2.9),'cream')
        for z in [.28,2.87]:a.box((side*2.08,0,z),(.15,4.81,.14),'cream')
    for y in [-2.37,2.37]:
        for i in range(21):a.box(((i-10)*.19,y,1.6),(.16,.06,2.73),'red' if i%3 else 'red2')
        # Gambrel gable profile and slatted upper wall.
        v=[(-2.05,y,2.9),(2.05,y,2.9),(1.3,y,3.97),(0,y,4.58),(-1.3,y,3.97)]
        a.mesh(v,[tuple(range(5))],'red')
        for i in range(19):
            x=(i-9)*.21;top=4.58-abs(x)*(.61/1.3) if abs(x)<=1.3 else 3.97-(abs(x)-1.3)*1.43
            a.box((x,y, (top+2.9)/2),(.03,.08,top-2.9),'red2')
        a.box((0,y*1.01,2.87),(4.23,.14,.14),'cream')
    # Broken-pitch roof, with shingle courses following both slopes.
    for side in [-1,1]:
        for x1,z1,x2,z2 in [(0,4.65,1.33,4.04),(1.33,4.04,2.25,2.81)]:
            length=math.hypot(x2-x1,z2-z1);angle=math.atan2(z1-z2,x2-x1)*side
            a.box((side*(x1+x2)/2,0,(z1+z2)/2),(length,5.14,.13),'slate',rot=(0,angle,0))
            rows=5;cols=16
            for r in range(rows):
                t=(r+.5)/rows
                for c in range(cols):
                    a.box((side*(x1+(x2-x1)*t),(c-7.5)*.32,z1+(z2-z1)*t+.07),(length/rows*1.02,.305,.04),'slate2' if (r+c)%4==0 else 'slate',rot=(0,angle,0))
            for y in [-2.60,2.60]:a.beam((side*x1,y,z1),(side*x2,y,z2),.14,.13,'cream')
    a.beam((0,-2.60,4.71),(0,2.60,4.71),.15,.14,'slate2')
    for side in [-1,1]:
        p=a.part('door_left' if side<0 else 'door_right',(side*1.08,-2.45,.2))
        x=side*.54
        a.box((x,-2.455,1.31),(1.03,.13,2.13),'red_dark',p)
        for j in range(5):a.box((x+(j-2)*.195,-2.535,1.31),(.17,.025,2.06),'red',p)
        for xx in [x-.5,x+.5]:a.box((xx,-2.575,1.31),(.09,.09,2.16),'cream',p)
        for z in [.26,2.35]:a.box((x,-2.575,z),(1.10,.09,.1),'cream',p)
        a.beam((x-.45,-2.60,.30),(x+.45,-2.60,2.30),.075,.08,'cream',p)
        a.beam((x+.45,-2.60,.30),(x-.45,-2.60,2.30),.075,.08,'cream',p)
        a.box((side*.12,-2.65,1.28),(.055,.055,.16),'dark',p)
    window(a,0,-2.42,3.5,.74,.73)
    a.beam((-.32,-2.55,3.2),(.32,-2.55,3.8),.045,color='cream')
    a.beam((.32,-2.55,3.2),(-.32,-2.55,3.8),.045,color='cream')
    # Tall segmented silo behind the barn.
    x,y=3.02,1.05
    a.cyl((x,y,.1),(x,y,4.05),.79,'stone2',16)
    for z in [.20,1.0,1.8,2.6,3.4,4.02]:a.ring((x,y,z),.805,.77,.065,'metal','Z',n=16)
    for i in range(16):
        t=i*math.tau/16;a.beam((x+.794*math.cos(t),y+.794*math.sin(t),.22),(x+.794*math.cos(t),y+.794*math.sin(t),4.03),.016,color='stone_dark')
    a.cyl((x,y,4.05),(x,y,4.58),.84,'stone',16,r2=.24)
    a.cyl((x,y,4.58),(x,y,4.67),.26,'metal',12)
    for xx in [x-.15,x+.15]:a.beam((xx,y-.81,.17),(xx,y-.81,4.12),.03,color='metal')
    for i in range(15):a.beam((x-.16,y-.83,.25+i*.25),(x+.16,y-.83,.25+i*.25),.03,color='metal')
    for i in range(3):
        a.box((1.35+i*.50,-2.86,.25),(.47,.55,.5),'hay')
        for y0 in [-3.03,-2.69]:a.box((1.35+i*.50,y0,.25),(.49,.035,.52),'wood')
    crate(a,(-1.72,-2.90,0),.54);barrel(a,(-2.6,-1.86,0))
    return a.finish()

def tool_shed():
    a=Asset(8,'tool_shed','农机棚 / 工具棚')
    a.box((0,0,.09),(4.8,4.15,.18),'stone_dark')
    for side in [-1,1]:
        a.box((side*2.21,.12,1.52),(.17,3.72,2.92),'wood')
        for i in range(19):a.box((side*2.31,-1.62+i*.19,1.55),(.035,.15,2.85),'wood2' if i%3 else 'wood')
    a.box((0,1.98,1.54),(4.43,.15,2.96),'wood')
    for x in [-2.21,0,2.21]:
        a.box((x,1.98,1.64),(.2,.23,3.07),'wood_dark')
    for x in [-2.21,2.21]:
        a.box((x,-1.92,1.59),(.24,.25,3.05),'wood_dark')
        a.box((x,-1.92,.27),(.31,.31,.40),'stone')
        a.beam((x,-1.94,2.2),(x*.60,-1.94,3.0),.16,color='wood3')
    a.box((0,-1.94,3.05),(4.65,.25,.24),'wood2')
    gable(a,0,0,4.45,4,3.07,4.12,'wood_dark')
    for x in [-1.6,-.8,0,.8,1.6]:
        top=4.12-abs(x)*1.05/2.225;a.beam((x,-2.06,3.1),(x,-2.06,top),.12,color='wood3')
    roof(a,0,0,5.03,4.55,3.04,4.22,'slate')
    # Interior workbench and shelving, visible through open front.
    a.box((1.39,.80,.98),(1.25,1.43,.13),'wood3')
    for x in [.90,1.88]:
        for y in [.20,1.38]:a.box((x,y,.52),(.09,.09,.90),'wood_dark')
    for z in [.35,1.04,1.77]:a.box((-.98,1.61,z),(1.68,.47,.08),'wood2')
    for x in [-1.79,-.18]:a.box((x,1.62,1.04),(.09,.44,1.62),'wood_dark')
    for x in [-1.44,-.93,-.43]:crate(a,(x,1.59,1.08),.37)
    for x in [-.2,.1,.4]:
        a.beam((x,1.82,.35),(x,1.82,1.91),.035,color='wood3')
        a.box((x,1.80,.35),(.17,.055,.29),'metal')
    barrel(a,(-2.53,-1.43,0));barrel(a,(-2.60,-.81,0));crate(a,(2.49,-1.6,0),.55)
    plant(a,(2.62,.25,0),.75)
    # Side glazing on the right wall.
    a.box((2.34,.40,1.96),(.03,.95,.77),'glass')
    for y in [-.09,.40,.89]:a.box((2.38,y,1.96),(.07,.055,.86),'wood3')
    for z in [1.55,1.96,2.37]:a.box((2.38,.4,z),(.07,1.04,.055),'wood3')
    return a.finish()

def farmhouse():
    a=Asset(9,'farmhouse','农场小屋')
    a.box((0,0,.18),(3.65,3.73,.36),'stone')
    # Walkable shell: back and side walls, front wall with a real doorway.
    for x in [-1.67,1.67]:a.box((x,0,1.42),(.10,3.52,2.43),'cream')
    a.box((0,1.71,1.42),(3.24,.10,2.43),'cream')
    for x,w in [(-1.14,1.16),(.99,1.46)]:a.box((x,-1.71,1.42),(w,.10,2.43),'cream')
    a.box((-.15,-1.71,2.36),(.82,.10,.60),'cream')
    for side in [-1,1]:
        for y in [-1.79,1.79]:a.box((side*1.73,y,1.46),(.15,.14,2.55),'wood_dark')
        a.box((side*1.74,0,.45),(.12,3.55,.15),'wood2')
    gable(a,0,0,3.44,3.52,2.66,4.06,'cream')
    roof(a,0,0,4.12,4.14,2.61,4.15,'tile',True)
    # Front door, windows and porch.
    door=a.part('front_door',(-.55,-1.81,.25))
    a.box((-.15,-1.80,1.16),(.82,.13,1.80),'wood_dark',door)
    for i in range(5):a.box((-.15+(i-2)*.15,-1.88,1.16),(.135,.025,1.74),'wood2',door)
    a.box((-.15,-1.92,1.53),(.47,.03,.45),'glass',door)
    a.cyl((.15,-1.92,1.08),(.15,-1.99,1.08),.045,'yellow',8,part=door)
    window(a,1.03,-1.81,1.58,.55,.73,True)
    window(a,-1.17,-1.81,1.65,.45,.63)
    window(a,0,-1.80,3.18,.6,.62)
    a.box((-.36,-2.29,.20),(2.62,1.11,.23),'wood2')
    for i in range(12):a.box((-.36+(i-5.5)*.21,-2.28,.34),(.20,1.15,.055),'wood3' if i%4==0 else 'wood2')
    for x in [-1.61,.89]:
        a.box((x,-2.78,1.35),(.13,.13,2.11),'wood')
        a.beam((x,-2.78,1.89),(x+(.34 if x<0 else -.34),-2.78,2.34),.09,color='wood3')
    a.box((-.36,-2.27,2.37),(2.89,1.36,.13),'wood_dark',rot=(.11,0,0))
    for i in range(10):a.box((-.36+(i-4.5)*.28,-2.27,2.46),(.269,1.41,.075),'tile2' if i%3 else 'tile',rot=(.11,0,0))
    for j in range(2):a.box((-.32,-2.99-j*.22,.19-j*.07),(1.07,.27,.13),'stone2')
    # Chimney with brick courses and dark open mouth.
    for j in range(7):
        a.box((.91,.85,3.35+j*.17),(.48,.52,.156),'tile2' if j%2 else 'stone')
        a.box((.91+(.12 if j%2 else -.12),.579,3.35+j*.17),(.025,.016,.15),'stone_dark')
    a.box((.91,.85,4.47),(.61,.64,.13),'tile')
    a.box((.91,.85,4.55),(.37,.39,.055),'dark')
    # Right side window.
    a.box((1.75,.2,1.6),(.06,.80,.80),'wood_dark')
    a.box((1.79,.2,1.6),(.04,.65,.65),'glass')
    for y in [-.14,.2,.54]:a.box((1.82,y,1.6),(.04,.04,.72),'cream')
    a.box((1.82,.2,1.6),(.04,.72,.04),'cream')
    for y in [-1.1,.95]:plant(a,(2.04,y,0),.8)
    plant(a,(-1.33,-2.43,.37),.57)
    lantern(a,(-.81,-1.98,1.58),.75)
    for y in [-1.2,.65]:fence(a,2.65,y,1.65,math.pi/2)
    barrel(a,(-2.01,.89,0))
    return a.finish()

def windmill():
    a=Asset(10,'windmill','风车')
    a.cyl((0,0,0),(0,0,.19),1.14,'stone_dark',8)
    a.cyl((0,0,.19),(0,0,3.49),1.02,'stone2',8,r2=.70)
    # Masonry courses and alternating joints on the taper.
    for row in range(10):
        z=.32+row*.30;r=1.02-(z-.19)/3.3*.32
        a.ring((0,0,z),r+.015,r-.015,.027,'stone','Z',n=8)
        for i in range(8):
            t=(i+(row%2)*.5)*math.tau/8
            a.box((r*.94*math.cos(t),r*.94*math.sin(t),z+.13),(.035,.035,.21),'stone')
    a.cyl((0,0,3.48),(0,0,4.04),.96,'slate',8,r2=.18)
    a.box((0,-.96,.64),(.48,.1,1.08),'wood_dark')
    for x in [-.27,.27]:a.box((x,-1.01,.66),(.06,.08,1.15),'cream')
    a.box((0,-1.01,1.24),(.61,.08,.08),'cream')
    window(a,0,-.81,2.14,.30,.47)
    rotor=a.part('windmill_rotor',(0,-1.02,3.28))
    a.cyl((0,-.82,3.28),(0,-1.20,3.28),.18,'wood_dark',12,part=rotor)
    # Four canvas lattice sails, oriented diagonally.
    for k in range(4):
        t=math.pi/4+k*math.pi/2;u=Vector((math.cos(t),0,math.sin(t)));v=Vector((-math.sin(t),0,math.cos(t)));c=Vector((0,-1.21,3.28))
        a.beam(c,c+u*2.38,.10,color='wood',part=rotor)
        for off in [-.26,.26]:a.beam(c+u*.72+v*off,c+u*2.34+v*off,.065,color='wood_dark',part=rotor)
        for j in range(6):
            s=.78+j*.29
            a.beam(c+u*s-v*.26,c+u*s+v*.26,.052,color='wood',part=rotor)
        for j in range(5):
            s=.92+j*.29;center=c+u*s
            a.mesh([center-u*.12-v*.23,center+u*.12-v*.23,center+u*.12+v*.23,center-u*.12+v*.23],[(0,1,2,3)],'cream',rotor)
    a.cyl((0,-1.22,3.28),(0,-1.31,3.28),.15,'red',12,part=rotor)
    # Fence leaves entrance open.
    for x in [-1.42,1.42]:fence(a,x,.20,2.30,math.pi/2)
    fence(a,0,1.35,2.8)
    a.box((0,-1.13,.08),(.75,.66,.16),'stone')
    return a.finish()

def water_tower():
    a=Asset(11,'water_tower','水塔')
    for sx in [-1,1]:
        for sy in [-1,1]:
            a.box((sx*.88,sy*.88,.12),(.40,.40,.24),'stone')
            a.beam((sx*.88,sy*.88,.23),(sx*.65,sy*.65,2.75),.17,color='wood_dark')
    for side in [-1,1]:
        for z in [.52,1.6,2.66]:
            r=.88-(z-.23)/2.52*.23
            a.beam((-r,side*r,z),(r,side*r,z),.14,color='wood')
            a.beam((side*r,-r,z),(side*r,r,z),.14,color='wood')
        a.beam((-.86,side*.86,.55),(.70,side*.70,2.52),.11,color='wood2')
        a.beam((.86,side*.86,.55),(-.70,side*.70,2.52),.11,color='wood2')
        a.beam((side*.86,-.86,.55),(side*.70,.70,2.52),.11,color='wood2')
        a.beam((side*.86,.86,.55),(side*.70,-.70,2.52),.11,color='wood2')
    a.box((0,0,2.78),(2.04,2.04,.18),'wood_dark')
    a.cyl((0,0,2.90),(0,0,4.39),.88,'wood2',16)
    for i in range(16):
        t=i*math.tau/16;a.beam((.878*math.cos(t),.878*math.sin(t),2.91),(.878*math.cos(t),.878*math.sin(t),4.4),.021,color='wood_dark')
    for z in [2.96,3.38,3.95,4.34]:a.ring((0,0,z),.909,.863,.10,'metal','Z',n=16)
    a.cyl((0,0,4.40),(0,0,4.87),1.04,'wood',12,r2=.12)
    a.cyl((0,0,4.88),(0,0,4.99),.15,'metal',10)
    for x in [-.20,.20]:a.beam((x,-1.07,.06),(x,-1.07,3.13),.048,color='wood2')
    for i in range(13):a.beam((-.23,-1.08,.16+i*.23),(.23,-1.08,.16+i*.23),.046,color='wood3')
    a.cyl((.63,.35,3.05),(.98,.35,3.05),.07,'metal',10)
    a.cyl((.98,.35,3.05),(.98,.35,.35),.065,'metal',10)
    a.cyl((.98,.35,.35),(.98,-.03,.35),.065,'metal',10)
    a.ring((1.05,.35,.72),.13,.085,.035,'red','X',n=10)
    return a.finish()

def build():return [barn(),tool_shed(),farmhouse(),windmill(),water_tower()]
