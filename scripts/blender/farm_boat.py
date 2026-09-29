from farm_common import *

def build():
    source=bpy.data.scenes.get('Farm_01_TransportBoat')
    if not source:
        with bpy.data.libraries.load(str(BASE/'assets/blender/transport_boat.blend'),link=False) as (src,dst):
            dst.scenes=[n for n in src.scenes if n=='Farm_01_TransportBoat']
        source=dst.scenes[0]
    a=Asset(1,'transport_boat','交通小船','waterline')
    colors={'cream':'cream','red':'red','wood':'wood','wood_light':'wood2','dark':'dark','glass':'glass','brass':'yellow','roof':'white','rubber':'rubber','white':'white','crate':'red_dark'}
    for o in source.objects:
        if o.type!='MESH':continue
        key=o.data.materials[0].name.removeprefix('Boat_').split('.')[0]
        n=o.name
        group='hull' if n.startswith('Hull') else 'cabin' if n.startswith(('Cabin','Front','Side','Rear','Roof','Window','Vent','Chimney','Door')) else 'mast' if n.startswith(('Mast','Navigation')) else 'deck_fittings'
        a.part(group)
        a.mesh([o.matrix_world@v.co for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons],colors[key],group)
    a.notes=['Optimized from the first Blender boat; semantic parts retained, static geometry batched by material.','Website original boat scale differs; start near 0.27 uniform scale and verify dock clearance.']
    return [a.finish()]
