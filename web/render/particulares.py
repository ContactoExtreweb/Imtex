# «Una casa que deja de filtrar», renderizada con Blender (Cycles) para que parezca real.
# La misma historia que la escena en tiempo real de /particulares, a escala real (metros) y en su parcela:
#   1. Terraza: llueve, cala, sale una mancha en el salón y gotea. Se aplica la membrana con rodillo; escampa.
#   2. Piscina: el vaso se forra con la lámina y se llena de agua.
#   3. Garaje: el suelo se cubre de resina.
# Al final todo vuelve atrás: el vídeo hace bucle sin salto.
#
# Se ejecuta desde web/ (los recursos los baja render/recursos.mjs):
#   blender -b --factory-startup --python render/particulares.py -- --fotogramas 130,276,350
#   blender -b --factory-startup --python render/particulares.py -- --video
# Opciones: --muestras N, --ancho N (el alto sale a 4:3), --guardar (deja también el .blend).
# Con --video, además: --desde N y --hasta N para un tramo. Los fotogramas ya hechos se saltan, así que si se corta,
# se vuelve a lanzar lo mismo y sigue donde iba.
# Densidades (menos = más rápido): --cesped 1800 briznas/m², --follaje 1800 hojas/m².
# Usa la tarjeta gráfica con OptiX si la hay y si no, el procesador.
# Los fotogramas van a .render/particulares/ (fuera de git); los del vídeo, a .render/particulares/video-<ancho>/.

import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECURSOS = os.path.join(WEB, ".polyhaven", "render")
SALIDA = os.path.join(WEB, ".render", "particulares")

args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
opcion = lambda nombre, defecto=None: args[args.index(nombre) + 1] if nombre in args else defecto

FPS = 24
VUELTA = 18.6  # segundos, como la escena en tiempo real (escena3d/casa.ts)
FOTOGRAMAS = round(VUELTA * FPS)

# --- Medidas, en metros. X a la derecha, Y hacia el fondo, Z arriba. La casa está cortada por delante (y = -3). ---
CASA = dict(x0=-4.0, x1=4.0, y0=-3.0, y1=3.0)
MURO = 0.3
PLANTA = 3.0
FORJADO = 0.3
TECHO = 2 * PLANTA
PETO = 1.0
SUELO = 0.02  # el acabado sobre el forjado
VASO = dict(x0=6.0, x1=10.0, y0=-2.5, y1=2.5, fondo=1.5)
PLAYA = dict(x0=4.8, x1=11.4, y0=-3.8, y1=4.8)  # pavimento alrededor de la piscina
PARCELA = dict(x0=-9.0, x1=14.5, y0=-9.0, y1=9.0)
GOTERA = Vector((-2.9, -1.0))


# --- Curvas de avance, las mismas que en texturas.ts ---
def tramo(p, desde, hasta):
    return min(1.0, max(0.0, (p - desde) / (hasta - desde)))


def suave(t):
    return t * t * (3 - 2 * t)


def mezcla(a, b, t):
    return a + (b - a) * t


# Algunos nodos repiten nombre de entrada o salida (una por tipo de dato): se toma la que está activa
def ent(nodo, nombre):
    return next(s for s in nodo.inputs if s.name == nombre and s.enabled)


def sal(nodo, nombre):
    return next(s for s in nodo.outputs if s.name == nombre and s.enabled)


# ------------------------------------------------------------------------------------------------
# Escena, render y mundo
# ------------------------------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
# Las claves van una por fotograma con su valor ya calculado: entre ellas, en línea recta
bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
escena = bpy.context.scene
escena.render.engine = "CYCLES"
# La tarjeta gráfica con OptiX si la hay (el PC con la RTX 4060); si no, el procesador (la sesión de Claude en la nube)
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "OPTIX"
prefs.get_devices()
CON_TARJETA = any(d.type == "OPTIX" for d in prefs.devices)
for d in prefs.devices:
    d.use = d.type == "OPTIX"
escena.cycles.device = "GPU" if CON_TARJETA else "CPU"
print("RENDER CON", "tarjeta gráfica (OptiX)" if CON_TARJETA else "procesador")
escena.cycles.samples = int(opcion("--muestras", 96))
escena.cycles.adaptive_threshold = 0.02
escena.cycles.use_denoising = True
escena.cycles.denoiser = "OPTIX" if CON_TARJETA else "OPENIMAGEDENOISE"
escena.cycles.max_bounces = 8
escena.cycles.diffuse_bounces = 3
escena.cycles.glossy_bounces = 3
escena.cycles.transmission_bounces = 8
escena.cycles.caustics_reflective = False
escena.cycles.caustics_refractive = False
escena.render.use_persistent_data = True
ancho = int(opcion("--ancho", 1280))
escena.render.resolution_x = ancho
escena.render.resolution_y = ancho * 3 // 4
escena.render.fps = FPS
escena.frame_start = 0
escena.frame_end = FOTOGRAMAS - 1
escena.render.image_settings.file_format = "PNG"
escena.render.image_settings.color_mode = "RGB"
escena.view_settings.view_transform = "AgX"
for look in ("AgX - Medium High Contrast", "Medium High Contrast"):
    try:
        escena.view_settings.look = look
        break
    except TypeError:
        pass

# Mundo: el cielo de Poly Haven. Mientras llueve se mezcla con un gris de cielo cubierto (luz suave, sin sol).
mundo = bpy.data.worlds.new("Cielo")
escena.world = mundo
mundo.use_nodes = True
wn = mundo.node_tree.nodes
wl = mundo.node_tree.links
wn.clear()
coord = wn.new("ShaderNodeTexCoord")
giro_cielo = wn.new("ShaderNodeMapping")
giro_cielo.inputs["Rotation"].default_value = (0, 0, math.radians(200))
hdr = wn.new("ShaderNodeTexEnvironment")
hdr.image = bpy.data.images.load(os.path.join(RECURSOS, "cielos", "citrus_orchard_puresky_4k.hdr"))
gris = wn.new("ShaderNodeRGB")
gris.outputs[0].default_value = (0.42, 0.45, 0.5, 1)
nublado = wn.new("ShaderNodeMix")
nublado.data_type = "RGBA"
fondo = wn.new("ShaderNodeBackground")
salida_mundo = wn.new("ShaderNodeOutputWorld")
wl.new(coord.outputs["Generated"], giro_cielo.inputs["Vector"])
# Por debajo del horizonte, el color del propio horizonte: el campo lejano se funde con él (con_bruma)
partes = wn.new("ShaderNodeSeparateXYZ")
wl.new(giro_cielo.outputs["Vector"], partes.inputs[0])
sobre_horizonte = wn.new("ShaderNodeMath")
sobre_horizonte.operation = "MAXIMUM"
sobre_horizonte.inputs[1].default_value = 0.02
wl.new(partes.outputs["Z"], sobre_horizonte.inputs[0])
rehecho = wn.new("ShaderNodeCombineXYZ")
wl.new(partes.outputs["X"], rehecho.inputs["X"])
wl.new(partes.outputs["Y"], rehecho.inputs["Y"])
wl.new(sobre_horizonte.outputs[0], rehecho.inputs["Z"])
wl.new(rehecho.outputs["Vector"], hdr.inputs["Vector"])
wl.new(hdr.outputs["Color"], ent(nublado, "A"))
wl.new(gris.outputs["Color"], ent(nublado, "B"))
wl.new(sal(nublado, "Result"), fondo.inputs["Color"])
wl.new(fondo.outputs["Background"], salida_mundo.inputs["Surface"])

# ------------------------------------------------------------------------------------------------
# Materiales
# ------------------------------------------------------------------------------------------------
def material(nombre, color=(0.8, 0.8, 0.8), rugosidad=0.5, **otros):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rugosidad
    for clave, valor in otros.items():
        p.inputs[clave].default_value = valor
    return m


def sombra_transparente(m, tinte=(1.0, 1.0, 1.0)):
    """El agua y el vidrio dejan pasar la luz directa: para los rayos de sombra son transparentes (teñidos).
    Sin esto, con las cáusticas apagadas, lo que hay bajo el agua o detrás de un cristal sale negro."""
    n = m.node_tree.nodes
    l = m.node_tree.links
    salida = next(x for x in n if x.type == "OUTPUT_MATERIAL")
    if not salida.inputs["Surface"].links:
        return
    origen = salida.inputs["Surface"].links[0].from_socket
    camino = n.new("ShaderNodeLightPath")
    transparente = n.new("ShaderNodeBsdfTransparent")
    transparente.inputs["Color"].default_value = (*tinte, 1)
    mezcla_sombra = n.new("ShaderNodeMixShader")
    l.new(camino.outputs["Is Shadow Ray"], mezcla_sombra.inputs["Fac"])
    l.new(origen, mezcla_sombra.inputs[1])
    l.new(transparente.outputs["BSDF"], mezcla_sombra.inputs[2])
    l.new(mezcla_sombra.outputs["Shader"], salida.inputs["Surface"])


def vidrio_fino(m):
    """Cristal de una ventana o de un cuadro: una lámina fina que deja ver lo de detrás tal cual y refleja más
    cuanto más de lado se mira. El vidrio con refracción de los modelos es un solo plano: la luz entra y no sale."""
    n = m.node_tree.nodes
    l = m.node_tree.links
    n.clear()
    fresnel = n.new("ShaderNodeFresnel")
    fresnel.inputs["IOR"].default_value = 1.5
    brillo = n.new("ShaderNodeBsdfGlossy")
    brillo.inputs["Roughness"].default_value = 0.02
    transparente = n.new("ShaderNodeBsdfTransparent")
    mezcla_vidrio = n.new("ShaderNodeMixShader")
    l.new(fresnel.outputs["Fac"], mezcla_vidrio.inputs["Fac"])
    l.new(transparente.outputs["BSDF"], mezcla_vidrio.inputs[1])
    l.new(brillo.outputs["BSDF"], mezcla_vidrio.inputs[2])
    l.new(mezcla_vidrio.outputs["Shader"], n.new("ShaderNodeOutputMaterial").inputs["Surface"])


def valor_animado(arbol, nombre, valor=0.0):
    """Un número dentro de un material que se anima fotograma a fotograma (con clave_valor)"""
    v = arbol.nodes.new("ShaderNodeValue")
    v.name = nombre
    v.outputs[0].default_value = valor
    return v.outputs[0]


def clave_valor(salida, valor, f):
    salida.default_value = valor
    salida.keyframe_insert("default_value", frame=f)


def mates(arbol, operacion, a, b=None, c=None):
    """Nodo de cálculo (sirve en materiales y en nodos de geometría): a, b y c son números o salidas de otros nodos"""
    x = arbol.nodes.new("ShaderNodeMath")
    x.operation = operacion
    for i, v in enumerate((a, b, c)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            x.inputs[i].default_value = v
        else:
            arbol.links.new(v, x.inputs[i])
    return x.outputs[0]


def borde_suave(arbol, valor, desde, hasta):
    """1 por debajo de `desde`, 0 por encima de `hasta` y una transición suave entre los dos"""
    x = arbol.nodes.new("ShaderNodeMapRange")
    x.interpolation_type = "SMOOTHSTEP"
    for nombre, v in (("Value", valor), ("From Min", desde), ("From Max", hasta)):
        if isinstance(v, (int, float)):
            x.inputs[nombre].default_value = v
        else:
            arbol.links.new(v, x.inputs[nombre])
    x.inputs["To Min"].default_value = 1.0
    x.inputs["To Max"].default_value = 0.0
    return x.outputs["Result"]


def ruido(arbol, vector, escala, detalle=3.0):
    x = arbol.nodes.new("ShaderNodeTexNoise")
    x.inputs["Scale"].default_value = escala
    x.inputs["Detail"].default_value = detalle
    arbol.links.new(vector, x.inputs["Vector"])
    return x.outputs["Fac"]


def imagen(id, mapa, color=False):
    carpeta = os.path.join(RECURSOS, "texturas", id)
    archivo = next(f for f in os.listdir(carpeta) if f"_{mapa}_" in f)
    im = bpy.data.images.load(os.path.join(carpeta, archivo), check_existing=True)
    if not color:
        im.colorspace_settings.name = "Non-Color"
    return im


def material_escaneado(nombre, id, tamano, tinte=None, brillo=1.0, relieve=0.6, rugosidad_extra=0.0, variacion=0.0, aplanar=0.0):
    """Textura de Poly Haven proyectada en caja según la posición en el mundo: no se estira en ninguna cara.
    `variacion` mancha el color a gran escala para que no se note que la textura se repite."""
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    n = m.node_tree.nodes
    l = m.node_tree.links
    p = n["Principled BSDF"]
    geo = n.new("ShaderNodeNewGeometry")
    escala = n.new("ShaderNodeVectorMath")
    escala.operation = "SCALE"
    escala.inputs["Scale"].default_value = 1 / tamano
    l.new(geo.outputs["Position"], escala.inputs[0])

    def textura(mapa, color=False):
        t = n.new("ShaderNodeTexImage")
        t.image = imagen(id, mapa, color)
        t.projection = "BOX"
        t.projection_blend = 0.2
        l.new(escala.outputs["Vector"], t.inputs["Vector"])
        return t

    color = textura("diff", True).outputs["Color"]
    if tinte or brillo != 1.0:
        hsv = n.new("ShaderNodeHueSaturation")
        hsv.inputs["Saturation"].default_value = 0.3 if tinte else 1.0
        hsv.inputs["Value"].default_value = brillo
        l.new(color, hsv.inputs["Color"])
        color = hsv.outputs["Color"]
        if tinte:
            mult = n.new("ShaderNodeMix")
            mult.data_type = "RGBA"
            mult.blend_type = "MULTIPLY"
            ent(mult, "Factor").default_value = 1.0
            ent(mult, "B").default_value = (*tinte, 1)
            l.new(color, ent(mult, "A"))
            color = sal(mult, "Result")
    if variacion:
        manchas = n.new("ShaderNodeTexNoise")
        manchas.inputs["Scale"].default_value = 0.08
        manchas.inputs["Detail"].default_value = 4
        l.new(geo.outputs["Position"], manchas.inputs["Vector"])
        rango = n.new("ShaderNodeMapRange")
        rango.inputs["To Min"].default_value = 1 - variacion
        rango.inputs["To Max"].default_value = 1 + variacion * 0.5
        l.new(manchas.outputs["Fac"], rango.inputs["Value"])
        oscurece = n.new("ShaderNodeMix")
        oscurece.data_type = "RGBA"
        oscurece.blend_type = "MULTIPLY"
        ent(oscurece, "Factor").default_value = 1.0
        l.new(color, ent(oscurece, "A"))
        gris_v = n.new("ShaderNodeCombineXYZ")
        for eje in "XYZ":
            l.new(rango.outputs["Result"], gris_v.inputs[eje])
        l.new(gris_v.outputs["Vector"], ent(oscurece, "B"))
        color = sal(oscurece, "Result")
    if aplanar:  # menos contraste: se mezcla con su gris medio
        plano_gris = n.new("ShaderNodeMix")
        plano_gris.data_type = "RGBA"
        ent(plano_gris, "Factor").default_value = aplanar
        l.new(color, ent(plano_gris, "A"))
        ent(plano_gris, "B").default_value = (0.42, 0.42, 0.41, 1)
        color = sal(plano_gris, "Result")
    l.new(color, p.inputs["Base Color"])
    rug = textura("rough").outputs["Color"]
    if rugosidad_extra:
        suma = n.new("ShaderNodeMath")
        suma.operation = "ADD"
        suma.use_clamp = True
        suma.inputs[1].default_value = rugosidad_extra
        l.new(rug, suma.inputs[0])
        rug = suma.outputs[0]
    l.new(rug, p.inputs["Roughness"])
    normal = n.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = relieve
    l.new(textura("nor_gl").outputs["Color"], normal.inputs["Color"])
    l.new(normal.outputs["Normal"], p.inputs["Normal"])
    return m


mat_enfoscado = material_escaneado("Enfoscado", "painted_plaster_wall", 2.0, brillo=1.45, relieve=0.5)
mat_pintura = material("Pintura interior", (0.86, 0.85, 0.82), 0.85)
mat_hormigon = material_escaneado("Hormigón", "concrete_floor_02", 1.2, tinte=(0.78, 0.78, 0.76), brillo=1.4, aplanar=0.6)
mat_barro = material_escaneado("Barro cocido", "terracotta_floor_tiles", 2.7, relieve=0.8)
mat_adoquin = material_escaneado("Pavimento", "patterned_concrete_pavers", 2.0, brillo=1.15)
mat_tierra = material_escaneado("Tierra", "gravel_ground_01", 3.5, brillo=1.05, variacion=0.25)
mat_campo = material_escaneado("Campo", "gravel_ground_01", 7.0, brillo=0.95, variacion=0.35)
mat_piedra = material("Piedra artificial", (0.68, 0.64, 0.57), 0.6)
mat_madera = material("Madera", (0.36, 0.22, 0.12), 0.45)
mat_blanco = material("Lacado blanco", (0.9, 0.9, 0.88), 0.35)
mat_pvc = material("PVC gris", (0.35, 0.36, 0.38), 0.4)
mat_metal = material("Acero", (0.75, 0.76, 0.78), 0.3, Metallic=1.0)
# Roja de marca. Oscura y con poco barniz: al sol, AgX lleva los rojos claros y saturados hacia el salmón
mat_membrana = material("Membrana", (0.3, 0.016, 0.006), 0.5, **{"Coat Weight": 0.1, "Coat Roughness": 0.3})
mat_resina = material("Resina", (0.24, 0.25, 0.26), 0.12, **{"Coat Weight": 1.0, "Coat Roughness": 0.03})
# Charco: una película de agua sobre el barro, que lo oscurece y brilla
mat_charco = material("Charco", (0.1, 0.07, 0.05), 0.02, Alpha=0.6)
mat_gota = material("Gota", (0.9, 0.95, 1.0), 0.02, **{"Transmission Weight": 1.0, "IOR": 1.333})


def material_gresite():
    """Lámina con estampado de gresite: teselas de 2,5 cm en azules que varían, con junta clara y algo de relieve"""
    m = bpy.data.materials.new("Gresite")
    m.use_nodes = True
    n = m.node_tree.nodes
    l = m.node_tree.links
    p = n["Principled BSDF"]
    geo = n.new("ShaderNodeNewGeometry")
    ladrillo = n.new("ShaderNodeTexBrick")
    ladrillo.offset = 0.0
    ladrillo.squash = 1.0
    ladrillo.inputs["Scale"].default_value = 1.0
    ladrillo.inputs["Brick Width"].default_value = 0.025
    ladrillo.inputs["Row Height"].default_value = 0.025
    ladrillo.inputs["Mortar Size"].default_value = 0.0018
    ladrillo.inputs["Bias"].default_value = 0.0
    ladrillo.inputs["Color1"].default_value = (0.03, 0.28, 0.45, 1)
    ladrillo.inputs["Color2"].default_value = (0.05, 0.4, 0.58, 1)
    ladrillo.inputs["Mortar"].default_value = (0.75, 0.8, 0.8, 1)
    # Proyección según la cara: en las paredes del vaso X/Z o Y/Z, en el fondo X/Y
    sep = n.new("ShaderNodeSeparateXYZ")
    l.new(geo.outputs["Position"], sep.inputs[0])
    nor = n.new("ShaderNodeSeparateXYZ")
    l.new(geo.outputs["Normal"], nor.inputs[0])
    ax = n.new("ShaderNodeMath")
    ax.operation = "ABSOLUTE"
    l.new(nor.outputs["X"], ax.inputs[0])
    es_lado = n.new("ShaderNodeMath")
    es_lado.operation = "GREATER_THAN"
    es_lado.inputs[1].default_value = 0.5
    l.new(ax.outputs[0], es_lado.inputs[0])
    az = n.new("ShaderNodeMath")
    az.operation = "ABSOLUTE"
    l.new(nor.outputs["Z"], az.inputs[0])
    es_fondo = n.new("ShaderNodeMath")
    es_fondo.operation = "GREATER_THAN"
    es_fondo.inputs[1].default_value = 0.5
    l.new(az.outputs[0], es_fondo.inputs[0])
    u_lado = n.new("ShaderNodeMix")  # en las paredes laterales, Y; en el resto, X
    u_lado.data_type = "FLOAT"
    l.new(es_lado.outputs[0], ent(u_lado, "Factor"))
    l.new(sep.outputs["X"], ent(u_lado, "A"))
    l.new(sep.outputs["Y"], ent(u_lado, "B"))
    v = n.new("ShaderNodeMix")  # en el fondo, Y; en las paredes, Z
    v.data_type = "FLOAT"
    l.new(es_fondo.outputs[0], ent(v, "Factor"))
    l.new(sep.outputs["Z"], ent(v, "A"))
    l.new(sep.outputs["Y"], ent(v, "B"))
    uv = n.new("ShaderNodeCombineXYZ")
    l.new(sal(u_lado, "Result"), uv.inputs["X"])
    l.new(sal(v, "Result"), uv.inputs["Y"])
    l.new(uv.outputs["Vector"], ladrillo.inputs["Vector"])
    # Cada tesela con su tono
    ruido = n.new("ShaderNodeTexWhiteNoise")
    ruido.noise_dimensions = "2D"
    redondeo = n.new("ShaderNodeVectorMath")
    redondeo.operation = "SNAP"
    redondeo.inputs[1].default_value = (0.025, 0.025, 0.025)
    l.new(uv.outputs["Vector"], redondeo.inputs[0])
    l.new(redondeo.outputs["Vector"], ruido.inputs["Vector"])
    tono = n.new("ShaderNodeMix")
    tono.data_type = "RGBA"
    l.new(ruido.outputs["Value"], ent(tono, "Factor"))
    ent(tono, "A").default_value = (0.1, 0.4, 0.58, 1)
    ent(tono, "B").default_value = (0.24, 0.6, 0.74, 1)
    junta = n.new("ShaderNodeMix")
    junta.data_type = "RGBA"
    l.new(ladrillo.outputs["Fac"], ent(junta, "Factor"))
    l.new(sal(tono, "Result"), ent(junta, "A"))
    ent(junta, "B").default_value = (0.7, 0.75, 0.75, 1)
    l.new(sal(junta, "Result"), p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.15
    relieve = n.new("ShaderNodeBump")
    relieve.inputs["Strength"].default_value = 0.25
    relieve.inputs["Distance"].default_value = 0.002
    invertir = n.new("ShaderNodeMath")
    invertir.operation = "SUBTRACT"
    invertir.inputs[0].default_value = 1.0
    l.new(ladrillo.outputs["Fac"], invertir.inputs[1])
    l.new(invertir.outputs[0], relieve.inputs["Height"])
    l.new(relieve.outputs["Normal"], p.inputs["Normal"])
    return m


mat_gresite = material_gresite()


def material_agua_piscina():
    """Agua de piscina: transparente con refracción, se tiñe de turquesa con la profundidad y ondea despacio"""
    m = bpy.data.materials.new("Agua de piscina")
    m.use_nodes = True
    n = m.node_tree.nodes
    l = m.node_tree.links
    p = n["Principled BSDF"]
    p.inputs["Base Color"].default_value = (1, 1, 1, 1)
    p.inputs["Roughness"].default_value = 0.0
    p.inputs["Transmission Weight"].default_value = 1.0
    p.inputs["IOR"].default_value = 1.333
    vol = n.new("ShaderNodeVolumeAbsorption")
    vol.inputs["Color"].default_value = (0.55, 0.88, 0.9, 1)
    vol.inputs["Density"].default_value = 0.06
    l.new(vol.outputs["Volume"], n["Material Output"].inputs["Volume"])
    # Ondas: ruido en 4D cuyo cuarto eje avanza con el tiempo (driver sencillo, sin Python)
    geo = n.new("ShaderNodeNewGeometry")
    ruido = n.new("ShaderNodeTexNoise")
    ruido.noise_dimensions = "4D"
    ruido.inputs["Scale"].default_value = 1.6
    ruido.inputs["Detail"].default_value = 3
    l.new(geo.outputs["Position"], ruido.inputs["Vector"])
    driver = ruido.inputs["W"].driver_add("default_value").driver
    driver.type = "SCRIPTED"
    driver.expression = "frame / 24 * 0.25"
    relieve = n.new("ShaderNodeBump")
    relieve.inputs["Strength"].default_value = 0.08
    l.new(ruido.outputs["Fac"], relieve.inputs["Height"])
    l.new(relieve.outputs["Normal"], p.inputs["Normal"])
    return m


mat_agua = material_agua_piscina()
sombra_transparente(mat_agua, (0.8, 0.95, 0.97))

# ------------------------------------------------------------------------------------------------
# Geometría
# ------------------------------------------------------------------------------------------------
coleccion = escena.collection


def caja(nombre, x0, x1, y0, y1, z0, z1, mat, bisel=0.008):
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = x0 if v.co.x < 0 else x1
        v.co.y = y0 if v.co.y < 0 else y1
        v.co.z = z0 if v.co.z < 0 else z1
    bm.to_mesh(malla)
    bm.free()
    o = bpy.data.objects.new(nombre, malla)
    o.data.materials.append(mat)
    coleccion.objects.link(o)
    if bisel:
        b = o.modifiers.new("Bisel", "BEVEL")
        b.width = bisel
        b.segments = 2
        b.limit_method = "ANGLE"
    for cara in malla.polygons:
        cara.use_smooth = False
    return o


def plano(nombre, x0, x1, y0, y1, z, mat):
    return caja(nombre, x0, x1, y0, y1, z - 0.001, z, mat, bisel=0)


def marco(nombre, exterior, hueco, z0, z1, mat, bisel=0.008):
    """Cuatro cajas alrededor de un hueco: un suelo con un agujero"""
    (ex0, ex1, ey0, ey1), (hx0, hx1, hy0, hy1) = exterior, hueco
    return [
        caja(f"{nombre} sur", ex0, ex1, ey0, hy0, z0, z1, mat, bisel),
        caja(f"{nombre} norte", ex0, ex1, hy1, ey1, z0, z1, mat, bisel),
        caja(f"{nombre} oeste", ex0, hx0, hy0, hy1, z0, z1, mat, bisel),
        caja(f"{nombre} este", hx1, ex1, hy0, hy1, z0, z1, mat, bisel),
    ]


x0, x1, y0, y1 = CASA["x0"], CASA["x1"], CASA["y0"], CASA["y1"]
i0, i1, f1 = x0 + MURO, x1 - MURO, y1 - MURO  # caras de dentro de los muros

# Terreno: el campo de alrededor (con el hueco de la parcela), la parcela y la playa de la piscina
campo = marco("Campo", (-400, 400, -400, 400), (PARCELA["x0"], PARCELA["x1"], PARCELA["y0"], PARCELA["y1"]), -0.2, -0.02, mat_campo, bisel=0)
HUECO = (x0 - 0.8, PLAYA["x1"], PLAYA["y0"], PLAYA["y1"])
cesped = marco("Césped", (PARCELA["x0"], PARCELA["x1"], PARCELA["y0"], PARCELA["y1"]), HUECO, -0.1, 0.0, mat_tierra, bisel=0)
caja("Grava junto a la casa", x0 - 0.8, PLAYA["x0"], PLAYA["y0"], PLAYA["y1"], -0.1, 0.0, mat_tierra, bisel=0)
marco("Playa", (PLAYA["x0"], PLAYA["x1"], PLAYA["y0"], PLAYA["y1"]), (VASO["x0"], VASO["x1"], VASO["y0"], VASO["y1"]), -0.1, 0.04, mat_adoquin, bisel=0.004)
# Vaso de la piscina: hormigón, y encima la lámina que se anima
caja("Vaso fondo", VASO["x0"], VASO["x1"], VASO["y0"], VASO["y1"], -VASO["fondo"] - 0.3, -VASO["fondo"], mat_hormigon, bisel=0)
for nombre, a in (
    ("Vaso sur", (VASO["x0"] - 0.3, VASO["x1"] + 0.3, VASO["y0"] - 0.3, VASO["y0"])),
    ("Vaso norte", (VASO["x0"] - 0.3, VASO["x1"] + 0.3, VASO["y1"], VASO["y1"] + 0.3)),
    ("Vaso oeste", (VASO["x0"] - 0.3, VASO["x0"], VASO["y0"], VASO["y1"])),
    ("Vaso este", (VASO["x1"], VASO["x1"] + 0.3, VASO["y0"], VASO["y1"])),
):
    caja(nombre, *a, -VASO["fondo"] - 0.3, -0.1, mat_hormigon, bisel=0)
# Coronación de piedra
CORONA = 0.32
marco("Coronación", (VASO["x0"] - CORONA, VASO["x1"] + CORONA, VASO["y0"] - CORONA, VASO["y1"] + CORONA), (VASO["x0"] + 0.03, VASO["x1"] - 0.03, VASO["y0"] + 0.03, VASO["y1"] - 0.03), 0.04, 0.09, mat_piedra, bisel=0.01)
# Muros de la parcela (a los lados y al fondo; por delante queda abierto para la cámara)
for nombre, a in (
    ("Tapia fondo", (PARCELA["x0"], PARCELA["x1"], PARCELA["y1"], PARCELA["y1"] + 0.25)),
    ("Tapia izquierda", (PARCELA["x0"] - 0.25, PARCELA["x0"], PARCELA["y0"], PARCELA["y1"] + 0.25)),
    ("Tapia derecha", (PARCELA["x1"], PARCELA["x1"] + 0.25, PARCELA["y0"], PARCELA["y1"] + 0.25)),
):
    caja(nombre, *a, -0.1, 1.7, mat_enfoscado)
    caja(f"{nombre} albardilla", a[0] - 0.03, a[1] + 0.03, a[2] - 0.03, a[3] + 0.03, 1.7, 1.76, mat_piedra, bisel=0.006)

# ------------------------------------------------------------------------------------------------
# Entorno: césped de briznas, setos y cipreses junto a las tapias, y casas vecinas al fondo
# ------------------------------------------------------------------------------------------------
def malla(nombre, verts, caras, mat=None, suave=False, oculta=False):
    m = bpy.data.meshes.new(nombre)
    m.from_pydata(verts, [], caras)
    m.update()
    o = bpy.data.objects.new(nombre, m)
    coleccion.objects.link(o)
    if mat:
        m.materials.append(mat)
    for p in m.polygons:
        p.use_smooth = suave
    if oculta:  # solo sirve de modelo para los nodos de geometría
        o.hide_render = True
        o.hide_viewport = True
    return o


def grupo_de_nodos(nombre):
    ng = bpy.data.node_groups.new(nombre, "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    return ng, ng.nodes.new("NodeGroupInput"), ng.nodes.new("NodeGroupOutput")


def al_azar(ng, tipo, minimo, maximo, semilla):
    x = ng.nodes.new("FunctionNodeRandomValue")
    x.data_type = tipo
    ent(x, "Min").default_value = minimo
    ent(x, "Max").default_value = maximo
    ent(x, "Seed").default_value = semilla
    return sal(x, "Value")


def material_vegetal(nombre, colores, translucidez=0.3, rugosidad=0.55, alto_base=None):
    """Hoja o brizna: cada copia con su tono (Object Info → Random), y una parte translúcida, que a contraluz se nota.
    Con `alto_base`, la parte de abajo de cada brizna va más oscura (está en sombra entre las demás)."""
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    a = m.node_tree
    n, l = a.nodes, a.links
    p = n["Principled BSDF"]
    info = n.new("ShaderNodeObjectInfo")
    rampa = n.new("ShaderNodeValToRGB")
    e = rampa.color_ramp.elements
    (p0, c0), (p1, c1), *resto = colores
    e[0].position, e[0].color = p0, (*c0, 1)
    e[1].position, e[1].color = p1, (*c1, 1)
    for pos, c in resto:
        e.new(pos).color = (*c, 1)
    l.new(info.outputs["Random"], rampa.inputs["Fac"])
    color = rampa.outputs["Color"]
    if alto_base:
        coord = n.new("ShaderNodeTexCoord")
        sep = n.new("ShaderNodeSeparateXYZ")
        l.new(coord.outputs["Object"], sep.inputs[0])
        abajo = mates(a, "SUBTRACT", 1.0, mates(a, "MINIMUM", mates(a, "DIVIDE", sep.outputs["Z"], alto_base), 1.0))
        sombra_base = n.new("ShaderNodeMix")
        sombra_base.data_type = "RGBA"
        sombra_base.blend_type = "MULTIPLY"
        l.new(color, ent(sombra_base, "A"))
        ent(sombra_base, "B").default_value = (0.3, 0.3, 0.3, 1)
        l.new(abajo, ent(sombra_base, "Factor"))
        color = sal(sombra_base, "Result")
    l.new(color, p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = rugosidad
    traslucido = n.new("ShaderNodeBsdfTranslucent")
    l.new(color, traslucido.inputs["Color"])
    mezcla_t = n.new("ShaderNodeMixShader")
    mezcla_t.inputs["Fac"].default_value = translucidez
    l.new(p.outputs["BSDF"], mezcla_t.inputs[1])
    l.new(traslucido.outputs["BSDF"], mezcla_t.inputs[2])
    l.new(mezcla_t.outputs["Shader"], n["Material Output"].inputs["Surface"])
    return m


def material_suelo_cesped():
    """Lo que se ve entre las briznas: verde oscuro con calvas de tierra"""
    m = bpy.data.materials.new("Césped (suelo)")
    m.use_nodes = True
    a = m.node_tree
    n, l = a.nodes, a.links
    p = n["Principled BSDF"]
    pos = n.new("ShaderNodeNewGeometry").outputs["Position"]
    verdes = n.new("ShaderNodeMix")
    verdes.data_type = "RGBA"
    ent(verdes, "A").default_value = (0.03, 0.07, 0.015, 1)
    ent(verdes, "B").default_value = (0.09, 0.15, 0.035, 1)
    l.new(ruido(a, pos, 0.9, 4.0), ent(verdes, "Factor"))
    tierra = n.new("ShaderNodeMix")
    tierra.data_type = "RGBA"
    l.new(sal(verdes, "Result"), ent(tierra, "A"))
    ent(tierra, "B").default_value = (0.14, 0.11, 0.07, 1)
    l.new(mates(a, "SUBTRACT", 1.0, borde_suave(a, ruido(a, pos, 0.35, 2.0), 0.67, 0.73)), ent(tierra, "Factor"))
    l.new(sal(tierra, "Result"), p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.95
    return m


# --- Césped: briznas de 7 a 12 cm repartidas por las caras de arriba del terreno de la parcela ---
mat_hierba = material_vegetal(
    "Hierba",
    [(0.0, (0.03, 0.08, 0.012)), (1.0, (0.24, 0.24, 0.08)), (0.55, (0.08, 0.16, 0.03)), (0.85, (0.14, 0.2, 0.05))],
    translucidez=0.3,
    rugosidad=0.5,
    alto_base=0.1,
)


def brizna(nombre, alto, ancho, curva):
    """Una brizna: tira que se estrecha hasta la punta y se curva hacia delante"""
    tramos = 4
    verts, caras = [], []
    for i in range(tramos):
        f = i / tramos
        verts += [(-ancho * (1 - f) / 2, curva * f * f, alto * f), (ancho * (1 - f) / 2, curva * f * f, alto * f)]
    verts.append((0.0, curva, alto))
    for i in range(tramos - 1):
        caras.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    caras.append((2 * tramos - 2, 2 * tramos - 1, len(verts) - 1))
    return malla(nombre, verts, caras, mat_hierba, suave=True, oculta=True)


BRIZNAS = [brizna("Brizna 1", 0.09, 0.005, 0.015), brizna("Brizna 2", 0.12, 0.004, 0.035), brizna("Brizna 3", 0.07, 0.006, 0.01)]


def nodos_cesped(densidad):
    ng, entrada, salida = grupo_de_nodos("Césped")
    n, l = ng.nodes, ng.links
    normal = n.new("GeometryNodeInputNormal")
    sep = n.new("ShaderNodeSeparateXYZ")
    l.new(normal.outputs["Normal"], sep.inputs[0])
    arriba = n.new("FunctionNodeCompare")
    arriba.data_type = "FLOAT"
    arriba.operation = "GREATER_THAN"
    l.new(sep.outputs["Z"], ent(arriba, "A"))
    ent(arriba, "B").default_value = 0.9
    reparto = n.new("GeometryNodeDistributePointsOnFaces")
    l.new(entrada.outputs[0], reparto.inputs["Mesh"])
    l.new(sal(arriba, "Result"), reparto.inputs["Selection"])
    reparto.inputs["Density"].default_value = densidad
    variantes = n.new("GeometryNodeJoinGeometry")
    for b in BRIZNAS:
        info = n.new("GeometryNodeObjectInfo")
        info.inputs["Object"].default_value = b
        info.inputs["As Instance"].default_value = True
        l.new(info.outputs["Geometry"], variantes.inputs["Geometry"])
    giro = n.new("FunctionNodeEulerToRotation")
    l.new(al_azar(ng, "FLOAT_VECTOR", (-0.3, -0.3, 0.0), (0.3, 0.3, 6.283), 2), giro.inputs["Euler"])
    poner = n.new("GeometryNodeInstanceOnPoints")
    l.new(reparto.outputs["Points"], poner.inputs["Points"])
    l.new(variantes.outputs["Geometry"], poner.inputs["Instance"])
    poner.inputs["Pick Instance"].default_value = True
    l.new(al_azar(ng, "INT", 0, len(BRIZNAS) - 1, 1), poner.inputs["Instance Index"])
    l.new(giro.outputs["Rotation"], poner.inputs["Rotation"])
    l.new(al_azar(ng, "FLOAT", 0.7, 1.3, 3), poner.inputs["Scale"])
    unir = n.new("GeometryNodeJoinGeometry")
    l.new(entrada.outputs[0], unir.inputs["Geometry"])
    l.new(poner.outputs["Instances"], unir.inputs["Geometry"])
    l.new(unir.outputs["Geometry"], salida.inputs[0])
    return ng


mat_suelo_cesped = material_suelo_cesped()
grupo_cesped = nodos_cesped(float(opcion("--cesped", 1800)))
for trozo in cesped:
    trozo.data.materials[0] = mat_suelo_cesped
    trozo.modifiers.new("Césped", "NODES").node_group = grupo_cesped


# --- Setos y cipreses: un volumen con bultos cubierto de hojitas orientadas al azar ---
def nodos_follaje(nombre, hoja, densidad):
    ng, entrada, salida = grupo_de_nodos(nombre)
    n, l = ng.nodes, ng.links
    reparto = n.new("GeometryNodeDistributePointsOnFaces")
    l.new(entrada.outputs[0], reparto.inputs["Mesh"])
    reparto.inputs["Density"].default_value = densidad
    info = n.new("GeometryNodeObjectInfo")
    info.inputs["Object"].default_value = hoja
    info.inputs["As Instance"].default_value = True
    giro = n.new("FunctionNodeEulerToRotation")
    l.new(al_azar(ng, "FLOAT_VECTOR", (0.0, 0.0, 0.0), (6.283, 6.283, 6.283), 5), giro.inputs["Euler"])
    poner = n.new("GeometryNodeInstanceOnPoints")
    l.new(reparto.outputs["Points"], poner.inputs["Points"])
    l.new(info.outputs["Geometry"], poner.inputs["Instance"])
    l.new(giro.outputs["Rotation"], poner.inputs["Rotation"])
    l.new(al_azar(ng, "FLOAT", 0.6, 1.3, 6), poner.inputs["Scale"])
    unir = n.new("GeometryNodeJoinGeometry")
    l.new(entrada.outputs[0], unir.inputs["Geometry"])
    l.new(poner.outputs["Instances"], unir.inputs["Geometry"])
    l.new(unir.outputs["Geometry"], salida.inputs[0])
    return ng


def hojita(nombre, largo, ancho, mat):
    """Hoja en rombo, como las escamas de la arizónica y del ciprés"""
    return malla(nombre, [(0, 0, 0), (ancho / 2, 0, largo * 0.45), (0, 0, largo), (-ancho / 2, 0, largo * 0.45)], [(0, 1, 2, 3)], mat, oculta=True)


mat_hoja_seto = material_vegetal("Hoja de seto", [(0.0, (0.025, 0.07, 0.018)), (1.0, (0.1, 0.17, 0.045)), (0.5, (0.05, 0.11, 0.025))], 0.25, 0.6)
mat_hoja_cipres = material_vegetal("Hoja de ciprés", [(0.0, (0.015, 0.045, 0.02)), (1.0, (0.06, 0.1, 0.04)), (0.6, (0.03, 0.07, 0.028))], 0.2, 0.65)
mat_seto_dentro = material("Seto por dentro", (0.012, 0.03, 0.01), 0.9)
DENSIDAD_FOLLAJE = float(opcion("--follaje", 1800))
follaje_seto = nodos_follaje("Follaje de seto", hojita("Hoja de seto", 0.045, 0.02, mat_hoja_seto), DENSIDAD_FOLLAJE)
follaje_cipres = nodos_follaje("Follaje de ciprés", hojita("Hoja de ciprés", 0.05, 0.018, mat_hoja_cipres), DENSIDAD_FOLLAJE)


def bultos(o, tamano, fuerza):
    """Desplaza la superficie con un ruido grande: el seto o el ciprés deja de ser una figura geométrica"""
    tex = bpy.data.textures.new(f"{o.name} bultos", "CLOUDS")
    tex.noise_scale = tamano
    d = o.modifiers.new("Bultos", "DISPLACE")
    d.texture = tex
    d.texture_coords = "GLOBAL"
    d.strength = fuerza


def seto(nombre, x0, x1, y0, y1, alto):
    o = caja(nombre, x0, x1, y0, y1, 0.0, alto, mat_seto_dentro, bisel=0)
    mallado = o.modifiers.new("Mallado", "REMESH")
    mallado.mode = "VOXEL"
    mallado.voxel_size = 0.12
    bultos(o, 0.35, 0.14)
    o.modifiers.new("Follaje", "NODES").node_group = follaje_seto
    return o


def cipres(nombre, x, y, alto, ancho):
    """Ciprés mediterráneo: un huso estrecho y alto, con hojas casi hasta el suelo"""
    perfil = [(0.0, 0.16), (0.04, 0.4), (0.15, 0.5), (0.38, 0.5), (0.6, 0.43), (0.78, 0.3), (0.92, 0.13)]
    lados = 16
    verts, caras = [], []
    for h, r in perfil:
        verts += [(x + r * ancho * math.cos(2 * math.pi * k / lados), y + r * ancho * math.sin(2 * math.pi * k / lados), h * alto) for k in range(lados)]
    for i in range(len(perfil) - 1):
        for k in range(lados):
            a, b = i * lados + k, i * lados + (k + 1) % lados
            caras.append((a, b, b + lados, a + lados))
    verts.append((x, y, alto))
    cima = len(verts) - 1
    arriba = (len(perfil) - 1) * lados
    caras += [(arriba + k, arriba + (k + 1) % lados, cima) for k in range(lados)]
    caras.append(tuple(reversed(range(lados))))
    o = malla(nombre, verts, caras, mat_seto_dentro, suave=True)
    o.modifiers.new("Suavizar", "SUBSURF").levels = 2
    o.modifiers["Suavizar"].render_levels = 2
    bultos(o, 0.5, 0.16)
    o.modifiers.new("Follaje", "NODES").node_group = follaje_cipres
    return o


# Setos por dentro de las tapias (algo más altos que ellas) y cipreses en las esquinas del fondo y en la parcela de detrás
seto("Seto fondo", PARCELA["x0"] + 0.05, PARCELA["x1"] - 0.05, PARCELA["y1"] - 0.8, PARCELA["y1"] - 0.05, 2.1)
seto("Seto izquierdo", PARCELA["x0"] + 0.05, PARCELA["x0"] + 0.8, PARCELA["y0"] + 0.1, PARCELA["y1"] - 0.8, 1.9)
seto("Seto derecho", PARCELA["x1"] - 0.8, PARCELA["x1"] - 0.05, PARCELA["y0"] + 0.1, PARCELA["y1"] - 0.8, 1.9)
for i, (cx, cy, alto) in enumerate([(-8.0, 7.6, 7.5), (13.4, 7.6, 8.2), (-4.5, 11.8, 9.0), (-2.2, 12.2, 8.0), (8.5, 12.0, 8.6), (10.8, 11.6, 7.4)]):
    cipres(f"Ciprés {i + 1}", cx, cy, alto, 1.3 + 0.1 * (i % 3))


# --- Casas vecinas: volúmenes encalados con tejado de teja a cuatro aguas, ventanas con persiana y chimenea ---
def material_tejas():
    m = bpy.data.materials.new("Tejas")
    m.use_nodes = True
    a = m.node_tree
    n, l = a.nodes, a.links
    p = n["Principled BSDF"]
    pos = n.new("ShaderNodeNewGeometry").outputs["Position"]
    tonos = n.new("ShaderNodeMix")
    tonos.data_type = "RGBA"
    ent(tonos, "A").default_value = (0.38, 0.14, 0.065, 1)
    ent(tonos, "B").default_value = (0.26, 0.11, 0.06, 1)
    l.new(ruido(a, pos, 1.3, 4.0), ent(tonos, "Factor"))
    musgo = n.new("ShaderNodeMix")
    musgo.data_type = "RGBA"
    l.new(sal(tonos, "Result"), ent(musgo, "A"))
    ent(musgo, "B").default_value = (0.2, 0.19, 0.12, 1)
    l.new(mates(a, "SUBTRACT", 1.0, borde_suave(a, ruido(a, pos, 0.6, 3.0), 0.63, 0.72)), ent(musgo, "Factor"))
    l.new(sal(musgo, "Result"), p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.75
    # Canales de las tejas: ondas a lo largo de x
    ondas = n.new("ShaderNodeTexWave")
    ondas.wave_type = "BANDS"
    ondas.bands_direction = "X"
    ondas.inputs["Scale"].default_value = 1.1
    l.new(pos, ondas.inputs["Vector"])
    relieve = n.new("ShaderNodeBump")
    relieve.inputs["Strength"].default_value = 0.6
    l.new(ondas.outputs["Factor"], relieve.inputs["Height"])
    l.new(relieve.outputs["Normal"], p.inputs["Normal"])
    return m


mat_tejas = material_tejas()
mat_cristal_vecinas = material("Cristal (vecinas)", (0.012, 0.016, 0.02), 0.04)
mat_persiana = material("Persiana", (0.6, 0.58, 0.53), 0.6)


def casa_vecina(nombre, cx, cy, ancho, fondo, plantas, giro=0.0):
    """Centrada en el origen y luego movida a su sitio; la fachada con ventanas mira a la parcela (−y)"""
    w, d = ancho / 2, fondo / 2
    alto = plantas * 2.9 + 0.3
    raiz = bpy.data.objects.new(nombre, None)
    coleccion.objects.link(raiz)
    piezas = [caja(f"{nombre} muros", -w, w, -d, d, -0.1, alto, mat_enfoscado)]
    # Tejado a cuatro aguas con alero
    alero = 0.45
    W, D = w + alero, d + alero
    h = 0.45 * D
    verts = [(-W, -D, alto), (W, -D, alto), (W, D, alto), (-W, D, alto), (-w + d, 0.0, alto + h), (w - d, 0.0, alto + h)]
    piezas.append(malla(f"{nombre} tejado", verts, [(0, 1, 5, 4), (1, 2, 5), (2, 3, 4, 5), (3, 0, 4)], mat_tejas))
    piezas.append(caja(f"{nombre} chimenea", w * 0.35, w * 0.35 + 0.6, 0.6, 1.2, alto, alto + h + 0.7, mat_enfoscado))
    # Ventanas: cristal oscuro, persiana a medio bajar y alféizar blanco
    for planta in range(plantas):
        z = 0.95 + planta * 2.9
        huecos = max(2, int(ancho // 3.2))
        for k in range(huecos):
            x = -w + ancho * (k + 0.5) / huecos
            piezas.append(caja(f"{nombre} cristal {planta}{k}", x - 0.55, x + 0.55, -d - 0.02, -d + 0.01, z, z + 1.25, mat_cristal_vecinas, bisel=0))
            piezas.append(caja(f"{nombre} persiana {planta}{k}", x - 0.55, x + 0.55, -d - 0.025, -d + 0.01, z + 0.55, z + 1.25, mat_persiana, bisel=0))
            piezas.append(caja(f"{nombre} alféizar {planta}{k}", x - 0.65, x + 0.65, -d - 0.07, -d + 0.01, z - 0.06, z, mat_piedra, bisel=0.004))
    for o in piezas:
        o.parent = raiz
    raiz.location = (cx, cy, 0.0)
    raiz.rotation_euler = (0.0, 0.0, giro)


casa_vecina("Vecina 1", -13.5, 20.5, 11.0, 8.5, 2, 0.05)
casa_vecina("Vecina 2", 1.0, 23.0, 12.0, 9.0, 1, -0.04)
casa_vecina("Vecina 3", 15.5, 20.0, 10.0, 8.0, 2, 0.08)
casa_vecina("Vecina 4", -19.5, -2.5, 10.0, 8.0, 1, math.pi / 2)

# --- A lo lejos: encinas en los jardines vecinos y bruma que funde el campo con el cielo ---
def con_bruma(m, cerca=45.0, lejos=300.0):
    """Lo lejano se funde con el cielo, como pasa con el aire de verdad: para la cámara se vuelve transparente poco
    a poco y deja ver el fondo, cuya mitad de abajo es el color del horizonte (ver el mundo, arriba)"""
    a = m.node_tree
    n, l = a.nodes, a.links
    salida = next(x for x in n if x.type == "OUTPUT_MATERIAL")
    origen = salida.inputs["Surface"].links[0].from_socket
    largo = n.new("ShaderNodeVectorMath")
    largo.operation = "LENGTH"
    l.new(n.new("ShaderNodeNewGeometry").outputs["Position"], largo.inputs[0])
    lejania = mates(a, "SUBTRACT", 1.0, borde_suave(a, sal(largo, "Value"), cerca, lejos))
    camino = n.new("ShaderNodeLightPath")
    factor = mates(a, "MULTIPLY", camino.outputs["Is Camera Ray"], mates(a, "POWER", lejania, 0.7))
    transparente = n.new("ShaderNodeBsdfTransparent")
    mezcla_bruma = n.new("ShaderNodeMixShader")
    l.new(factor, mezcla_bruma.inputs["Fac"])
    l.new(origen, mezcla_bruma.inputs[1])
    l.new(transparente.outputs["BSDF"], mezcla_bruma.inputs[2])
    l.new(mezcla_bruma.outputs["Shader"], salida.inputs["Surface"])


def arbol_frondoso(nombre, x, y, escala=1.0):
    """Una encina de unos 8 m en un jardín vecino: tronco y copa ancha y aplastada, cubierta de hojas como los setos"""
    from mathutils import noise as ruido_mu

    tronco_bm = bmesh.new()
    bmesh.ops.create_cone(tronco_bm, cap_ends=True, segments=12, radius1=0.3 * escala, radius2=0.18 * escala, depth=3.4 * escala,
                          matrix=__import__("mathutils").Matrix.Translation((x, y, 1.7 * escala)))
    malla_tronco = bpy.data.meshes.new(f"{nombre} tronco")
    tronco_bm.to_mesh(malla_tronco)
    tronco_bm.free()
    tronco = bpy.data.objects.new(f"{nombre} tronco", malla_tronco)
    coleccion.objects.link(tronco)
    tronco.data.materials.append(mat_corteza)
    copa_bm = bmesh.new()
    bmesh.ops.create_icosphere(copa_bm, subdivisions=3, radius=1.0)
    for v in copa_bm.verts:
        bulto = 1 + 0.2 * ruido_mu.noise(v.co * 1.6 + Vector((x, y, 0))) + 0.07 * ruido_mu.noise(v.co * 4.5)
        v.co = Vector((x + v.co.x * 4.2 * escala * bulto, y + v.co.y * 4.2 * escala * bulto, (5.2 + v.co.z * 2.2 * bulto) * escala))
    malla_copa = bpy.data.meshes.new(f"{nombre} copa")
    copa_bm.to_mesh(malla_copa)
    copa_bm.free()
    copa = bpy.data.objects.new(f"{nombre} copa", malla_copa)
    coleccion.objects.link(copa)
    copa.data.materials.append(mat_seto_dentro)
    for p in malla_copa.polygons:
        p.use_smooth = True
    copa.modifiers.new("Follaje", "NODES").node_group = follaje_encina


mat_corteza = material("Corteza", (0.12, 0.1, 0.085), 0.9)
mat_hoja_encina = material_vegetal("Hoja de encina", [(0.0, (0.03, 0.05, 0.02)), (1.0, (0.11, 0.13, 0.06)), (0.55, (0.06, 0.08, 0.035))], 0.2, 0.55)
follaje_encina = nodos_follaje("Follaje de encina", hojita("Hoja de encina", 0.06, 0.035, mat_hoja_encina), DENSIDAD_FOLLAJE * 0.8)
for i, (cx, cy, e) in enumerate([(-15.0, 33.0, 1.0), (8.0, 36.0, 1.1), (24.0, 29.0, 0.9), (-27.0, 12.0, 1.0)]):
    arbol_frondoso(f"Encina {i + 1}", cx, cy, e)

# El campo lejano se funde con el cielo
con_bruma(mat_campo)

# Casa: muros, forjados entre muros y acabados
caja("Muro izquierdo", x0, i0, y0, y1, 0, TECHO, mat_enfoscado)
caja("Muro derecho", i1, x1, y0, y1, 0, TECHO, mat_enfoscado)
caja("Muro fondo", i0, i1, f1, y1, 0, TECHO, mat_enfoscado)
# Las caras de dentro, pintadas: una lámina fina sobre cada muro
pintura_mancha = caja("Pintura izquierda", i0, i0 + 0.004, y0, f1, 0, TECHO, mat_pintura, bisel=0)
caja("Pintura derecha", i1 - 0.004, i1, y0, f1, 0, TECHO, mat_pintura, bisel=0)
caja("Pintura fondo", i0, i1, f1 - 0.004, f1, 0, TECHO, mat_pintura, bisel=0)
caja("Solera del garaje", i0, i1, y0, f1, -0.1, 0.12, mat_hormigon, bisel=0)
caja("Forjado 1", i0, i1, y0, f1, PLANTA - FORJADO, PLANTA, mat_hormigon, bisel=0)
caja("Forjado 2", i0, i1, y0, f1, TECHO - FORJADO, TECHO, mat_hormigon, bisel=0)
# Techos pintados y suelos de barro cocido (salón y terraza)
caja("Techo garaje", i0, i1, y0, f1, PLANTA - FORJADO - 0.004, PLANTA - FORJADO, mat_pintura, bisel=0)
caja("Techo salón", i0, i1, y0, f1, TECHO - FORJADO - 0.004, TECHO - FORJADO, mat_pintura, bisel=0)
suelo_charco = caja("Suelo salón", i0, i1, y0, f1, PLANTA, PLANTA + SUELO, mat_barro, bisel=0.002)
caja("Suelo terraza", x0, x1, y0, y1, TECHO, TECHO + SUELO, mat_barro, bisel=0.002)
# Petos de la terraza (sin el de delante: está cortado) con albardilla
for nombre, a in (
    ("Peto izquierdo", (x0, i0, y0, f1)),
    ("Peto derecho", (i1, x1, y0, f1)),
    ("Peto fondo", (x0, x1, f1, y1)),
):
    caja(nombre, *a, TECHO + SUELO, TECHO + PETO, mat_enfoscado)
    caja(f"{nombre} albardilla", a[0] - 0.04, a[1] + 0.04, a[2] - (0 if a[2] == y0 else 0.04), a[3] + 0.04, TECHO + PETO, TECHO + PETO + 0.05, mat_piedra, bisel=0.006)
# Rodapié del salón y puerta de paso al fondo del garaje
caja("Rodapié fondo", i0, i1, f1 - 0.012, f1, PLANTA + SUELO, PLANTA + SUELO + 0.08, mat_blanco, bisel=0.002)
caja("Rodapié izquierdo", i0, i0 + 0.012, y0, f1, PLANTA + SUELO, PLANTA + SUELO + 0.08, mat_blanco, bisel=0.002)
caja("Puerta de paso", -1.4, -0.5, f1 - 0.03, f1, 0.12, 2.15, mat_madera, bisel=0.004)
caja("Marco puerta izquierdo", -1.47, -1.4, f1 - 0.05, f1, 0.12, 2.22, mat_blanco, bisel=0.003)
caja("Marco puerta derecho", -0.5, -0.43, f1 - 0.05, f1, 0.12, 2.22, mat_blanco, bisel=0.003)
caja("Marco puerta dintel", -1.47, -0.43, f1 - 0.05, f1, 2.15, 2.22, mat_blanco, bisel=0.003)
caja("Manilla", -0.65, -0.55, f1 - 0.07, f1 - 0.05, 1.03, 1.05, mat_metal, bisel=0.003)
# Bajante de la terraza en la esquina de la fachada
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.055, depth=TECHO + 0.3, location=(x1 + 0.08, y0 + 0.3, (TECHO + 0.3) / 2))
bpy.context.object.name = "Bajante"
bpy.context.object.data.materials.append(mat_pvc)
bpy.ops.object.shade_smooth()

# ------------------------------------------------------------------------------------------------
# Modelos de Poly Haven
# ------------------------------------------------------------------------------------------------
def modelo(id, posicion, giro=0.0, escala=(1, 1, 1)):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(RECURSOS, "modelos", id, f"{id}.gltf"))
    nuevos = [o for o in bpy.data.objects if o not in antes]
    raiz = bpy.data.objects.new(id, None)
    coleccion.objects.link(raiz)
    for o in nuevos:
        if o.type == "MESH" and any("graffiti" in (s.material.name if s.material else "") for s in o.material_slots):
            bpy.data.objects.remove(o)
            continue
        if o.parent is None:
            o.parent = raiz
        for s in o.material_slots:
            m = s.material
            p = next((x for x in m.node_tree.nodes if x.type == "BSDF_PRINCIPLED"), None) if m and m.use_nodes else None
            if p and (p.inputs["Transmission Weight"].default_value > 0.5 or "glass" in m.name) and not m.get("sombra"):
                vidrio_fino(m)
                m["sombra"] = True
    raiz.location = posicion
    raiz.rotation_euler = (0, 0, giro)
    raiz.scale = escala
    return raiz


# El modelo de la ventana mira hacia -Y y la persiana queda en su plano y = 0; el cajón sobresale 30 cm
modelo("rollershutter_window_01", (x1, -0.2, PLANTA + 0.45), giro=math.pi / 2)
modelo("rollershutter_window_01", (1.8, f1, PLANTA + 0.75), escala=(0.75, 1, 0.75))  # al fondo del salón
modelo("rollershutter_door", (x1, 0.4, 0.12), giro=math.pi / 2, escala=(2.4, 1, 0.92))
modelo("sofa_03", (-1.3, f1 - 0.55, PLANTA + SUELO))
modelo("throw_pillows_01", (-1.3, f1 - 0.6, PLANTA + SUELO + 0.45))
modelo("modern_coffee_table_01", (-1.3, f1 - 1.75, PLANTA + SUELO), giro=math.pi / 2)
# El lienzo del modelo mira a -Y y su respaldo está en y = 0: sin girarlo, queda mirando a la habitación
modelo("hanging_picture_frame_01", (-1.3, f1 - 0.004, PLANTA + 1.85), escala=(1.4, 1, 1.4))


def lienzo_abstracto(m):
    """El modelo del cuadro trae el cartón de muestra del fabricante (gris, con letras): se cambia por una pintura
    abstracta en tonos tierra, hecha con nodos"""
    n = m.node_tree.nodes
    l = m.node_tree.links
    p = next(x for x in n if x.type == "BSDF_PRINCIPLED")
    coord = n.new("ShaderNodeTexCoord")
    manchas = n.new("ShaderNodeTexNoise")
    manchas.inputs["Scale"].default_value = 2.2
    manchas.inputs["Detail"].default_value = 6
    manchas.inputs["Distortion"].default_value = 1.2
    l.new(coord.outputs["UV"], manchas.inputs["Vector"])
    rampa = n.new("ShaderNodeValToRGB")
    e = rampa.color_ramp.elements
    e[0].position, e[0].color = 0.3, (0.08, 0.12, 0.2, 1)
    e[1].position, e[1].color = 0.75, (0.85, 0.72, 0.5, 1)
    e.new(0.45).color = (0.55, 0.22, 0.1, 1)
    e.new(0.6).color = (0.78, 0.5, 0.22, 1)
    l.new(manchas.outputs["Fac"], rampa.inputs["Fac"])
    l.new(rampa.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.6


lienzo_abstracto(bpy.data.materials["hanging_picture_frame_01_artwork"])
modelo("potted_plant_02", (-3.15, f1 - 0.5, PLANTA + SUELO))
modelo("potted_plant_04", (-0.95, f1 - 1.75, PLANTA + SUELO + 0.39))
modelo("outdoor_table_chair_set_01", (10.2, 3.95, 0.04), giro=math.pi / 2)
modelo("planter_box_01", (5.6, 4.3, 0.04))
modelo("planter_box_01", (x1 + 0.45, 2.3, 0.0), giro=math.pi / 2)

# Luz del salón: un plafón cálido
bpy.ops.object.light_add(type="AREA", location=(0, 0.3, TECHO - FORJADO - 0.02))
plafon = bpy.context.object
plafon.data.shape = "DISK"
plafon.data.size = 0.5
plafon.data.energy = 120
plafon.data.color = (1.0, 0.82, 0.62)

# ------------------------------------------------------------------------------------------------
# Lo que se anima
# ------------------------------------------------------------------------------------------------
def origen_en(obj, punto):
    """Mueve el origen del objeto a `punto` (para escalar desde un borde)"""
    desplaz = Vector(punto) - obj.location
    obj.data.transform(__import__("mathutils").Matrix.Translation(-desplaz))
    obj.location = punto


# 1. Terraza
membrana = caja("Membrana", x0 + 0.02, x1 - 0.02, y0, y1 - 0.02, TECHO + SUELO, TECHO + SUELO + 0.004, mat_membrana, bisel=0)
origen_en(membrana, (0, y1 - 0.02, TECHO + SUELO))
# Rodillo: funda de pelo, armadura y alargador
mat_funda = material("Funda del rodillo", (0.55, 0.06, 0.03), 0.95)
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.06, depth=0.25, rotation=(0, math.pi / 2, 0), location=(0, 0, 0.06))
funda = bpy.context.object
funda.data.materials.append(mat_funda)
bpy.ops.object.shade_smooth()
# El alargador sale de la funda hacia el lado sin pintar (delante) y hacia arriba
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.012, depth=1.6, location=(0, -0.51, 0.67), rotation=(math.radians(40), 0, 0))
palo = bpy.context.object
palo.data.materials.append(mat_pvc)
bpy.ops.object.shade_smooth()
rodillo = bpy.data.objects.new("Rodillo", None)
coleccion.objects.link(rodillo)
funda.parent = rodillo
palo.parent = rodillo
# Mancha de humedad en la pared del salón y charco en el suelo: van en los materiales de la pintura y del barro,
# así tienen forma de verdad y se ven con la misma luz que la pared. «Crece» las extiende y «fuerza» las seca.
def con_mancha(base):
    """La pintura con la mancha: nace junto al techo, sobre la gotera, y baja abriéndose, con el borde irregular
    y un cerco más oscuro, como las de verdad"""
    m = base.copy()
    m.name = "Pintura con mancha"
    a = m.node_tree
    n, l = a.nodes, a.links
    p = n["Principled BSDF"]
    crece = valor_animado(a, "Crece")
    fuerza = valor_animado(a, "Fuerza")
    pos = n.new("ShaderNodeNewGeometry").outputs["Position"]
    sep = n.new("ShaderNodeSeparateXYZ")
    l.new(pos, sep.inputs[0])
    # Distancia al punto de entrada del agua; hacia abajo cuenta menos: la mancha baja más de lo que se abre
    dy = mates(a, "DIVIDE", mates(a, "SUBTRACT", sep.outputs["Y"], GOTERA.y), 0.9)
    dz = mates(a, "DIVIDE", mates(a, "SUBTRACT", TECHO - FORJADO, sep.outputs["Z"]), 1.8)
    d = mates(a, "SQRT", mates(a, "ADD", mates(a, "MULTIPLY", dy, dy), mates(a, "MULTIPLY", dz, dz)))
    grande = ruido(a, pos, 1.6)
    fino = ruido(a, pos, 9.0, 4.0)
    d = mates(a, "ADD", d, mates(a, "MULTIPLY", mates(a, "SUBTRACT", grande, 0.5), 0.55))
    d = mates(a, "ADD", d, mates(a, "MULTIPLY", mates(a, "SUBTRACT", fino, 0.5), 0.12))
    dentro = mates(a, "MULTIPLY", borde_suave(a, d, mates(a, "SUBTRACT", crece, 0.05), crece), fuerza)
    # El cerco: una banda más oscura justo por dentro del borde
    banda = mates(a, "SUBTRACT", 1.0, borde_suave(a, d, mates(a, "SUBTRACT", crece, 0.16), mates(a, "SUBTRACT", crece, 0.06)))
    cerco = mates(a, "MULTIPLY", banda, dentro)
    humedo = n.new("ShaderNodeMix")
    humedo.data_type = "RGBA"
    ent(humedo, "A").default_value = p.inputs["Base Color"].default_value[:]
    ent(humedo, "B").default_value = (0.52, 0.45, 0.33, 1)
    # Desigual por dentro: unas zonas más mojadas que otras
    l.new(mates(a, "MULTIPLY", dentro, mates(a, "MULTIPLY_ADD", grande, 0.5, 0.45)), ent(humedo, "Factor"))
    con_cerco = n.new("ShaderNodeMix")
    con_cerco.data_type = "RGBA"
    l.new(sal(humedo, "Result"), ent(con_cerco, "A"))
    ent(con_cerco, "B").default_value = (0.33, 0.27, 0.18, 1)
    l.new(mates(a, "MULTIPLY", cerco, 0.8), ent(con_cerco, "Factor"))
    l.new(sal(con_cerco, "Result"), p.inputs["Base Color"])
    l.new(mates(a, "SUBTRACT", p.inputs["Roughness"].default_value, mates(a, "MULTIPLY", dentro, 0.3)), p.inputs["Roughness"])
    return m, crece, fuerza


def con_charco(base):
    """El barro cocido con el charco que deja la gotera: redondo pero irregular, más oscuro y con una película de agua
    que brilla; alrededor, una aureola de suelo húmedo"""
    m = base.copy()
    m.name = "Barro con charco"
    a = m.node_tree
    n, l = a.nodes, a.links
    p = n["Principled BSDF"]
    crece = valor_animado(a, "Crece")
    fuerza = valor_animado(a, "Fuerza")
    pos = n.new("ShaderNodeNewGeometry").outputs["Position"]
    sep = n.new("ShaderNodeSeparateXYZ")
    l.new(pos, sep.inputs[0])
    dx = mates(a, "SUBTRACT", sep.outputs["X"], GOTERA.x)
    dy = mates(a, "SUBTRACT", sep.outputs["Y"], GOTERA.y)
    d = mates(a, "SQRT", mates(a, "ADD", mates(a, "MULTIPLY", dx, dx), mates(a, "MULTIPLY", dy, dy)))
    d = mates(a, "ADD", d, mates(a, "MULTIPLY", mates(a, "SUBTRACT", ruido(a, pos, 2.5), 0.5), 0.3))
    radio = mates(a, "MULTIPLY", crece, 0.55)
    agua = mates(a, "MULTIPLY", borde_suave(a, d, mates(a, "SUBTRACT", radio, 0.03), radio), fuerza)
    aureola = mates(a, "MULTIPLY", borde_suave(a, d, radio, mates(a, "ADD", radio, 0.25)), fuerza)
    color = p.inputs["Base Color"].links[0].from_socket
    oscuro = n.new("ShaderNodeMix")
    oscuro.data_type = "RGBA"
    oscuro.blend_type = "MULTIPLY"
    l.new(color, ent(oscuro, "A"))
    ent(oscuro, "B").default_value = (0.42, 0.42, 0.42, 1)
    l.new(mates(a, "MINIMUM", mates(a, "ADD", agua, mates(a, "MULTIPLY", aureola, 0.4)), 1.0), ent(oscuro, "Factor"))
    l.new(sal(oscuro, "Result"), p.inputs["Base Color"])
    rugosidad = p.inputs["Roughness"].links[0].from_socket
    lisa = n.new("ShaderNodeMix")
    lisa.data_type = "FLOAT"
    l.new(rugosidad, ent(lisa, "A"))
    ent(lisa, "B").default_value = 0.03
    l.new(agua, ent(lisa, "Factor"))
    l.new(sal(lisa, "Result"), p.inputs["Roughness"])
    l.new(agua, p.inputs["Coat Weight"])
    p.inputs["Coat Roughness"].default_value = 0.02
    return m, crece, fuerza


mat_pintura_mancha, mancha_crece, mancha_fuerza = con_mancha(mat_pintura)
pintura_mancha.data.materials[0] = mat_pintura_mancha
mat_barro_charco, charco_crece, charco_fuerza = con_charco(mat_barro)
suelo_charco.data.materials[0] = mat_barro_charco
gotas = []
for i in range(3):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.03)
    g = bpy.context.object
    g.scale = (1, 1, 1.5)
    g.data.materials.append(mat_gota)
    bpy.ops.object.shade_smooth()
    gotas.append(g)

# Lluvia: nodos de geometría. Puntos repartidos sobre la parcela que caen con el tiempo de la escena;
# sobre la casa se paran en la terraza. Cada gota es un trazo fino, como la ve una cámara.
def crear_lluvia():
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.0035, depth=0.38)
    trazo = bpy.context.object
    trazo.name = "Trazo de lluvia"
    trazo.data.materials.append(material("Lluvia", (0.85, 0.9, 1.0), 0.15, **{"Transmission Weight": 0.6, "Alpha": 0.55}))
    trazo.hide_render = True
    trazo.hide_viewport = True
    contenedor = caja("Lluvia", -1, 1, -1, 1, 0, 0.01, mat_pintura, bisel=0)
    ng = bpy.data.node_groups.new("Lluvia", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    n = ng.nodes
    l = ng.links
    salida = n.new("NodeGroupOutput")
    rejilla = n.new("GeometryNodeMeshGrid")
    rejilla.inputs["Size X"].default_value = 22
    rejilla.inputs["Size Y"].default_value = 16
    puntos = n.new("GeometryNodeDistributePointsOnFaces")
    puntos.inputs["Density"].default_value = 9
    l.new(rejilla.outputs["Mesh"], puntos.inputs["Mesh"])
    # Altura de caída: de 14 m al suelo, o a la terraza sobre la casa
    pos = n.new("GeometryNodeInputPosition")
    sep = n.new("ShaderNodeSeparateXYZ")
    l.new(pos.outputs["Position"], sep.inputs[0])
    dentro_x = n.new("FunctionNodeCompare")
    dentro_x.data_type = "FLOAT"
    dentro_x.operation = "LESS_THAN"
    ax = n.new("ShaderNodeMath")
    ax.operation = "ABSOLUTE"
    resta_x = n.new("ShaderNodeMath")
    resta_x.operation = "SUBTRACT"
    l.new(sep.outputs["X"], resta_x.inputs[0])
    resta_x.inputs[1].default_value = -DESPLAZ_LLUVIA  # la rejilla va corrida a la derecha; la casa está en x = 0
    l.new(resta_x.outputs[0], ax.inputs[0])
    l.new(ax.outputs[0], ent(dentro_x, "A"))
    ent(dentro_x, "B").default_value = 4.0
    dentro_y = n.new("FunctionNodeCompare")
    dentro_y.data_type = "FLOAT"
    dentro_y.operation = "LESS_THAN"
    ay = n.new("ShaderNodeMath")
    ay.operation = "ABSOLUTE"
    l.new(sep.outputs["Y"], ay.inputs[0])
    l.new(ay.outputs[0], ent(dentro_y, "A"))
    ent(dentro_y, "B").default_value = 3.0
    y_logico = n.new("FunctionNodeBooleanMath")
    y_logico.operation = "AND"
    l.new(sal(dentro_x, "Result"), y_logico.inputs[0])
    l.new(sal(dentro_y, "Result"), y_logico.inputs[1])
    suelo = n.new("GeometryNodeSwitch")
    suelo.input_type = "FLOAT"
    l.new(y_logico.outputs["Boolean"], ent(suelo, "Switch"))
    ent(suelo, "False").default_value = 0.0
    ent(suelo, "True").default_value = TECHO + PETO
    # z = suelo + caída · fract(semilla − t · velocidad / caída)
    tiempo = n.new("GeometryNodeInputSceneTime")
    azar = n.new("FunctionNodeRandomValue")
    azar.data_type = "FLOAT"
    avance = n.new("ShaderNodeMath")
    avance.operation = "MULTIPLY_ADD"
    l.new(tiempo.outputs["Seconds"], avance.inputs[0])
    avance.inputs[1].default_value = -9.0 / 14.0
    l.new(sal(azar, "Value"), avance.inputs[2])
    fraccion = n.new("ShaderNodeMath")
    fraccion.operation = "FRACT"
    l.new(avance.outputs[0], fraccion.inputs[0])
    caida = n.new("ShaderNodeMath")
    caida.operation = "SUBTRACT"
    caida.inputs[0].default_value = 14.0
    l.new(sal(suelo, "Output"), caida.inputs[1])
    altura = n.new("ShaderNodeMath")
    altura.operation = "MULTIPLY_ADD"
    l.new(fraccion.outputs[0], altura.inputs[0])
    l.new(caida.outputs[0], altura.inputs[1])
    l.new(sal(suelo, "Output"), altura.inputs[2])
    nueva = n.new("ShaderNodeCombineXYZ")
    l.new(sep.outputs["X"], nueva.inputs["X"])
    l.new(sep.outputs["Y"], nueva.inputs["Y"])
    l.new(altura.outputs[0], nueva.inputs["Z"])
    fijar = n.new("GeometryNodeSetPosition")
    l.new(puntos.outputs["Points"], fijar.inputs["Geometry"])
    l.new(nueva.outputs["Vector"], fijar.inputs["Position"])
    # Solo una parte de las gotas, según cuánto llueve
    azar2 = n.new("FunctionNodeRandomValue")
    azar2.data_type = "FLOAT"
    ent(azar2, "Seed").default_value = 7
    menos = n.new("FunctionNodeCompare")
    menos.data_type = "FLOAT"
    menos.operation = "GREATER_EQUAL"
    l.new(sal(azar2, "Value"), ent(menos, "A"))
    cuanto = n.new("ShaderNodeValue")  # cuánto llueve, de 0 a 1: se anima
    cuanto.name = "Cantidad"
    l.new(cuanto.outputs[0], ent(menos, "B"))
    borrar = n.new("GeometryNodeDeleteGeometry")
    l.new(fijar.outputs["Geometry"], borrar.inputs["Geometry"])
    l.new(sal(menos, "Result"), borrar.inputs["Selection"])
    info = n.new("GeometryNodeObjectInfo")
    info.inputs["Object"].default_value = trazo
    instancias = n.new("GeometryNodeInstanceOnPoints")
    l.new(borrar.outputs["Geometry"], instancias.inputs["Points"])
    l.new(info.outputs["Geometry"], instancias.inputs["Instance"])
    instancias.inputs["Rotation"].default_value = (math.radians(8), 0, 0)  # el viento la inclina un poco
    l.new(instancias.outputs["Instances"], salida.inputs["Geometry"])
    mod = contenedor.modifiers.new("Lluvia", "NODES")
    mod.node_group = ng
    contenedor.location = (DESPLAZ_LLUVIA, 0.0, 0.0)
    return cuanto.outputs[0]


DESPLAZ_LLUVIA = 2.5  # la rejilla de 22 m, corrida para cubrir también la piscina


cantidad_lluvia = crear_lluvia()

# 2. Piscina: la lámina sube por las paredes y luego entra el agua
def pared_lamina(nombre, a0, a1, b0, b1):
    o = caja(nombre, a0, a1, b0, b1, -VASO["fondo"], 0.0, mat_gresite, bisel=0)
    origen_en(o, (o.location.x, o.location.y, -VASO["fondo"]))
    return o


E = 0.01
lamina = [
    caja("Lámina fondo", VASO["x0"], VASO["x1"], VASO["y0"], VASO["y1"], -VASO["fondo"], -VASO["fondo"] + E, mat_gresite, bisel=0),
    pared_lamina("Lámina sur", VASO["x0"], VASO["x1"], VASO["y0"], VASO["y0"] + E),
    pared_lamina("Lámina norte", VASO["x0"], VASO["x1"], VASO["y1"] - E, VASO["y1"]),
    pared_lamina("Lámina oeste", VASO["x0"], VASO["x0"] + E, VASO["y0"], VASO["y1"]),
    pared_lamina("Lámina este", VASO["x1"] - E, VASO["x1"], VASO["y0"], VASO["y1"]),
]
# El agua se mete medio centímetro en la lámina: si sus caras coincidieran con las de la lámina, los rayos se colarían
# entre las dos y el fondo saldría negro
agua = caja("Agua", VASO["x0"] + E / 2, VASO["x1"] - E / 2, VASO["y0"] + E / 2, VASO["y1"] - E / 2, -VASO["fondo"] + E / 2, -0.12, mat_agua, bisel=0)
origen_en(agua, (agua.location.x, agua.location.y, -VASO["fondo"] + E / 2))

# 3. Garaje: la resina avanza desde el fondo
resina = caja("Resina", i0, i1, y0, f1, 0.12, 0.125, mat_resina, bisel=0)
origen_en(resina, (0, f1, 0.12))

# ------------------------------------------------------------------------------------------------
# Cámara
# ------------------------------------------------------------------------------------------------
camara_datos = bpy.data.cameras.new("Cámara")
camara_datos.lens = 30
# Algo de profundidad de campo: lo de lejos se desenfoca un poco, como en una foto
camara_datos.dof.use_dof = True
camara_datos.dof.aperture_fstop = 5.6
camara = bpy.data.objects.new("Cámara", camara_datos)
coleccion.objects.link(camara)
escena.camera = camara
mira = bpy.data.objects.new("Mira", None)
coleccion.objects.link(mira)
seguir = camara.constraints.new("TRACK_TO")
seguir.target = mira
seguir.track_axis = "TRACK_NEGATIVE_Z"
seguir.up_axis = "UP_Y"
camara_datos.dof.focus_object = mira

# [posición, punto al que mira]: terraza, piscina, garaje y la casa entera
ENCUADRES = [
    (Vector((5.0, -11.5, 9.8)), Vector((-0.8, 0.3, 4.1))),
    (Vector((13.5, -9.5, 7.6)), Vector((6.2, 0.3, -0.2))),
    (Vector((2.2, -10.5, 4.2)), Vector((-0.3, 0.6, 1.6))),
    (Vector((11.0, -16.5, 10.5)), Vector((2.8, 0.4, 2.2))),
]
TRAMOS = [(0, 8.6), (8.6, 12.2), (12.2, 15.4)]
VUELVE = (17.2, 18.1)


def encuadre(c):
    activo = next((i for i, (a, b) in enumerate(TRAMOS) if a <= c < b), -1)
    if activo >= 0:
        desde, hasta = (3 if activo == 0 else activo - 1), activo
        f = suave(tramo(c, TRAMOS[activo][0], TRAMOS[activo][0] + 1.6))
    else:
        desde, hasta = 2, 3
        f = suave(tramo(c, TRAMOS[2][1], TRAMOS[2][1] + 1.6))
    pos = ENCUADRES[desde][0].lerp(ENCUADRES[hasta][0], f)
    obj = ENCUADRES[desde][1].lerp(ENCUADRES[hasta][1], f)
    # Balanceo lento alrededor del punto al que mira
    giro = math.sin(c / VUELTA * 2 * math.pi) * 0.04
    d = pos - obj
    pos = obj + Vector((d.x * math.cos(giro) - d.y * math.sin(giro), d.x * math.sin(giro) + d.y * math.cos(giro), d.z))
    return pos, obj


# ------------------------------------------------------------------------------------------------
# Animación: un fotograma clave por fotograma, con las mismas cuentas que la escena en tiempo real
# ------------------------------------------------------------------------------------------------
def clave(objeto, ruta, valor, f, indice=-1):
    if indice >= 0:
        getattr(objeto, ruta)[indice] = valor
        objeto.keyframe_insert(ruta, index=indice, frame=f)
    else:
        setattr(objeto, ruta, valor)
        objeto.keyframe_insert(ruta, frame=f)


minimo = 0.0005
for f in range(FOTOGRAMAS):
    t = f / FPS
    c = t
    vuelve = 1 - suave(tramo(c, *VUELVE))
    # Cielo: cubierto mientras llueve, sale el sol cuando la terraza ya está impermeabilizada
    cubierto = (1 - suave(tramo(c, 7.6, 9.2))) * 0.88 + suave(tramo(c, 17.6, 18.5)) * 0.88
    ent(nublado, "Factor").default_value = min(0.88, cubierto)
    ent(nublado, "Factor").keyframe_insert("default_value", frame=f)
    fondo.inputs["Strength"].default_value = mezcla(1.0, 0.55, min(1.0, cubierto / 0.88))
    fondo.inputs["Strength"].keyframe_insert("default_value", frame=f)
    llueve = (1 - tramo(c, 8.0, 8.6)) + tramo(c, 18.0, 18.6)
    cantidad_lluvia.default_value = min(1.0, llueve)
    cantidad_lluvia.keyframe_insert("default_value", frame=f)

    # Membrana de atrás hacia delante, de 4,6 a 7,6 s
    av = suave(tramo(c, 4.6, 7.6)) * vuelve
    clave(membrana, "scale", max(minimo, av), f, indice=1)
    largo = (y1 - 0.02) - y0
    frente = (y1 - 0.02) - largo * av
    en_obra = 4.4 < c < 7.9
    clave(rodillo, "location", Vector((math.sin(t * 3.2) * (x1 - x0 - 1.2) / 2, frente - 0.08, TECHO + SUELO)), f)
    clave(rodillo, "scale", Vector((1, 1, 1)) if en_obra else Vector((minimo,) * 3), f)

    # Humedad: la mancha y el charco crecen hasta que la membrana cubre; luego se secan (se apagan sin encogerse)
    crece = suave(tramo(c, 0.8, 4.2))
    mojada = 1 - suave(tramo(c, 7.0, 8.6))
    for salida, valor in ((mancha_crece, crece), (mancha_fuerza, mojada), (charco_crece, crece), (charco_fuerza, mojada)):
        clave_valor(salida, valor, f)
    gotea = 1.6 < c < 7.2
    for i, g in enumerate(gotas):
        caida = (t * 1.3 + i / 3) % 1
        z = TECHO - FORJADO - 0.05 - caida * (PLANTA - FORJADO - 0.1)
        clave(g, "location", Vector((GOTERA.x + (i - 1) * 0.05, GOTERA.y + (i - 1) * 0.04, z)), f)
        clave(g, "scale", Vector((1, 1, 1.5)) if gotea else Vector((minimo,) * 3), f)

    # Piscina
    forro = suave(tramo(c, 8.9, 10.0)) * vuelve
    for o in lamina[1:]:
        clave(o, "scale", max(minimo, forro), f, indice=2)
    clave(lamina[0], "scale", Vector((1, 1, 1)) if forro > 0.01 else Vector((minimo,) * 3), f)
    llena = suave(tramo(c, 10.0, 11.9)) * vuelve
    clave(agua, "scale", max(minimo, llena), f, indice=2)

    # Garaje
    av_resina = suave(tramo(c, 12.5, 14.6)) * vuelve
    clave(resina, "scale", max(minimo, av_resina), f, indice=1)

    pos, obj = encuadre(c)
    clave(camara, "location", pos, f)
    clave(mira, "location", obj, f)

# ------------------------------------------------------------------------------------------------
# Render
# ------------------------------------------------------------------------------------------------
os.makedirs(SALIDA, exist_ok=True)
if "--guardar" in args:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SALIDA, "particulares.blend"))
if "--video" in args:
    # Cada ancho en su carpeta; lo ya hecho no se repite (y otro proceso puede ir con otro tramo a la vez)
    escena.frame_start = int(opcion("--desde", 0))
    escena.frame_end = int(opcion("--hasta", FOTOGRAMAS - 1))
    escena.render.use_overwrite = False
    escena.render.use_placeholder = True
    escena.render.filepath = os.path.join(SALIDA, f"video-{ancho}", "f_")
    bpy.ops.render.render(animation=True)
else:
    for f in [int(x) for x in opcion("--fotogramas", "130").split(",")]:
        escena.frame_set(f)
        escena.render.filepath = os.path.join(SALIDA, f"prueba_{f:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"FOTOGRAMA {f} listo")
