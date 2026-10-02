"""Reference-sheet appearance only. Semantic joints remain compatible with gameplay."""
import math
from mathutils import Vector


def loft(a, rings, color, part, cut=.23):
    """Chamfered octagonal cross sections (z, half width, half depth, cx, cy)."""
    vertices=[]
    for z,w,d,x,y in rings:
        vertices.extend((x+u,y+v,z) for u,v in [
            (-w*(1-cut),-d),(w*(1-cut),-d),(w,-d*(1-cut)),(w,d*(1-cut)),
            (w*(1-cut),d),(-w*(1-cut),d),(-w,d*(1-cut)),(-w,-d*(1-cut))])
    faces=[tuple(reversed(range(8))),tuple(range((len(rings)-1)*8,len(rings)*8))]
    for j in range(len(rings)-1):
        faces.extend((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i) for i in range(8))
    a.mesh(vertices,faces,color,part)


def lock(a, x, y, z, width, length, depth, tilt=0, color='hair'):
    # Chiselled overlapping locks with a slanted, tapered tip, not square bangs.
    pts=[(-.5,.44),(.34,.52),(.52,.12),(.30,-.42),(-.13,-.54),(-.44,-.17)]
    vertices=[]
    for dy in [-depth/2,depth/2]:
        for u,v in pts:
            px,pz=u*width,v*length
            vertices.append((x+px*math.cos(tilt)+pz*math.sin(tilt),y+dy,z-px*math.sin(tilt)+pz*math.cos(tilt)))
    a.mesh(vertices,[tuple(reversed(range(6))),tuple(range(6,12))]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)],color,'Head')


def geometry(a):
    a.part('Hips',(0,0,.72));a.part('Spine',(0,0,.86),'Hips')
    a.part('Head',(0,0,1.09),'Spine');a.part('Hat',(0,0,1.425),'Head')
    a.part('Backpack',(0,.20,.94),'Spine')
    # Soft cheek planes, narrower chin, rounded temples.
    loft(a,[(1.139,.119,.108,0,-.019),(1.164,.185,.154,0,-.020),
            (1.198,.219,.181,0,-.022),(1.331,.224,.182,0,-.014),
            (1.412,.186,.153,0,.006)],'skin','Head',.26)
    a.box((0,0,1.107),(.110,.108,.092),'skin','Head',.018)
    # Back and side hair follows the skull with individually broken lower edges.
    loft(a,[(1.195,.168,.135,0,.057),(1.24,.223,.163,0,.042),
            (1.382,.237,.173,0,.026),(1.451,.184,.141,0,.022)],'hair','Head',.30)
    # Face sits in front of the hair cap; lower hair is restricted to sides/back.
    for i in range(7):
        x=(i-3)*.058
        lock(a,x,.192,1.242+(i%3)*.009,.078,.108,.034,(i-3)*.08,'hair')
    for i in range(6):
        lock(a,(i-2.5)*.065,.212,1.321+(i%2)*.018,.085,.112,.032,(i-2)*-.08,'hair_light' if i in [1,4] else 'hair')
    for side in [-1,1]:
        loft(a,[(1.168,.018,.044,side*.215,-.031),(1.195,.034,.052,side*.215,-.026),
                (1.247,.036,.051,side*.215,-.026),(1.265,.02,.033,side*.215,-.026)],'skin','Head',.33)
        a.box((side*.237,-.071,1.217),(.017,.008,.038),'skin_shadow','Head',.004)
        lock(a,side*.198,-.122,1.302,.084,.179,.078,side*-.15,'hair_dark')
        lock(a,side*.219,.068,1.293,.076,.192,.087,side*.22,'hair')
    # Swept, irregular fringe leaving both eyes and the central forehead visible.
    for x,z,w,h,angle,col in [(-.159,1.362,.091,.144,-.20,'hair'),
            (-.097,1.388,.102,.117,.47,'hair_light'),(-.029,1.408,.106,.10,.59,'hair'),
            (.058,1.403,.10,.091,-.12,'hair_light'),(.132,1.367,.087,.148,-.22,'hair')]:
        lock(a,x,-.180,z,w,h,.065,angle,col)
    for x in [-.089,.089]:
        a.box((x,-.207,1.270),(.044,.006,.067),'eye_white','Head',.002)
        a.box((x+.004,-.212,1.267),(.029,.007,.062),'eye','Head',.002)
        a.box((x-.003,-.217,1.286),(.007,.003,.009),'eye_white','Head')
        a.beam((x-.024,-.209,1.328),(x+.025,-.209,1.331),.013,.007,'hair_dark','Head')
        a.box((x*1.39,-.205,1.234),(.036,.003,.012),'blush','Head',.002)
    a.box((0,-.208,1.247),(.025,.019,.025),'skin','Head',.006)
    for start,end in [((-.033,-.206,1.208),(-.020,-.208,1.202)),
                      ((-.020,-.208,1.202),(.020,-.208,1.202)),
                      ((.020,-.208,1.202),(.033,-.206,1.208))]:
        a.beam(start,end,.004,.004,'smile','Head')
    # Shallow, broad straw brim and tapered crown, like the drawing.
    a.disc((0,-.012,1.435),.328,.277,.024,'straw_shadow','Hat',20,.99)
    a.disc((0,-.012,1.454),.329,.278,.023,'straw','Hat',20,.95)
    a.disc((0,-.012,1.470),.313,.264,.012,'straw_light','Hat',20,.94)
    a.disc((0,.006,1.515),.245,.211,.109,'straw','Hat',16,.87)
    a.disc((0,.006,1.577),.213,.184,.034,'straw_light','Hat',16,.89)
    a.disc((0,.004,1.495),.244,.213,.040,'denim','Hat',16,.96)
    # Fine straw weave stays broad enough to read as facets at game scale.
    # Shaped shirt, continuous trousers, thin bib and restrained stitching.
    loft(a,[(.785,.144,.107,0,0),(.895,.163,.113,0,0),
            (1.052,.175,.119,0,0),(1.105,.128,.102,0,0)],'shirt','Spine',.25)
    loft(a,[(.685,.137,.084,0,0),(.742,.17,.112,0,0),(.824,.157,.111,0,0)],'denim','Hips',.23)
    a.box((0,-.120,.928),(.254,.014,.210),'denim','Spine',.007)
    a.box((0,-.131,.917),(.133,.010,.084),'denim_light','Spine',.008)
    a.box((0,-.138,.955),(.12,.002,.004),'denim_dark','Spine')
    for side in [-1,1]:
        v=[(side*.022,-.114,1.111),(side*.101,-.120,1.086),(side*.066,-.133,1.043)]
        a.mesh(v+[(x,y+.012,z) for x,y,z in v],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'collar','Spine')
        a.beam((side*.111,-.139,1.009),(side*.123,-.122,1.114),.041,.012,'leather_dark','Spine')
        a.beam((side*.123,-.122,1.114),(side*.112,.106,1.118),.041,.012,'leather','Spine')
        a.beam((side*.112,.106,1.098),(side*.107,.133,.886),.040,.012,'leather_dark','Spine')
        # Brass buttons are small round discs facing the viewer.
        n=8;r=.015;yy=-.143;zz=1.006;xx=side*.11
        vertices=[(xx+r*math.cos(i*math.tau/n),y,zz+r*math.sin(i*math.tau/n)) for y in [yy,yy-.007] for i in range(n)]
        a.mesh(vertices,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],'brass','Spine')
        a.box((side*.158,-.011,.796),(.041,.227,.048),'leather','Hips',.004)
        a.box((side*.160,-.129,.796),(.014,.006,.016),'brass','Hips',.003)
    a.box((0,-.117,.805),(.267,.009,.025),'denim_dark','Hips',.003)
    for side,suffix in [(-1,'L'),(1,'R')]:
        x=side*.098
        a.part('Thigh_'+suffix,(x,0,.715),'Hips');a.part('Shin_'+suffix,(x,0,.438),'Thigh_'+suffix);a.part('Foot_'+suffix,(x,0,.158),'Shin_'+suffix)
        loft(a,[(.432,.064,.077,x,-.004),(.60,.072,.083,x,0),(.723,.079,.091,x,0)],'denim','Thigh_'+suffix,.23)
        loft(a,[(.177,.069,.075,x,0),(.294,.061,.072,x,-.001),(.445,.064,.077,x,-.004)],'denim','Shin_'+suffix,.19)
        a.beam((x+side*.058,-.070,.662),(x+side*.027,-.085,.607),.004,.003,'denim_dark','Thigh_'+suffix)
        a.box((x,0,.187),(.157,.166,.058),'cuff','Shin_'+suffix,.008)
        a.box((x,-.085,.172),(.137,.003,.006),'denim_light','Shin_'+suffix)
        a.box((x,-.031,.027),(.171,.246,.042),'sole','Foot_'+suffix,.017)
        loft(a,[(.042,.080,.106,x,-.037),(.102,.08,.105,x,-.037),(.142,.071,.085,x,-.030)],'leather','Foot_'+suffix,.28)
        a.box((x,.027,.151),(.134,.140,.108),'leather_dark','Foot_'+suffix,.021)
        a.box((x,-.039,.152),(.106,.091,.065),'leather_light','Foot_'+suffix,.011)
        for z,y in [(.168,-.074),(.144,-.085)]:a.box((x,y,z),(.078,.01,.009),'leather_dark','Foot_'+suffix,.002)
        a.part('Arm_'+suffix,(side*.211,0,1.068),'Spine')
        a.part('Forearm_'+suffix,(side*.263,0,.864),'Arm_'+suffix)
        a.part('Hand_'+suffix,(side*.292,-.004,.692),'Forearm_'+suffix)
        loft(a,[(.947,.069,.086,side*.244,0),(1.041,.077,.102,side*.213,0),
                (1.094,.054,.080,side*.192,0)],'shirt','Arm_'+suffix,.28)
        loft(a,[(.933,.074,.090,side*.249,0),(.964,.077,.094,side*.240,0)],'shirt_shadow','Arm_'+suffix,.18)
        loft(a,[(.850,.048,.052,side*.266,0),(.946,.052,.059,side*.247,0)],'skin','Arm_'+suffix,.27)
        loft(a,[(.689,.041,.045,side*.292,-.003),(.77,.047,.05,side*.280,-.002),(.870,.048,.052,side*.263,0)],'skin','Forearm_'+suffix,.27)
        loft(a,[(.624,.031,.038,side*.302,-.006),(.646,.047,.045,side*.299,-.006),(.698,.043,.045,side*.292,-.005)],'skin','Hand_'+suffix,.32)
        a.box((side*.260,-.032,.664),(.034,.044,.061),'skin','Hand_'+suffix,.011)
    # Stitched satchel with rounded flap, wraparound straps and inset clasps.
    a.box((0,.209,.927),(.286,.167,.300),'leather','Backpack',.033)
    a.box((0,.219,1.045),(.296,.184,.096),'leather_light','Backpack',.029)
    a.box((0,.301,.871),(.209,.026,.134),'leather','Backpack',.011)
    for side in [-1,1]:
        a.box((side*.079,.307,.931),(.034,.017,.252),'leather_dark','Backpack',.004)
        a.box((side*.079,.320,.969),(.054,.012,.053),'brass','Backpack',.005)
        a.box((side*.079,.327,.969),(.030,.005,.030),'leather_dark','Backpack',.003)
        a.box((side*.150,.223,.874),(.057,.131,.118),'leather_light','Backpack',.014)
        a.beam((side*.069,.163,1.078),(side*.044,.172,1.128),.022,.025,'leather_dark','Backpack')
    a.beam((-.044,.172,1.128),(.044,.172,1.128),.022,.025,'leather_dark','Backpack')


def proportions(a):
    """1.60 m stylised silhouette: lower body .64, torso .40, head and hat .56."""
    def height(z):
        if z<=.72:return z*(.64/.72)
        if z<=1.09:return .64+(z-.72)*(.40/.37)
        return 1.04+(z-1.09)*(.56/.504)
    def point(p):return Vector((p.x,p.y,height(p.z)))
    old={name:origin.copy() for name,origin in a.origins.items()}
    for part in a.parts:a.origins[part]=point(old[part])
    for (part,color),(vertices,faces) in a.buckets.items():
        vertices[:]=[tuple(point(Vector(p)+old[part])-a.origins[part]) for p in vertices]
    for part,obj in a.parts.items():
        if part=='Root':continue
        parent=next(name for name,value in a.parts.items() if value==obj.parent)
        obj.location=a.origins[part]-a.origins[parent]
