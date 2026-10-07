# Une los fotogramas de un vídeo renderizado (render/particulares.py -- --video) en los ficheros de la web:
#   public/video/<nombre>.webm (VP9) y public/video/<nombre>.mp4 (H.264, para Safari),
#   y src/assets/video/<nombre>.jpg, el primer fotograma, que se ve mientras carga y si no hay movimiento.
# Lo hace Blender, que trae FFmpeg: no hace falta instalar nada más. Desde web/:
#   blender -b --factory-startup --python render/codificar.py -- --nombre particulares --ancho 960
# Opciones: --calidad N (CRF: menos es mejor y pesa más; por defecto 30 en VP9 y 25 en H.264).
#   --fundido S: funde a oscuro los últimos S segundos y abre desde oscuro los primeros (para los bucles cuyo final no
#     empalma con el principio, como Empresa). El cartel es entonces el primer fotograma ya sin fundido.
#   --vista-previa: solo un MP4 en .render/<nombre>/vista-previa.mp4, para revisarlo antes de llevarlo a la web.

import os
import sys

import bpy

WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
opcion = lambda nombre, defecto=None: args[args.index(nombre) + 1] if nombre in args else defecto

NOMBRE = opcion("--nombre", "particulares")
ANCHO = opcion("--ancho", "960")
FOTOGRAMAS = os.path.join(WEB, ".render", NOMBRE, f"video-{ANCHO}")
VIDEOS = os.path.join(WEB, "public", "video")
CARTEL = os.path.join(WEB, "src", "assets", "video")

ficheros = sorted(f for f in os.listdir(FOTOGRAMAS) if f.startswith("f_") and f.endswith(".png"))
if not ficheros:
    sys.exit(f"No hay fotogramas en {FOTOGRAMAS}")
numeros = [int(f[2:-4]) for f in ficheros]
huecos = sorted(set(range(numeros[0], numeros[-1] + 1)) - set(numeros))
if huecos:
    sys.exit(f"Faltan fotogramas: {huecos[:10]}… Vuelve a lanzar el render con --video.")

bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene
# Los PNG ya llevan la curva de color del render (AgX): aquí no se aplica otra vez
escena.view_settings.view_transform = "Standard"
escena.view_settings.look = "None"
primera = bpy.data.images.load(os.path.join(FOTOGRAMAS, ficheros[0]))
escena.render.resolution_x, escena.render.resolution_y = primera.size
escena.render.resolution_percentage = 100
escena.render.fps = 24
escena.frame_start = 0
escena.frame_end = len(ficheros) - 1

editor = escena.sequence_editor_create()
tira = editor.strips.new_image(name="Fotogramas", filepath=os.path.join(FOTOGRAMAS, ficheros[0]), channel=1, frame_start=0)
for f in ficheros[1:]:
    tira.elements.append(f)

# Fundido a oscuro (el negro de la marca, #131116) al principio y al final: una tira de color encima, cuya opacidad
# baja de 1 a 0 al empezar y sube de 0 a 1 al terminar
FUNDIDO = round(float(opcion("--fundido", 0)) * 24)
if FUNDIDO:
    ultimo = len(ficheros) - 1
    try:
        oscuro = editor.strips.new_effect(name="Fundido", type="COLOR", channel=2, frame_start=0, length=len(ficheros))
    except TypeError:
        oscuro = editor.strips.new_effect(name="Fundido", type="COLOR", channel=2, frame_start=0, frame_end=len(ficheros))
    oscuro.color = (0x13 / 255, 0x11 / 255, 0x16 / 255)
    oscuro.blend_type = "ALPHA_OVER"
    for f, opacidad in ((0, 1.0), (FUNDIDO, 0.0), (ultimo - FUNDIDO, 0.0), (ultimo, 1.0)):
        oscuro.blend_alpha = opacidad
        oscuro.keyframe_insert("blend_alpha", frame=f)

VISTA_PREVIA = "--vista-previa" in args
if VISTA_PREVIA:
    VIDEOS = os.path.dirname(FOTOGRAMAS)
os.makedirs(VIDEOS, exist_ok=True)
os.makedirs(CARTEL, exist_ok=True)


def codificar(formato, codec, crf, extension):
    escena.render.image_settings.media_type = "VIDEO"  # Blender 5: el vídeo ya no es un formato de imagen
    escena.render.image_settings.file_format = "FFMPEG"
    ff = escena.render.ffmpeg
    ff.format = formato
    ff.codec = codec
    ff.constant_rate_factor = "CUSTOM"
    ff.custom_constant_rate_factor = crf
    ff.ffmpeg_preset = "BEST"
    ff.gopsize = 48  # un fotograma clave cada 2 s: el bucle salta al principio sin esperar
    ff.audio_codec = "NONE"
    escena.render.use_file_extension = False
    escena.render.filepath = os.path.join(VIDEOS, f"vista-previa.{extension}" if VISTA_PREVIA else f"{NOMBRE}.{extension}")
    bpy.ops.render.render(animation=True)
    print(f"VIDEO {escena.render.filepath}: {os.path.getsize(escena.render.filepath) / 1e6:.1f} MB")


calidad = opcion("--calidad")
if VISTA_PREVIA:
    codificar("MPEG4", "H264", int(calidad or 23), "mp4")
    sys.exit(0)
codificar("WEBM", "WEBM", int(calidad or 30), "webm")
codificar("MPEG4", "H264", int(calidad or 25), "mp4")

# El cartel: el primer fotograma (el primero ya sin fundido), que es también con el que arranca el bucle
escena.render.image_settings.media_type = "IMAGE"
escena.render.image_settings.file_format = "JPEG"
escena.render.image_settings.quality = 88
escena.render.use_file_extension = True
escena.frame_set(FUNDIDO)
escena.render.filepath = os.path.join(CARTEL, f"{NOMBRE}.jpg")
bpy.ops.render.render(write_still=True)
print(f"CARTEL {escena.render.filepath}")
