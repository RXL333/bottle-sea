"""Main island reference 02–12. Original editable low-poly geometry."""
from main_common import *
PALETTE.update({'ocean':'176696','ocean2':'288cc2','gold':'e8a52b','coral':'ee5364','purple':'9e58c0','teal':'28a69b','orange':'f48728'})

def rope(a,points,r=.025,part='body'):
    for p,q in zip(points,points[1:]):a.cyl(p,q,r,'cream',6,part=part)

def palm(a,x,y,z=0,s=1):
    for i in range(9):a.cyl((x+i*.025*s,y,z+i*.26*s),(x+(i+1)*.025*s,y,z+(i+1)*.26*s),(.14-i*.006)*s,'wood2' if i%2 else 'wood',8)
    cx=x+.225*s;cz=z+2.34*s
    for j in range(7):
        t=j*math.tau/7
        for i in range(4):
            d=(i+.5)*.3*s; zz=cz+(.28-.08*i*i)*s
            d0=i*.3*s;d1=(i+1)*.3*s
            z0=cz+(.28-.08*max(0,i-.5)**2)*s;z1=cz+(.28-.08*(i+.5)**2)*s
            a.beam((cx+math.cos(t)*d0,y+math.sin(t)*d0,z0),(cx+math.cos(t)*d1,y+math.sin(t)*d1,z1),(.34-i*.055)*s,.10*s,'leaf2' if j%2 else 'green')
    for j in range(3):a.cyl((cx+math.cos(j*2)*.15*s,y+math.sin(j*2)*.15*s,cz-.12*s),(cx+math.cos(j*2)*.15*s,y+math.sin(j*2)*.15*s,cz+.03*s),.13*s,'wood_dark',8)

def sailboat():
    a=Asset(2,'main_sailboat','主岛帆船','waterline')
    # Closed stepped hull from longitudinal sections, pointed bow at -Y.
    stations=[(-2.65,.10),(-2.18,.72),(-1.45,1.05),(0,1.15),(1.5,1.02),(2.1,.75)]
    for level,(z0,z1,f0,f1,col) in enumerate([(-.6,-.28,.48,.78,'ocean'),(-.28,.13,.78,1,'wood'),(.13,.43,1,1,'cream'),(.43,.58,1,1,'wood_dark')]):
        for (y,w),(yy,ww) in zip(stations,stations[1:]):
            for side in [-1,1]:
                a.mesh([(side*w*f0,y,z0),(side*ww*f0,yy,z0),(side*ww*f1,yy,z1),(side*w*f1,y,z1)],[(0,1,2,3)],col)
        for y,w in [stations[0],stations[-1]]:a.box((0,y,(z0+z1)/2),(max(.1,w*(f0+f1)),.045,z1-z0),col)
    for i in range(24):
        y=-2.53+i*.19
        w=next((w+(ww-w)*(y-y0)/(y1-y0) for (y0,w),(y1,ww) in zip(stations,stations[1:]) if y0<=y<=y1),.7)
        a.box((0,y,.18),(w*1.88,.18,.08),'wood2' if i%3 else 'wood3')
    for (y,w),(yy,ww) in zip(stations,stations[1:]):
        a.mesh([(-w*.48,y,-.6),(w*.48,y,-.6),(ww*.48,yy,-.6),(-ww*.48,yy,-.6)],[(3,2,1,0)],'ocean')
    for side in [-1,1]:
        for y,w in stations[1:]:
            a.box((side*w,y,.72),(.085,.085,.40),'wood_dark')
        for (y,w),(yy,ww) in zip(stations[1:],stations[2:]):a.beam((side*w,y,.92),(side*ww,yy,.92),.085,color='wood2')
        for y in [-1.3,-.6,.1,.8,1.5]:a.ring((side*1.13,y,.10),.09,.055,.04,'metal','X',n=8)
    for y,h in [(.55,4.9),(-1.12,3.75)]:
        a.cyl((0,y,.20),(0,y,h),.065,'wood_dark',10)
        for z in [.8,1.8,2.8,3.5]:
            if z<h:a.ring((0,y,z),.081,.064,.10,'metal','Z',n=8)
        a.beam((0,y,1.18),(0,y-1.65,1.18),.07,color='wood2')
        p=a.part('mainsail' if y>0 else 'jib',(0,y,h-.15))
        # Slight billow with double-sided cloth geometry.
        v=[(0,y,h-.20),(0,y,1.28),(0,y-1.65,1.28),(.17,y-.56,2.25)]
        cloth=v+[(x+.012,yy,z) for x,yy,z in v]
        a.mesh(cloth,[(0,1,3),(1,2,3),(2,0,3),(7,5,4),(7,6,5),(7,4,6),(0,4,5,1),(1,5,6,2),(2,6,4,0)],'cream',p)
        rope(a,[(0,y,h-.2),(0,y-1.65,1.28),(0,y,1.28),(0,y,h-.2)],.012)
        for side in [-1,1]:rope(a,[(side*.97,y+.7,.85),(0,y,h-.1),(side*.77,-2,.85)],.013)
    a.beam((0,-1.8,.64),(0,-3.2,1),.075,color='wood_dark')
    a.box((0,.78,4.76),(.04,.49,.24),'red');a.box((0,1.09,4.7),(.04,.2,.18),'red2')
    # Navy anchor emblem attached to the large sail.
    a.beam((.025,-.02,2.25),(.025,-.02,3.04),.075,color='ocean')
    a.beam((.025,-.29,2.83),(.025,.23,2.83),.07,color='ocean')
    for side in [-1,1]:a.beam((.025,-.02,2.25),(.025,-.02+side*.28,2.48),.075,color='ocean')
    barrel(a,(.52,1.15,.23),.8);crate(a,(-.48,1.05,.23),.48)
    lantern(a,(.63,1.99,.93),.8)
    a.part('rudder',(0,2.15,0));a.box((0,2.24,-.23),(.12,.52,.67),'wood_dark','rudder')
    return a.finish()

def cottage():
    a=Asset(3,'main_cottage','主岛小屋')
    a.box((0,0,.17),(3.8,3.45,.34),'stone')
    for x in [-1.7,1.7]:a.box((x,0,1.6),(.16,3.15,2.54),'cream')
    a.box((0,1.5,1.6),(3.4,.16,2.54),'cream')
    for x,w in [(-1.18,1.04),(1.02,1.36)]:a.box((x,-1.5,1.6),(w,.16,2.54),'cream')
    a.box((-.16,-1.5,2.58),(.86,.16,.58),'cream')
    for x in [-1.73,1.73]:
        for y in [-1.52,1.52]:a.box((x,y,1.62),(.17,.17,2.61),'wood2')
    for y in [-1.59,1.59]:a.box((0,y,2.84),(3.55,.13,.15),'wood')
    gable(a,0,0,3.45,3.1,2.84,4.1,'cream')
    roof(a,0,0,4,3.85,2.77,4.18,'ocean')
    for side in [-1,1]:
        for row in range(7):
            t=(row+.5)/7
            for j in range(11):a.box((side*2*t,-1.75+j*.35,4.18-1.41*t+.1),(.38,.32,.095),'ocean2' if (row+j)%4==0 else 'ocean',rot=(0,side*math.atan2(1.41,2),0))
        a.beam((0,-1.96,4.25),(side*2.05,-1.96,2.76),.17,color='wood2')
        a.beam((0,-1.63,4.03),(side*1.5,-1.63,2.88),.11,color='wood')
    a.box((0,-1.64,3.35),(.12,.12,.92),'wood')
    door=a.part('front_door',(-.61,-1.61,.34))
    a.box((-.2,-1.61,1.32),(.79,.105,1.96),'wood','front_door')
    for x in [-.47,-.2,.07]:a.box((x,-1.675,1.2),(.025,.025,1.54),'wood_dark',door)
    a.box((-.2,-1.68,1.83),(.45,.025,.58),'glass',door)
    a.cyl((.08,-1.7,1.19),(.08,-1.77,1.19),.045,'gold',8,part=door)
    window(a,1,-1.62,1.77,.6,.72)
    for side in [-1,1]:
        for yy in [-.25,.78]:
            a.box((side*1.79,yy,1.75),(.08,.66,.83),'wood_dark')
            a.box((side*1.84,yy,1.75),(.04,.52,.68),'glass')
            a.box((side*1.87,yy,1.75),(.04,.035,.72),'cream')
            a.box((side*1.87,yy,1.75),(.04,.56,.035),'cream')
            a.box((side*1.84,yy,1.30),(.20,.78,.08),'wood2')
    a.box((0,-2.05,.34),(3.8,1.1,.18),'wood2')
    for i in range(3):a.box((-.15,-2.86+i*.24,.07+i*.09),(1.36,.48,.14+i*.18),'stone2')
    for x in [-1.7,1.7]:
        a.box((x,-2.42,1.31),(.14,.14,1.9),'wood')
        for yy in [-2.05,-1.68]:a.box((x,yy,.65),(.12,.12,.58),'wood')
        a.beam((x,-2.5,.95),(x,-1.48,.95),.10,color='wood2')
    a.box((0,-2.07,2.4),(3.85,1.22,.12),'wood2',rot=(.15,0,0))
    for x in [-1.1,.6]:plant(a,(x,-2.43,.43),.55)
    lantern(a,(-.97,-1.85,1.65),.85)
    for z in [3.18,3.48,3.78,4.08,4.38]:a.box((1.15,.75,z),(.50,.53,.28),'stone2' if int(z*10)%2 else 'cream')
    a.box((1.15,.75,4.59),(.66,.67,.14),'stone');a.box((1.15,.75,4.67),(.34,.35,.025),'dark')
    barrel(a,(2.07,-.95,0),1.1)
    component(a,'palm_left',(-2.6,.6,0),lambda:palm(a,-2.6,.6,s=.95))
    component(a,'palm_right',(2.5,1.35,0),lambda:palm(a,2.5,1.35,s=.85))
    return a.finish()

def lighthouse():
    a=Asset(4,'main_lighthouse','灯塔')
    rng=random.Random(4)
    for ring,r,n,z,h in [(0,1.6,13,.4,.8),(1,1.2,10,1.02,.9),(2,.82,8,1.51,.5)]:
        for i in range(n):
            t=i*math.tau/n;a.box((r*math.cos(t),r*math.sin(t),z),(.65+rng.random()*.22,.68,h+rng.random()*.2),'stone_dark' if i%3==0 else 'stone',rot=(0,0,t))
            if i%3==0:a.box((r*math.cos(t),r*math.sin(t),z+h/2+.04),(.37,.31,.10),'leaf')
    a.cyl((0,0,1.6),(0,0,1.85),1.03,'stone2',12)
    for i in range(6):
        z=1.84+i*.57;a.cyl((0,0,z),(0,0,z+.57),.66-i*.035,'red' if i in [2,3] else 'cream',12,r2=.66-(i+1)*.035)
    for z in [2.36,3.51,4.64]:
        for t in [0,math.pi/2,math.pi,math.pi*1.5]:a.box((.50*math.sin(t),-.50*math.cos(t),z),(.16,.09,.29),'dark',rot=(0,0,t))
    a.box((0,-.655,2.12),(.3,.06,.54),'wood_dark')
    a.cyl((0,0,5.2),(0,0,5.34),.86,'metal',12)
    for i in range(12):
        t=i*math.tau/12;x=.81*math.cos(t);y=.81*math.sin(t);a.beam((x,y,5.32),(x,y,5.75),.045,color='dark')
    a.ring((0,0,5.76),.85,.80,.06,'dark','Z',n=12)
    a.cyl((0,0,5.36),(0,0,6.21),.47,'fire2',8)
    for i in range(8):
        t=i*math.tau/8;a.beam((.5*math.cos(t),.5*math.sin(t),5.34),(.5*math.cos(t),.5*math.sin(t),6.24),.05,color='dark')
    a.cyl((0,0,6.20),(0,0,6.35),.66,'red_dark',12)
    a.cyl((0,0,6.35),(0,0,6.77),.68,'red',12,r2=.13)
    a.cyl((0,0,6.76),(0,0,6.94),.105,'red2',8,r2=0)
    a.part('light_rotor',(0,0,5.79));a.box((0,-.53,5.79),(.3,.12,.35),'yellow2','light_rotor')
    return a.finish()

def platform(a,w=3,d=2.6):
    for i in range(14):a.box((0,-d/2+(i+.5)*d/14,-.065),(w,d/14-.018,.13),'wood3' if i%4==0 else 'wood2')
    for x in [-w*.39,w*.39]:a.box((x,0,-.21),(.18,d+.1,.2),'wood_dark')

def post(a,x,y):
    a.box((x,y,-.28),(.23,.23,1.5),'wood');a.box((x,y,.50),(.3,.3,.10),'wood3')
    for z in [-.85,.27]:a.box((x,y,z),(.25,.25,.13),'metal')
    for z in [.07,.12]:a.ring((x,y,z),.18,.14,.036,'cream','Z',n=8)

def dock(fishing=False):
    a=Asset(6 if fishing else 5,'main_fishing_deck' if fishing else 'main_dock_kit','钓鱼台' if fishing else '主码头套件','deck')
    component(a,'platform',(0,0,0),lambda:platform(a))
    for i,(x,y) in enumerate([(-1.4,-1.2),(1.4,-1.2),(-1.4,1.2),(1.4,1.2),(-1.4,0),(1.4,0)]):
        component(a,'pile_'+str(i),(x,y,0),lambda x=x,y=y:post(a,x,y))
    def rails():
        for side in [-1,1]:
            for y,yy in [(-1.2,0),(0,1.2)]:rope(a,[(side*1.4,y,.30),(side*1.4,(y+yy)/2,.22),(side*1.4,yy,.30)],.04)
    component(a,'rope_rails',(0,0,0),rails)
    def lamp():
        a.box((-1.4,1.2,1.1),(.14,.14,2.2),'wood');a.beam((-1.4,1.2,2.08),(-.9,1.2,2.08),.11,color='wood2');lantern(a,(-.9,1.2,1.6),1)
    component(a,'lamp',(-1.4,1.2,0),lamp)
    def life():
        a.ring((.78,-1.37,.21),.31,.19,.11,'cream','Y')
        for x,z in [(.78,.47),(.78,-.05),(.52,.21),(1.04,.21)]:a.box((x,-1.44,z),(.11,.04,.11),'red')
    component(a,'life_ring',(.78,-1.37,.21),life)
    if not fishing:
        def stairs():
            for x in [-.46,.46]:a.beam((x,-1.1,0),(x,-2.25,-.95),.1,color='wood_dark')
            for i in range(5):a.box((0,-1.28-i*.21,-.07-i*.18),(.96,.28,.11),'wood2')
        component(a,'stairs',(0,-1.2,0),stairs);barrel(a,(.9,.72,0),.85)
    else:
        a.cyl((.7,.3,0),(.7,.3,.43),.2,'metal',10,r2=.26,caps=False)
        a.ring((.7,.3,.44),.28,.23,.05,'steel','Z')
        def rod():
            pts=[(.55,.35,.05),(.45,.06,.85),(.34,-.27,1.60),(.21,-.70,2.23),(.06,-1.19,2.7)]
            for i in range(4):a.cyl(pts[i],pts[i+1],.035-i*.006,'wood_dark',8)
            rope(a,[pts[-1],(.06,-1.2,.33)],.007);a.box((.06,-1.2,.4),(.075,.075,.18),'red')
        component(a,'fishing_rod',(.55,.35,.05),rod)
        crate(a,(-.75,.48,0),.45)
    return a.finish()

def treasure():
    a=Asset(7,'treasure_chest','宝箱')
    a.box((0,0,.10),(1.45,1.03,.16),'wood_dark')
    for x in [-.68,.68]:a.box((x,0,.47),(.09,1.03,.85),'ocean')
    for y in [-.47,.47]:a.box((0,y,.47),(1.36,.09,.85),'ocean')
    for i in range(24):
        x=((i*7)%11-5)*.105;y=((i*3)%7-3)*.105
        a.cyl((x,y,.63),(x,y,.67),.08,'gold' if i%2 else 'yellow2',8)
    for i in range(6):
        for y in [-.53,.53]:a.box(((i-2.5)*.23,y,.47),(.215,.065,.7),'ocean' if i%2 else 'ocean2')
    for z in [.11,.85]:a.box((0,0,z),(1.57,1.14,.13),'gold')
    for x in [-.69,.69]:
        for y in [-.49,.49]:a.box((x,y,.47),(.13,.14,.84),'gold')
    p=a.part('lid',(0,.49,.91))
    for i in range(9):
        t=(i+.5)*math.pi/9;y=-.52*math.cos(t);z=.89+.40*math.sin(t)
        a.box((0,y,z),(1.48,.19,.10),'wood2' if i%2 else 'wood',p,(-t+math.pi/2,0,0))
        for x in [-.67,.67]:a.box((x,y,z+.035),(.12,.19,.13),'gold',p,(-t+math.pi/2,0,0))
    for x in [-.71,.71]:a.mesh([(x,-.52*math.cos(i*math.pi/9),.89+.4*math.sin(i*math.pi/9)) for i in range(10)],[tuple(range(10))],'ocean',p)
    a.box((0,-.595,.68),(.29,.09,.30),'gold');a.box((0,-.65,.69),(.07,.025,.12),'dark')
    for x in [-.68,.68]:
        for z in [.13,.82]:a.cyl((x,-.58,z),(x,-.63,z),.035,'yellow2',6)
    for i in range(5):
        t=i*math.tau/5;a.beam((.3,-.594,.40),(.3+math.sin(t)*.15,-.597,.4+math.cos(t)*.15),.05,color='cream')
    return a.finish()

def anchor():
    a=Asset(8,'ancient_anchor','船锚')
    a.beam((0,0,.26),(.32,0,2.6),.20,.19,'metal')
    a.beam((-.65,0,1.94),(.94,0,1.73),.18,.20,'metal')
    a.ring((.35,0,2.78),.24,.13,.17,'metal','Y',n=8)
    for side in [-1,1]:
        pts=[(0,0,.28),(side*.43,0,.40),(side*.76,0,.71),(side*.90,0,1.10)]
        for p,q in zip(pts,pts[1:]):a.beam(p,q,.20,.20,'metal')
        a.mesh([(side*.64,-.12,1.02),(side*1.06,-.12,1.03),(side*.97,-.12,1.43),(side*.64,.12,1.02),(side*1.06,.12,1.03),(side*.97,.12,1.43)],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'metal')
    points=[]
    for i in range(90):
        t=i*math.tau/15;z=.40+i*.022;points.append((z*.13+.19*math.cos(t),.19*math.sin(t),z))
    rope(a,points,.045)
    for i in range(14):a.ring((.45+i*.065,.08,2.78-i*.20),.14,.081,.055,'dark','Y' if i%2 else 'X',n=8)
    for x,z in [(-.6,.42),(.2,.29),(.52,.57)]:a.box((x,-.13,z),(.21,.06,.12),'leaf')
    return a.finish()

def ruins():
    a=Asset(9,'underwater_ruins','水下遗迹套件')
    def column(x,y,h):
        a.box((x,y,.12),(.76,.76,.24),'stone_dark')
        for i in range(round(h/.28)):
            a.box((x,y,.31+i*.28),(.46 if i%4 else .51,.46 if i%4 else .51,.26),'stone2' if i%3 else 'stone')
            if i%3==0:a.box((x+.24,y-.08,.32+i*.28),(.025,.13,.16),'leaf')
        a.box((x,y,h+.28),(.68,.68,.22),'stone2')
    def arch():
        for x in [-.83,.83]:column(x,0,1.75)
        for i in range(5):a.box((-.66+i*.33,0,2.1),(.31,.58,.37),'stone2' if i%2 else 'stone')
    component(a,'arch',(0,0,0),arch)
    component(a,'short_column',(1.8,.25,0),lambda:column(1.8,.25,1.1))
    component(a,'tall_column',(3,.25,0),lambda:column(3,.25,2.55))
    for x,y in [(-1.1,-.45),(.8,.5),(2.85,-.38)]:a.box((x,y,.15),(.37,.4,.3),'stone_dark')
    return a.finish()

def reef(seaweed=False):
    a=Asset(11 if seaweed else 10,'seagrass_kit' if seaweed else 'coral_kit','海草套件' if seaweed else '珊瑚套件')
    for j,col in enumerate(['teal','leaf','green2','green'] if seaweed else ['coral','purple','orange','ocean2']):
        x=(j%2)*1.5;y=(j//2)*1.5
        def patch(x=x,y=y,j=j,col=col):
            for k in range(5):
                t=k*1.25;a.box((x+math.cos(t)*.32,y+math.sin(t)*.27,.1),(.33,.31,.2),'stone_dark' if k%2 else 'stone')
            for k in range(5):
                xx=x+(k-2)*.13;yy=y+((k%2)-.5)*.18;h=.72+(k%3)*.24
                for i in range(5):
                    z=.18+i*h/5;off=math.sin(i*.8+k)*.12
                    a.box((xx+off,yy,z+h/10),(.1 if seaweed else .14,.09 if seaweed else .14,h/5+.025),col)
                    if not seaweed and i in [1,3]:
                        side=1 if k%2 else -1;a.box((xx+off+side*.14,yy,z),(.3,.12,.12),col);a.box((xx+off+side*.25,yy,z+.12),(.12,.12,.3),col)
        component(a,('seagrass_' if seaweed else 'coral_')+str(j),(x,y,0),patch)
    return a.finish()

def fish():
    a=Asset(12,'tropical_fish','热带鱼群','center')
    for j,col in enumerate(['orange','yellow','ocean','teal','gold']):
        x=(j%3)*1.25;y=(j//3)*1.0;z=.48
        def single(x=x,y=y,z=z,j=j,col=col):
            # Bevelled oval silhouette; yellow butterfly fish is taller.
            height=.36 if j==1 else .23;width=.18 if j!=2 else .23
            cross=[(-.55,-1),(.55,-1),(1,-.5),(1,.5),(.55,1),(-.55,1),(-1,.5),(-1,-.5)]
            vertices=[(x+u*width*scale,y+yy,z+v*height*scale) for yy,scale in [(-.36,.65),(-.14,1),(.22,.85),(.38,.40)] for u,v in cross]
            faces=[tuple(reversed(range(8))),tuple(range(24,32))]
            for k in range(3):
                for n in range(8):faces.append((k*8+n,k*8+(n+1)%8,(k+1)*8+(n+1)%8,(k+1)*8+n))
            a.mesh(vertices,faces,col)
            a.box((x,y-.4,z),(.29,.17,.30),col)
            a.box((x,y-.50,z-.04),(.17,.07,.1),'red_dark' if j==0 else 'wood_dark')
            for side in [-1,1]:
                a.box((x+side*.182,y-.25,z+.1),(.025,.14,.14),'white');a.box((x+side*.20,y-.28,z+.1),(.024,.075,.09),'black')
                a.box((x+side*.23,y+.03,z-.05),(.20,.21,.055),'yellow' if j>1 else col,rot=(0,side*.4,0))
            for yy in [-.12,.16]:a.box((x,y+yy,z),(.365,.10,.455),'white' if j==0 else 'dark' if j==1 else 'ocean2')
            a.box((x,y+.14,z+.26),(.08,.43,.12),'dark' if j<2 else col)
            a.box((x,y+.43,z),(.10,.22,.17),col)
            a.box((x,y+.60,z),(.12,.16,.44),'white' if j==0 else col)
        component(a,'fish_'+str(j),(x,y,z),single)
    return a.finish()

def palm_asset():
    a=Asset(13,'island_palm','额外：椰树');palm(a,0,0,s=1.3);return a.finish()

BUILDERS=[sailboat,cottage,lighthouse,dock,lambda:dock(True),treasure,anchor,ruins,reef,lambda:reef(True),fish,palm_asset]


