"""Convert cached NASA source imagery to web textures (PIL only). Run after build-normalmap.ts."""
from PIL import Image
import os
Image.MAX_IMAGE_PIXELS = None
os.makedirs('public/textures', exist_ok=True)
def save(im, name, q=82):
    im.save(f'public/textures/{name}', quality=q, optimize=True, progressive=True); print(name, os.path.getsize(f'public/textures/{name}') // 1024, 'KB')
moon = Image.open('.cache/lroc_color_poles_4k.tif').convert('RGB')
save(moon, 'moon_color_4k.jpg'); save(moon.resize((2048, 1024), Image.LANCZOS), 'moon_color_2k.jpg')
if os.path.exists('.cache/moon_normal_2k.ppm'): save(Image.open('.cache/moon_normal_2k.ppm'), 'moon_normal_2k.jpg', 90)
if os.path.exists('.cache/land_shallow_topo_2048.jpg'): save(Image.open('.cache/land_shallow_topo_2048.jpg').convert('RGB'), 'earth_2k.jpg')
