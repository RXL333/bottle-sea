"""Rebuild cottage with independently hideable palms; run with background Blender."""
import sys, pathlib, bpy
BASE=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(BASE/'scripts/blender'))
bpy.ops.wm.open_mainfile(filepath=str(BASE/'assets/blender/main_island_library.blend'))
import main_assets,finalize_main,contextlib,io
scene=bpy.data.scenes.get('Main_03_main_cottage')
if scene:bpy.data.scenes.remove(scene)
main_assets.cottage()
with contextlib.redirect_stdout(io.StringIO()):finalize_main.run()
print('Cottage palm components rebuilt',bpy.app.version_string)
