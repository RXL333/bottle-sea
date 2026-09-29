from farm_common import *

def build():
    a=Asset(21,'orchard_tree','果园树')
    a.cyl((0,0,0),(0,0,2.1),.17,'wood_dark',7,r2=.09)
    for x,y,z in [(-.7,.1,2.2),(.65,.2,2.4),(.12,-.56,2.5)]:a.beam((0,0,1.45),(x,y,z),.11,color='wood')
    for i,(x,y,z,w) in enumerate([(-.65,0,2.45,1.25),(.6,.1,2.65,1.4),(0,-.5,2.7,1.2),(0,.48,2.95,1.18),(-.12,0,3.34,1.28)]):
        a.box((x,y,z),(w,w*.83,.70),'leaf' if i%2 else 'leaf2')
    for x,y,z in [(-.85,-.39,2.23),(.92,-.24,2.51),(.20,-.87,2.52),(-.23,.91,2.92)]:a.box((x,y,z),(.13,.13,.15),'red2')
    tree=a.finish()
    a=Asset(22,'wheat_cluster','麦穗簇')
    for i,(x,y,h) in enumerate([(-.16,0,.68),(0,.12,.8),(.17,0,.72),(0,-.17,.75)]):
        a.beam((x,y,0),(x,y,h),.025,color='hay')
        for j in range(3):
            a.box((x,y,h-.12+j*.075),(.10,.08,.12),'yellow2',rot=(0,(-1 if i%2 else 1)*.15,0))
        a.beam((x,y,.25),(x+.15,y,.49),.02,.045,'leaf2')
    crop=a.finish()
    a=Asset(23,'hay_bale','捆扎草垛')
    a.box((0,0,.32),(.9,.6,.64),'hay')
    for x in [-.3,.3]:
        a.box((x,0,.648),(.04,.61,.025),'wood')
        for y in [-.308,.308]:a.box((x,y,.32),(.04,.025,.65),'wood')
    for i in range(8):a.box(((i-3.5)*.105,-.311,.32),(.018,.012,.61),'yellow2')
    bale=a.finish()
    return [tree,crop,bale]
