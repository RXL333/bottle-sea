from farm_common import *
from finalize_farm import SLUGS,descendants,bounds

def build():
    manifest=json.loads((OUTPUT/'manifest.json').read_text(encoding='utf-8'))
    s=bpy.data.scenes.new('Farm_00_Asset_Catalog');bpy.context.window.scene=s
    for idx,slug in enumerate(SLUGS):
        src=bpy.data.scenes[f'Farm_{idx+1:02d}_{slug}'];root=next(o for o in src.objects if o.get('asset_id')==slug)
        low,high=bounds(descendants(root));size=max(high-low);scale=3.3/size
        x=(idx%5-2)*4.8;y=(idx//5-1.5)*5.1
        copy_map={}
        for o in descendants(root):
            c=o.copy();s.collection.objects.link(c);copy_map[o]=c
        for o,c in copy_map.items():
            c.parent=copy_map.get(o.parent);c.matrix_parent_inverse=o.matrix_parent_inverse.copy();c.matrix_basis=o.matrix_basis.copy()
        copy_map[root].scale=(scale,)*3;copy_map[root].location=(x-(low.x+high.x)/2*scale,y-(low.y+high.y)/2*scale,-low.z*scale)
        data=bpy.data.curves.new(f'Label_{idx+1:02d}',type='FONT');data.body=f'{idx+1:02d}  '+slug.replace('_',' ').upper();data.size=.23;data.align_x=next(v.identifier for v in data.bl_rna.properties['align_x'].enum_items if v.identifier=='CENTER')
        label=bpy.data.objects.new('Label_'+slug,data);s.collection.objects.link(label);label.location=(x,y-2.2,.01);data.materials.append(mat('cream'))
    camdata=bpy.data.cameras.new('CatalogCamera');cam=bpy.data.objects.new('CatalogCamera',camdata);s.collection.objects.link(cam)
    cam.location=(15,-27,33);target=Vector((0,0,.8));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type=next(v.identifier for v in camdata.bl_rna.properties['type'].enum_items if v.identifier=='ORTHO');camdata.ortho_scale=32;s.camera=cam
    try:s.render.engine='BLENDER_WORKBENCH'
    except TypeError:pass
    sh=s.display.shading
    for prop,val in [('color_type','MATERIAL'),('light','STUDIO'),('background_type','WORLD'),('cavity_type','BOTH')]:
        if val in [v.identifier for v in sh.bl_rna.properties[prop].enum_items]:setattr(sh,prop,val)
    sh.show_shadows=True;sh.show_cavity=True
    s.world=bpy.data.worlds.new('CatalogWorld');s.world.color=(.08,.13,.17);s.view_settings.exposure=.75
    s.render.resolution_x=1800;s.render.resolution_y=1500;s.render.resolution_percentage=100;s.render.filepath=str(SOURCE/'catalog_scene.png')
    scenes={s}|{bpy.data.scenes[f'Farm_{i+1:02d}_{slug}'] for i,slug in enumerate(SLUGS)}
    bpy.data.libraries.write(str(BASE/'assets/blender/farm_asset_library.blend'),scenes,fake_user=True)
    bpy.ops.render.render(write_still=True)
    print('Catalog scene and library saved')

if __name__=='__main__':build()
