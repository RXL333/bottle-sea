"""Original four-stage voxel crops, authored/exported inside Blender.

Uses the farm pack's palette and material-batched mesh authoring. Does not clear
or save over the user's current file. Import, then call build_crop('wheat'), etc.
"""
import contextlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
import farm_common as farm

BASE = Path(__file__).resolve().parents[2]
SOURCE = BASE / 'assets/blender/farm/crops'
OUTPUT = BASE / 'public/models/farm/crops'
PREVIEWS = SOURCE / 'previews'
for directory in (SOURCE, OUTPUT, PREVIEWS):
    directory.mkdir(parents=True, exist_ok=True)

STAGES = ('seed', 'sprout', 'growing', 'mature')
LABELS = {'wheat': '小麦', 'corn': '玉米', 'potato': '土豆'}
STAGE_LABELS = ('刚播种', '幼苗', '生长', '成熟')
AUTHORED = {}


@contextlib.contextmanager
def export_paths():
    previous = farm.SOURCE, farm.OUTPUT, farm.PREVIEWS
    farm.SOURCE, farm.OUTPUT, farm.PREVIEWS = SOURCE, OUTPUT, PREVIEWS
    try:
        yield
    finally:
        farm.SOURCE, farm.OUTPUT, farm.PREVIEWS = previous


def leaf(asset, start, end, width, color='leaf2', thickness=.013):
    """Solid stepped/tapered blade: no alpha cards or double-sided planes."""
    start, end = Vector(start), Vector(end)
    direction = end - start
    lateral = Vector((-direction.y, direction.x, 0)).normalized()
    if not lateral.length:
        lateral = Vector((1, 0, 0))
    outline = [(0, -.13), (.18, -.5), (.62, -.5), (.82, -.26), (1, 0),
               (.82, .26), (.62, .5), (.18, .5), (0, .13)]
    verts = [start + direction * t + lateral * (w * width) + Vector((0, 0, z))
             for z in (-thickness / 2, thickness / 2) for t, w in outline]
    n = len(outline)
    faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    asset.mesh(verts, faces, color)


def blade(asset, x, y, z, angle, length, rise, width, color='leaf2'):
    leaf(asset, (x, y, z), (x + math.cos(angle) * length,
                         y + math.sin(angle) * length, z + rise), width, color)


def seed_bed(asset, crop):
    # Small freshly covered mounds sit on the existing FarmCropPresentation soil.
    for i, (x, y) in enumerate([(-.23, -.14), (0, .16), (.23, -.14)]):
        asset.box((x, y, .036), (.16, .11, .032), 'soil')
        if crop == 'potato':
            asset.box((x, y, .053), (.075, .055, .028), 'wood3')
            asset.box((x + .022, y - .013, .071), (.014, .014, .012), 'leaf2')
        else:
            color = 'hay' if crop == 'wheat' else 'yellow2'
            asset.box((x, y, .056), (.035, .052, .015), color)


def wheat(asset, stage):
    if stage == 'seed':
        seed_bed(asset, 'wheat')
        return
    shoots = [(-.21, -.16, .94), (0, -.2, 1), (.21, -.13, .89),
              (-.19, .14, 1.04), (.04, .16, .97), (.22, .15, .91)]
    for i, (x, y, variation) in enumerate(shoots):
        angle = .68 + i * 1.76
        if stage == 'sprout':
            h = .11 * variation
            asset.beam((x, y, .025), (x, y, h), .015, color='green2')
            blade(asset, x, y, .045, angle, .09, h * .72, .035)
            blade(asset, x, y, .04, angle + 2.7, .08, h * .5, .03, 'leaf')
            continue
        mature = stage == 'mature'
        h = (.60 if mature else .37) * variation
        color = 'hay' if mature else 'green2'
        asset.beam((x, y, .025), (x, y, h), .022, color=color)
        blade(asset, x, y, h * .3, angle, .13, .1, .034, 'hay' if mature else 'leaf')
        blade(asset, x, y, h * .57, angle + 2.65, .115, .105, .03, 'leaf2')
        if mature:
            # Two staggered rows of blocky kernels and fine square awns.
            for row in range(4):
                z = h - .024 + row * .038
                for side in (-1, 1):
                    asset.box((x + side * .022, y, z), (.046, .047, .037),
                              'yellow2' if (row + i) % 3 == 0 else 'hay',
                              rot=(0, side * .27, 0))
                    asset.beam((x + side * .035, y, z + .014),
                               (x + side * .054, y, z + .085), .008, color='yellow2')
            asset.beam((x, y, h + .1), (x, y, h + .17), .012, color='hay')
        else:
            # Green closed ears are visible, but distinct from ripe golden heads.
            asset.box((x, y, h + .026), (.029, .032, .092), 'leaf2')


def corn(asset, stage):
    if stage == 'seed':
        seed_bed(asset, 'corn')
        return
    for i, (x, y) in enumerate([(-.18, -.17), (.18, .16)]):
        a = .45 + i * math.pi
        if stage == 'sprout':
            asset.beam((x, y, .025), (x, y, .14), .023, color='green2')
            for j in range(3):
                blade(asset, x, y, .06 + .025 * j, a + j * 2.4, .13, .06, .06)
            continue
        mature = stage == 'mature'
        h = .87 + i * .04 if mature else .51 + i * .035
        asset.beam((x, y, .025), (x, y, h), .036, color='green2')
        for j in range(5 if mature else 4):
            angle = a + j * 2.5
            z = h * (.2 + j * .135)
            blade(asset, x, y, z, angle, .22 if mature else .185,
                  .12 if mature else .095, .083 if mature else .071,
                  'leaf' if j % 2 else 'leaf2')
        if mature:
            # Exposed golden kernels in a solid green husk, not a floating cylinder.
            c = Vector((x + .073, y - .047, h * .55))
            asset.beam((x, y, h * .38), c, .021, color='green2')
            asset.box(c + Vector((0, .016, .075)), (.079, .064, .21), 'leaf')
            asset.box(c + Vector((0, -.023, .095)), (.06, .038, .17), 'yellow')
            for row in range(5):
                for column in (-1, 1):
                    asset.box(c + Vector((column * .016, -.046, .027 + row * .031)),
                              (.026, .018, .024), 'yellow2')
            blade(asset, c.x - .025, c.y + .018, c.z - .02, -.9, .1, .1, .04, 'leaf2')
            for side in (-1, 0, 1):
                top = h + .095 - abs(side) * .025
                asset.beam((x, y, h - .015), (x + side * .066, y, top), .011, color='hay')
                for j in range(2):
                    asset.box((x + side * (.027 + .022 * j), y, h + .035 + .021 * j),
                              (.024, .024, .03), 'yellow2')
        else:
            blade(asset, x, y, h * .88, a + 1.3, .065, .14, .037, 'leaf2')


def potato(asset, stage):
    if stage == 'seed':
        seed_bed(asset, 'potato')
        return
    centers = [(-.19, -.12), (.17, .12), (-.1, .18)]
    if stage == 'sprout':
        for i, (x, y) in enumerate(centers):
            asset.beam((x, y, .025), (x, y, .1), .019, color='green2')
            for j in range(3):
                blade(asset, x, y, .07, i + j * 2.1, .09, .045, .082)
        return
    mature = stage == 'mature'
    for i, (x, y) in enumerate(centers):
        h = .26 + i * .021 if mature else .19 + i * .018
        asset.beam((x, y, .025), (x, y, h), .027, color='green2')
        for j in range(5):
            angle = i * .72 + j * 2.4
            level = h * (.48 + (j % 3) * .2)
            length = .17 if mature else .13
            tip = Vector((x + math.cos(angle) * length, y + math.sin(angle) * length, level + .035))
            asset.beam((x, y, level), tip, .016, color='green2')
            for side in (-1, 1):
                blade(asset, tip.x * .75 + x * .25, tip.y * .75 + y * .25,
                      tip.z, angle + side * .9, .11 if mature else .085, .035,
                      .105 if mature else .078, 'leaf2' if (i + j) % 2 else 'leaf')
            blade(asset, tip.x, tip.y, tip.z, angle, .1, .018, .085, 'leaf2')
        if mature:
            # Senescent lower leaves and visible shoulder tubers identify readiness.
            blade(asset, x, y, .085, i + .3, .12, -.035, .085, 'hay')
            asset.box((x + .075, y - .045, .071), (.145, .109, .077), 'wood3', rot=(0, 0, i * .65))
            for dx, dy in [(-.035, -.018), (.034, .02)]:
                asset.box((x + .075 + dx, y - .045 + dy, .112), (.013, .014, .012), 'wood')


BUILDERS = {'wheat': wheat, 'corn': corn, 'potato': potato}


def build_crop(crop):
    result = []
    for index, stage in enumerate(STAGES):
        asset = farm.Asset(40 + list(BUILDERS).index(crop) * 4 + index,
                           f'crop_{crop}_{stage}', f'{LABELS[crop]} · {STAGE_LABELS[index]}')
        asset.root['crop_id'] = crop
        asset.root['stage_id'] = stage
        asset.root['resource_id'] = f'crop.{crop}.{stage}'
        BUILDERS[crop](asset, stage)
        asset.notes = ['One 1m farm cell; ground pivot; native flat-shaded solids',
                       'No terrain, collision, alpha cards, external textures or gameplay state']
        with export_paths():
            info = asset.finish()
        assert info['dimensions']['width'] <= .9 and info['dimensions']['depth'] <= .9, info
        assert asset.lo.z >= 0, info
        info.update(cropId=crop, stageId=stage, resourceId=f'crop.{crop}.{stage}')
        (OUTPUT / (asset.slug + '.json')).write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')
        AUTHORED[asset.slug] = asset
        result.append(info)
    return result


def set_enum(owner, prop, value):
    valid = [entry.identifier for entry in owner.bl_rna.properties[prop].enum_items]
    if value not in valid:
        raise ValueError((prop, value, valid))
    setattr(owner, prop, value)


def build_gallery():
    scene = bpy.data.scenes.new('Crop_Stage_Gallery')
    bpy.context.window.scene = scene
    font_path = Path('C:/Windows/Fonts/msyh.ttc')
    font = bpy.data.fonts.load(str(font_path)) if font_path.exists() else None
    for row, crop in enumerate(BUILDERS):
        for col, stage in enumerate(STAGES):
            asset = AUTHORED[f'crop_{crop}_{stage}']
            x, y = (col - 1.5) * 1.45, (1 - row) * 1.65
            root = bpy.data.objects.new(asset.slug, None)
            root['crop_id'] = crop
            root['stage_id'] = stage
            scene.collection.objects.link(root)
            root.location = (x, y, 0)
            for original in asset.scene.objects:
                if original.type != 'MESH':
                    continue
                copy = original.copy()
                copy.name = f'{asset.slug}__{original.data.materials[0].name}'
                copy.parent = root
                copy.matrix_local = original.matrix_world.copy()
                scene.collection.objects.link(copy)
            mesh = bpy.data.meshes.new(f'{crop}_{stage}_review_bed')
            mesh.from_pydata([(x + dx, y + dy, z) for z in (-.08, .013)
                            for dx, dy in [(-.49, -.49), (.49, -.49), (.49, .49), (-.49, .49)]], [],
                            [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
            bed = bpy.data.objects.new(f'{crop}_{stage}_review_bed', mesh)
            scene.collection.objects.link(bed)
            mesh.materials.append(farm.mat('soil'))
            data = bpy.data.curves.new(f'{crop}_{stage}_label', 'FONT')
            data.body = f'{LABELS[crop]}  {STAGE_LABELS[col]}'
            if font:
                data.font = font
            data.size = .125
            set_enum(data, 'align_x', 'CENTER')
            label = bpy.data.objects.new(f'{crop}_{stage}_label', data)
            scene.collection.objects.link(label)
            label.location = (x, y - .67, .015)
            data.materials.append(farm.mat('cream'))
    camera_data = bpy.data.cameras.new('CropGalleryCamera')
    camera = bpy.data.objects.new('CropGalleryCamera', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (3.5, -8.5, 8.5)
    target = Vector((0, 0, .17))
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    set_enum(camera_data, 'type', 'ORTHO')
    camera_data.ortho_scale = 7.6
    scene.camera = camera
    try:
        scene.render.engine = 'BLENDER_WORKBENCH'
    except TypeError as error:
        raise RuntimeError('Workbench review renderer unavailable') from error
    shading = scene.display.shading
    for prop, value in [('light', 'STUDIO'), ('color_type', 'MATERIAL'), ('background_type', 'WORLD'), ('cavity_type', 'BOTH')]:
        set_enum(shading, prop, value)
    shading.show_shadows = True
    shading.show_cavity = True
    shading.curvature_ridge_factor = 1.1
    shading.curvature_valley_factor = .7
    scene.world = bpy.data.worlds.new('CropGalleryWorld')
    scene.world.color = (.035, .055, .063)
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1100
    scene.render.resolution_percentage = 100
    set_enum(scene.render.image_settings, 'file_format', 'PNG')
    scene.render.filepath = str(PREVIEWS / 'crop_stages.png')
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            space = area.spaces.active
            set_enum(space.shading, 'type', 'SOLID')
            set_enum(space.shading, 'color_type', 'MATERIAL')
            set_enum(space.region_3d, 'view_perspective', 'CAMERA')
            space.region_3d.view_camera_zoom = 0
            space.overlay.show_overlays = False
    bpy.data.libraries.write(str(SOURCE / 'crop_stage_gallery.blend'), {scene}, fake_user=True)
    entries = [AUTHORED[f'crop_{crop}_{stage}'].info for crop in BUILDERS for stage in STAGES]
    manifest = {'version': 1, 'style': 'Voxel / Low Poly, farm palette, solid flat-shaded meshes',
                'assets': entries, 'sourceScript': 'scripts/blender/crop_stages.py',
                'reviewScene': 'assets/blender/farm/crops/crop_stage_gallery.blend'}
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    return scene


if __name__ == '__main__':
    for crop in BUILDERS:
        build_crop(crop)
    build_gallery()
    bpy.ops.render.render(write_still=True)
