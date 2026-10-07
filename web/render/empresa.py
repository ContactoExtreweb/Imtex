# «Lo que aplicamos», renderizada con Blender (Cycles): el vídeo de la entrada de /empresa.
# La furgoneta de IMTEX, aparcada en la nave con las puertas traseras abiertas, baja con su plataforma elevadora
# el palé cargado con los materiales del oficio; la cámara se acerca y los recorre uno a uno, con la leyenda:
#   1. Morteros: tres sacos.  2. Láminas: dos rollos de pie.  3. Resinas: dos cubos de 20 L.
#   4. Fibra de carbono: la bobina, tumbada sobre los sacos.
# Al final la cámara vuelve a ver la furgoneta y el cartel de la nave; el vídeo se funde y vuelve a empezar.
# Todo lleva el logo de IMTEX (src/assets/logo-imtex.png) y la banda del lema (src/assets/lema-imtex.png).
#
# Se ejecuta desde web/. Recursos: `node render/recursos.mjs empresa` (Poly Haven) y la furgoneta de Sketchfab en
# .modelos/sprinter/ (Mercedes-Benz Sprinter, de Savelliy 07, CC BY 4.0: hay que citarlo en la web). Sin ella,
# una caja en su sitio para probar el resto.
#   blender -b --factory-startup --python render/empresa.py -- --fotogramas 0,90,170,250,330
#   blender -b --factory-startup --python render/empresa.py -- --video
# Opciones comunes en render/comun.py. Además: --giro-cielo N (grados) para girar la luz de la nave, y
# --camara x,y,z,mx,my,mz para revisar la escena desde un punto fijo (posición y punto al que mira).

import glob
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *  # noqa: E402,F403  (render/comun.py)

VUELTA = 16.0  # segundos; los tramos de la leyenda de /empresa salen de aquí
FOTOGRAMAS = round(VUELTA * FPS)

# --- Medidas, en metros. X a la derecha, Y hacia el fondo, Z arriba. ---
# La furgoneta, a lo largo de X con la trasera en x = 0; el palé, sobre la plataforma, detrás de ella.
PALE = dict(largo=1.2, fondo=0.8, alto=0.144)
FURGO = dict(largo=6.28, ancho=2.12, alto=2.73, suelo=0.775)  # la Sprinter del modelo; `suelo`: el de la zona de carga
PLATAFORMA = dict(fondo=1.5, ancho=1.7, grueso=0.06, pivote=(-0.3, 0.35))
PARED_Y = 4.4  # la pared del fondo de la nave, con el cartel
# La historia, en segundos
BAJA = (1.4, 5.6)  # la plataforma baja
PARADAS = [(6.2, 7.8), (7.8, 9.4), (9.4, 11.0), (11.0, 12.6)]  # la cámara en cada material (la leyenda)
VUELVE = (12.6, 15.2)  # la cámara se retira

escena = preparar("empresa", VUELTA)
coleccion = escena.collection
# El ruido que quede cambia en cada fotograma: parece grano, no una mancha fija
escena.cycles.use_animated_seed = True
# Lo que se mueve lleva su estela, como en una cámara de verdad
escena.render.use_motion_blur = True
escena.render.motion_blur_shutter = 0.4

# ------------------------------------------------------------------------------------------------
# Mundo: la nave (HDRI de Poly Haven), que ilumina y se ve desenfocada al fondo
# ------------------------------------------------------------------------------------------------
mundo = bpy.data.worlds.new("Nave")
escena.world = mundo
mundo.use_nodes = True
wn = mundo.node_tree.nodes
wl = mundo.node_tree.links
wn.clear()
coord = wn.new("ShaderNodeTexCoord")
giro = wn.new("ShaderNodeMapping")
giro.inputs["Rotation"].default_value = (0, 0, math.radians(float(opcion("--giro-cielo", 120))))
hdr = wn.new("ShaderNodeTexEnvironment")
hdr.image = bpy.data.images.load(os.path.join(RECURSOS, "cielos", "small_hangar_01_4k.hdr"))
fondo = wn.new("ShaderNodeBackground")
fondo.inputs["Strength"].default_value = 1.0
wl.new(coord.outputs["Generated"], giro.inputs["Vector"])
wl.new(giro.outputs["Vector"], hdr.inputs["Vector"])
wl.new(hdr.outputs["Color"], fondo.inputs["Color"])
wl.new(fondo.outputs["Background"], wn.new("ShaderNodeOutputWorld").inputs["Surface"])

# ------------------------------------------------------------------------------------------------
# Materiales
# ------------------------------------------------------------------------------------------------
mat_suelo = material_escaneado("Solera de la nave", "concrete_floor_02", 2.4, tinte=(0.8, 0.8, 0.78), brillo=1.15, aplanar=0.4, variacion=0.2)
# A esta escala cada tabla del palé coge una sola tabla de la textura (con 1,6 m parecía parqué)
mat_madera = material_escaneado("Madera de palé", "raw_plank_wall", 3.5, brillo=1.05, relieve=0.8)
mat_rojo = material("Rojo IMTEX", (0.3, 0.016, 0.006), 0.5)
mat_lamina = material("Lámina asfáltica", (0.035, 0.036, 0.04), 0.7)
mat_plastico = material("Plástico blanco", (0.82, 0.82, 0.8), 0.38)
mat_tapa = material("Tapa", (0.06, 0.065, 0.075), 0.35)
mat_asa = material("Asa", (0.7, 0.71, 0.73), 0.3, Metallic=1.0)
mat_carton = material("Cartón", (0.45, 0.33, 0.2), 0.85)


def con_relieve(m, escala, fuerza):
    """Un granulado fino (lámina asfáltica, plástico) con ruido como relieve"""
    n = m.node_tree.nodes
    l = m.node_tree.links
    relieve = n.new("ShaderNodeBump")
    relieve.inputs["Strength"].default_value = fuerza
    l.new(ruido(m.node_tree, n.new("ShaderNodeTexCoord").outputs["Object"], escala, 6.0), relieve.inputs["Height"])
    l.new(relieve.outputs["Normal"], n["Principled BSDF"].inputs["Normal"])
    return m


con_relieve(mat_lamina, 260.0, 0.35)
con_relieve(mat_plastico, 40.0, 0.05)


def material_tapas_rollo():
    """Las tapas del rollo: las vueltas de la lámina, anillos oscuros alrededor del núcleo de cartón"""
    m = material("Tapas del rollo", (0.04, 0.04, 0.045), 0.6)
    n = m.node_tree.nodes
    l = m.node_tree.links
    plano = n.new("ShaderNodeVectorMath")
    plano.operation = "MULTIPLY"
    plano.inputs[1].default_value = (1, 1, 0)
    l.new(n.new("ShaderNodeTexCoord").outputs["Object"], plano.inputs[0])
    radio = n.new("ShaderNodeVectorMath")
    radio.operation = "LENGTH"
    l.new(plano.outputs["Vector"], radio.inputs[0])
    anillos = mates(m.node_tree, "SINE", mates(m.node_tree, "MULTIPLY", radio.outputs["Value"], 900.0))
    claro = n.new("ShaderNodeMix")
    claro.data_type = "RGBA"
    l.new(mates(m.node_tree, "MULTIPLY", mates(m.node_tree, "ADD", anillos, 1.0), 0.5), ent(claro, "Factor"))
    ent(claro, "A").default_value = (0.025, 0.025, 0.028, 1)
    ent(claro, "B").default_value = (0.09, 0.09, 0.1, 1)
    # El núcleo de cartón, en el centro
    nucleo = n.new("ShaderNodeMix")
    nucleo.data_type = "RGBA"
    l.new(mates(m.node_tree, "LESS_THAN", radio.outputs["Value"], 0.035), ent(nucleo, "Factor"))
    l.new(sal(claro, "Result"), ent(nucleo, "A"))
    ent(nucleo, "B").default_value = (0.45, 0.33, 0.2, 1)
    l.new(sal(nucleo, "Result"), n["Principled BSDF"].inputs["Base Color"])
    return m


def material_fibra():
    """Tejido de fibra de carbono: un damero muy fino, negro y con brillo"""
    m = material("Fibra de carbono", (0.02, 0.02, 0.022), 0.25, **{"Coat Weight": 0.6, "Coat Roughness": 0.15})
    n = m.node_tree.nodes
    l = m.node_tree.links
    damero = n.new("ShaderNodeTexChecker")
    damero.inputs["Scale"].default_value = 160.0
    damero.inputs["Color1"].default_value = (0.012, 0.012, 0.014, 1)
    damero.inputs["Color2"].default_value = (0.05, 0.05, 0.056, 1)
    l.new(n.new("ShaderNodeTexCoord").outputs["Object"], damero.inputs["Vector"])
    l.new(damero.outputs["Color"], n["Principled BSDF"].inputs["Base Color"])
    relieve = n.new("ShaderNodeBump")
    relieve.inputs["Strength"].default_value = 0.2
    l.new(damero.outputs["Fac"], relieve.inputs["Height"])
    l.new(relieve.outputs["Normal"], n["Principled BSDF"].inputs["Normal"])
    return m


mat_tapas_rollo = material_tapas_rollo()
mat_fibra = material_fibra()


# --- El logo de IMTEX impreso en los envases: se pinta dentro del material, proyectado, para que siga la curva ---
LOGO = bpy.data.images.load(os.path.join(WEB, "src", "assets", "logo-imtex.png"), check_existing=True)
LOGO_PROPORCION = 1200 / 514  # ancho / alto del PNG


def pegar_logo(m, u, v, mascara=None):
    """Pone el logo sobre el color base del material. (u, v) van de 0 a 1 dentro del recuadro del logo; fuera, nada."""
    n = m.node_tree.nodes
    l = m.node_tree.links
    p = next(x for x in n if x.type == "BSDF_PRINCIPLED")
    debajo = p.inputs["Base Color"].links[0].from_socket if p.inputs["Base Color"].links else None
    uv = n.new("ShaderNodeCombineXYZ")
    l.new(u, uv.inputs["X"])
    l.new(v, uv.inputs["Y"])
    t = n.new("ShaderNodeTexImage")
    t.image = LOGO
    t.extension = "CLIP"
    t.interpolation = "Cubic"
    l.new(uv.outputs["Vector"], t.inputs["Vector"])
    alfa = t.outputs["Alpha"] if mascara is None else mates(m.node_tree, "MULTIPLY", t.outputs["Alpha"], mascara)
    encima = n.new("ShaderNodeMix")
    encima.data_type = "RGBA"
    l.new(alfa, ent(encima, "Factor"))
    if debajo:
        l.new(debajo, ent(encima, "A"))
    else:
        ent(encima, "A").default_value = p.inputs["Base Color"].default_value
    l.new(t.outputs["Color"], ent(encima, "B"))
    l.new(sal(encima, "Result"), p.inputs["Base Color"])


def coordenadas(m):
    xyz = m.node_tree.nodes.new("ShaderNodeSeparateXYZ")
    m.node_tree.links.new(m.node_tree.nodes.new("ShaderNodeTexCoord").outputs["Object"], xyz.inputs[0])
    return xyz.outputs["X"], xyz.outputs["Y"], xyz.outputs["Z"]


def etiqueta_con_logo(nombre, radio, centro, repeticiones, ocupa=0.75, color=(0.86, 0.86, 0.85), filetes=()):
    """Material de una etiqueta que rodea un cilindro vertical (eje Z del objeto): blanca, con el logo `repeticiones`
    veces alrededor, centrado a la altura `centro`. `filetes`: tramos de altura (z0, z1) pintados de rojo."""
    m = material(nombre, color, 0.45)
    arbol = m.node_tree
    x, y, z = coordenadas(m)
    if filetes:
        rojo = None
        for z0, z1 in filetes:
            tira = mates(arbol, "MULTIPLY", mates(arbol, "GREATER_THAN", z, z0), mates(arbol, "LESS_THAN", z, z1))
            rojo = tira if rojo is None else mates(arbol, "MAXIMUM", rojo, tira)
        pinta = arbol.nodes.new("ShaderNodeMix")
        pinta.data_type = "RGBA"
        arbol.links.new(rojo, ent(pinta, "Factor"))
        ent(pinta, "A").default_value = (*color, 1)
        ent(pinta, "B").default_value = (0.32, 0.02, 0.008, 1)
        arbol.links.new(sal(pinta, "Result"), arbol.nodes["Principled BSDF"].inputs["Base Color"])
    # Ángulo alrededor del eje → u de cada hueco; el logo ocupa `ocupa` del hueco y su alto sale de su proporción
    vuelta = mates(arbol, "ADD", mates(arbol, "DIVIDE", mates(arbol, "ARCTAN2", y, x), 2 * math.pi), 0.5)
    hueco = mates(arbol, "FRACT", mates(arbol, "MULTIPLY", vuelta, repeticiones))
    u = mates(arbol, "DIVIDE", mates(arbol, "SUBTRACT", hueco, (1 - ocupa) / 2), ocupa)
    alto = 2 * math.pi * radio / repeticiones * ocupa / LOGO_PROPORCION
    v = mates(arbol, "DIVIDE", mates(arbol, "SUBTRACT", z, centro - alto / 2), alto)
    pegar_logo(m, u, v)
    return m


# Cubo: etiqueta blanca con el logo tres veces y un filete rojo abajo. Rollo: faja blanca con filetes rojos.
# Bobina: una banda de papel con el logo. Los tamaños son los de las piezas de abajo.
mat_etiqueta_cubo = etiqueta_con_logo("Etiqueta del cubo", 0.1445, 0.085, 3, filetes=((0.0, 0.025),))
mat_faja_rollo = etiqueta_con_logo("Faja del rollo", 0.1115, 0.08, 2, filetes=((0.0, 0.012), (0.148, 0.2)))


def banda_a_lo_largo(nombre, radio, largo):
    """Banda de papel en un cilindro tumbado: el logo corre a lo largo del eje (Z del objeto), tres veces alrededor
    (así siempre hay uno de cara a la cámara)"""
    m = material(nombre, (0.86, 0.86, 0.85), 0.45)
    arbol = m.node_tree
    x, y, z = coordenadas(m)
    ancho = largo * 0.85
    alto = ancho / LOGO_PROPORCION
    u = mates(arbol, "DIVIDE", mates(arbol, "SUBTRACT", z, (largo - ancho) / 2), ancho)
    # Posición alrededor, en tercios: v es la distancia sobre la superficie desde el centro de cada tercio
    tercio = mates(arbol, "FRACT", mates(arbol, "MULTIPLY", mates(arbol, "DIVIDE", mates(arbol, "ARCTAN2", y, x), 2 * math.pi), 3.0))
    hueco = 2 * math.pi * radio / 3
    v = mates(arbol, "DIVIDE", mates(arbol, "ADD", mates(arbol, "MULTIPLY", mates(arbol, "SUBTRACT", tercio, 0.5), hueco), alto / 2), alto)
    # Volteado en vertical: tal y como queda tumbada en el palé, si no, se lee cabeza abajo
    pegar_logo(m, u, mates(arbol, "SUBTRACT", 1.0, v))
    return m


mat_banda_bobina = banda_a_lo_largo("Banda de la bobina", 0.0866, 0.3)

# ------------------------------------------------------------------------------------------------
# Geometría
# ------------------------------------------------------------------------------------------------
def cilindro(nombre, radio_abajo, radio_arriba, alto, mat, mat_tapas=None, segmentos=64, bisel=0.004):
    """Cilindro (o tronco de cono) con la base en z = 0. Con `mat_tapas`, las tapas llevan otro material."""
    malla_c = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segmentos, radius1=radio_abajo, radius2=radio_arriba, depth=alto)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, alto / 2))
    bm.to_mesh(malla_c)
    bm.free()
    o = bpy.data.objects.new(nombre, malla_c)
    malla_c.materials.append(mat)
    if mat_tapas:
        malla_c.materials.append(mat_tapas)
        for cara in malla_c.polygons:
            cara.material_index = 1 if abs(cara.normal.z) > 0.9 else 0
    for cara in malla_c.polygons:
        cara.use_smooth = abs(cara.normal.z) < 0.9
    coleccion.objects.link(o)
    if bisel:
        b = o.modifiers.new("Bisel", "BEVEL")
        b.width = bisel
        b.segments = 2
        b.limit_method = "ANGLE"
    return o


def pieza(nombre, *hijos):
    """Un vacío con la base de la pieza en su origen: se mueve, se gira y se aplasta desde abajo"""
    raiz = bpy.data.objects.new(nombre, None)
    coleccion.objects.link(raiz)
    for h in hijos:
        h.parent = raiz
    return raiz


# Suelo de la nave
caja("Solera", -15, 15, -15, 15, -0.05, 0.0, mat_suelo, bisel=0)

# Palé europeo, 1200 × 800 × 144 mm: tablas de abajo, tacos, travesaños y tablas de arriba
L, F = PALE["largo"] / 2, PALE["fondo"] / 2
X_TACOS = (-L + 0.0725, 0.0, L - 0.0725)
Y_TACOS = (-F + 0.0725, 0.0, F - 0.0725)
for i, y in enumerate(Y_TACOS):
    ancho = 0.1 if i == 1 else 0.145
    caja(f"Palé tabla abajo {i}", -L, L, y - ancho / 2, y + ancho / 2, 0.0, 0.022, mat_madera, bisel=0.003)
for i, x in enumerate(X_TACOS):
    for j, y in enumerate(Y_TACOS):
        caja(f"Palé taco {i}{j}", x - 0.0725, x + 0.0725, y - 0.05 if j == 1 else y - 0.0725, y + 0.05 if j == 1 else y + 0.0725, 0.022, 0.1, mat_madera, bisel=0.004)
    caja(f"Palé travesaño {i}", x - 0.0725, x + 0.0725, -F, F, 0.1, 0.122, mat_madera, bisel=0.003)
ANCHOS_ARRIBA = (0.145, 0.1, 0.145, 0.1, 0.145)
hueco = (PALE["fondo"] - sum(ANCHOS_ARRIBA)) / (len(ANCHOS_ARRIBA) - 1)
y = -F
for i, a in enumerate(ANCHOS_ARRIBA):
    caja(f"Palé tabla arriba {i}", -L, L, y, y + a, 0.122, PALE["alto"], mat_madera, bisel=0.003)
    y += a + hueco
ARRIBA = PALE["alto"]

# --- Sacos de mortero: la forma del modelo de Poly Haven, con impresión propia (sin la marca del modelo) ---
def material_saco(original):
    """Papel kraft con una franja roja y una más fina debajo. Del modelo se quedan las arrugas (relieve y rugosidad)."""
    m = original.copy()
    m.name = "Saco de mortero"
    n = m.node_tree.nodes
    l = m.node_tree.links
    p = next(x for x in n if x.type == "BSDF_PRINCIPLED")
    for enlace in list(p.inputs["Base Color"].links):
        l.remove(enlace)
    y = n.new("ShaderNodeSeparateXYZ")
    l.new(n.new("ShaderNodeTexCoord").outputs["Object"], y.inputs[0])
    franja = mates(m.node_tree, "MULTIPLY", mates(m.node_tree, "GREATER_THAN", y.outputs["Y"], 0.08), mates(m.node_tree, "LESS_THAN", y.outputs["Y"], 0.2))
    filete = mates(m.node_tree, "MULTIPLY", mates(m.node_tree, "GREATER_THAN", y.outputs["Y"], 0.03), mates(m.node_tree, "LESS_THAN", y.outputs["Y"], 0.05))
    kraft = n.new("ShaderNodeMix")
    kraft.data_type = "RGBA"
    l.new(ruido(m.node_tree, n.new("ShaderNodeTexCoord").outputs["Object"], 18.0, 4.0), ent(kraft, "Factor"))
    ent(kraft, "A").default_value = (0.36, 0.25, 0.14, 1)
    ent(kraft, "B").default_value = (0.46, 0.34, 0.21, 1)
    rojo = n.new("ShaderNodeMix")
    rojo.data_type = "RGBA"
    l.new(mates(m.node_tree, "MAXIMUM", franja, filete), ent(rojo, "Factor"))
    l.new(sal(kraft, "Result"), ent(rojo, "A"))
    ent(rojo, "B").default_value = (0.32, 0.02, 0.008, 1)
    l.new(sal(rojo, "Result"), p.inputs["Base Color"])
    # El logo, en las dos caras cortas (normal hacia ±Y): son las que se ven de frente con los sacos apilados.
    # Visto desde fuera, la derecha es +X en la cara -Y y -X en la +Y: así no sale en espejo.
    arbol = m.node_tree
    x, y, z = coordenadas(m)
    normal = n.new("ShaderNodeSeparateXYZ")
    l.new(n.new("ShaderNodeTexCoord").outputs["Normal"], normal.inputs[0])
    largo = 0.3
    alto = largo / LOGO_PROPORCION
    v = mates(arbol, "DIVIDE", mates(arbol, "SUBTRACT", z, 0.09 - alto / 2), alto)
    for signo in (-1.0, 1.0):
        cara = mates(arbol, "GREATER_THAN", mates(arbol, "MULTIPLY", normal.outputs["Y"], signo), 0.5)
        u = mates(arbol, "DIVIDE", mates(arbol, "ADD", mates(arbol, "MULTIPLY", x, -signo), largo / 2), largo)
        pegar_logo(m, u, v, cara)
    return m


sacos = []
mat_saco = None
for i in range(3):
    raiz = modelo("cement_bag", (0, 0, 0))
    hijo = raiz.children[0]
    if mat_saco is None:
        mat_saco = material_saco(hijo.material_slots[0].material)
    hijo.material_slots[0].material = mat_saco
    sacos.append(raiz)

# --- Rollos de lámina, de pie: antracita, con la faja de papel roja ---
def rollo(nombre):
    cuerpo = cilindro(nombre, 0.11, 0.11, 1.0, mat_lamina, mat_tapas_rollo)
    faja = cilindro(f"{nombre} faja", 0.1115, 0.1115, 0.16, mat_faja_rollo, bisel=0)
    faja.location.z = 0.42
    return pieza(nombre, cuerpo, faja)


# --- Cubo de resina de 20 L: plástico blanco, tapa oscura con su aro, etiqueta roja y asa de alambre ---
def cubo(nombre):
    cuerpo = cilindro(nombre, 0.135, 0.15, 0.36, mat_plastico)
    etiqueta = cilindro(f"{nombre} etiqueta", 0.1415, 0.1475, 0.15, mat_etiqueta_cubo, bisel=0)
    etiqueta.location.z = 0.12
    tapa = cilindro(f"{nombre} tapa", 0.157, 0.157, 0.035, mat_tapa)
    tapa.location.z = 0.36
    aro = cilindro(f"{nombre} aro", 0.153, 0.153, 0.02, mat_plastico, bisel=0.003)
    aro.location.z = 0.33
    curva = bpy.data.curves.new(f"{nombre} asa", "CURVE")
    curva.dimensions = "3D"
    curva.bevel_depth = 0.0035
    tramo_asa = curva.splines.new("POLY")
    puntos = [(0.152 * math.cos(a), 0.0, 0.31 + 0.11 * math.sin(a)) for a in [math.pi * k / 16 for k in range(17)]]
    tramo_asa.points.add(len(puntos) - 1)
    for p, (x, yy, z) in zip(tramo_asa.points, puntos):
        p.co = (x, yy, z, 1)
    asa = bpy.data.objects.new(f"{nombre} asa", curva)
    curva.materials.append(mat_asa)
    coleccion.objects.link(asa)
    asa.rotation_euler.z = 0.5
    return pieza(nombre, cuerpo, etiqueta, tapa, aro, asa)


# --- Bobina de fibra de carbono, tumbada: el tejido enrollado sobre un tubo de cartón ---
def bobina(nombre):
    tela = cilindro(nombre, 0.085, 0.085, 0.5, mat_fibra, mat_tapas_rollo)
    tubo = cilindro(f"{nombre} tubo", 0.04, 0.04, 0.52, mat_carton, bisel=0.002)
    banda = cilindro(f"{nombre} banda", 0.0866, 0.0866, 0.3, mat_banda_bobina, bisel=0)
    # Tumbadas a lo largo de Y y centradas; el tubo asoma 1 cm por cada lado y la banda va en medio
    for o, mitad in ((tela, 0.25), (tubo, 0.26), (banda, 0.15)):
        o.rotation_euler.x = math.pi / 2
        o.location = (0, mitad, 0.085)
    return pieza(nombre, tela, tubo, banda)


# ------------------------------------------------------------------------------------------------
# La carga: el palé con los materiales, colocados. Todo cuelga de un vacío que va con la plataforma.
# ------------------------------------------------------------------------------------------------
SACO = 0.165  # alto de un saco ya asentado
COLOCADOS = [
    (sacos[0], (-0.3, 0.02, ARRIBA), math.radians(2)),
    (sacos[1], (-0.3, 0.0, ARRIBA + SACO), math.radians(-5)),
    (sacos[2], (-0.31, 0.01, ARRIBA + 2 * SACO), math.radians(4)),
    (rollo("Rollo 1"), (0.2, 0.24, ARRIBA), 0.4),
    (rollo("Rollo 2"), (0.46, 0.2, ARRIBA), 1.9),
    (cubo("Cubo 1"), (0.16, -0.2, ARRIBA), 0.3),
    (cubo("Cubo 2"), (0.48, -0.19, ARRIBA), 2.2),
    (bobina("Bobina"), (-0.31, 0.0, ARRIBA + 3 * SACO), math.radians(90)),
]
carga = bpy.data.objects.new("Carga", None)
coleccion.objects.link(carga)
for pieza_c, donde, giro_c in COLOCADOS:
    pieza_c.location = donde
    pieza_c.rotation_euler.z = giro_c
    pieza_c.parent = carga
for o in coleccion.objects:
    if o.name.startswith("Palé") and o.parent is None:
        o.parent = carga
# Dónde mira la cámara en cada material, en coordenadas del palé (Morteros, Láminas, Resinas, Fibra)
CENTROS = [Vector((-0.3, 0.0, 0.42)), Vector((0.33, 0.22, 0.75)), Vector((0.32, -0.2, 0.33)), Vector((-0.31, 0.0, 0.73))]

# ------------------------------------------------------------------------------------------------
# La nave: pared del fondo con zócalo y el cartel de IMTEX; estanterías y carretilla junto a ella
# ------------------------------------------------------------------------------------------------
mat_pared = material_escaneado("Pared de la nave", "painted_plaster_wall", 2.5, tinte=(0.93, 0.93, 0.92), brillo=1.5, relieve=0.4)
mat_zocalo = material("Zócalo", (0.11, 0.115, 0.13), 0.55)
caja("Pared", -14, 10, PARED_Y, PARED_Y + 0.3, 0.0, 7.5, mat_pared, bisel=0)
caja("Zócalo", -14, 10, PARED_Y - 0.01, PARED_Y, 0.0, 1.2, mat_zocalo, bisel=0)
CARTEL = dict(x=-2.4, z=4.5, ancho=4.8, alto=2.1)
mat_panel = material("Panel del cartel", (0.88, 0.88, 0.87), 0.3)
caja(
    "Cartel",
    CARTEL["x"] - CARTEL["ancho"] / 2,
    CARTEL["x"] + CARTEL["ancho"] / 2,
    PARED_Y - 0.05,
    PARED_Y - 0.01,
    CARTEL["z"] - CARTEL["alto"] / 2,
    CARTEL["z"] + CARTEL["alto"] / 2,
    mat_panel,
    bisel=0.006,
)
ASSETS = os.path.join(WEB, "src", "assets")
calcomania("Cartel logo", os.path.join(ASSETS, "logo-imtex.png"), 3.4, (CARTEL["x"], PARED_Y - 0.052, CARTEL["z"] + 0.22))
calcomania("Cartel lema", os.path.join(ASSETS, "lema-imtex.png"), 4.3, (CARTEL["x"], PARED_Y - 0.052, CARTEL["z"] - 0.78))

for x in (4.2, 5.35):
    modelo("steel_frame_shelves_01", (x, PARED_Y - 0.35, 0), giro=math.pi, escala=(0.1, 0.1, 0.1))
for i, (x, z) in enumerate(((3.9, 0.639), (4.35, 0.639), (5.15, 1.145), (5.6, 0.133), (4.05, 1.651))):
    c_e = cubo(f"Cubo estantería {i}")
    c_e.location = (x, PARED_Y - 0.35, z)
modelo("hand_truck", (3.0, PARED_Y - 0.6, 0), giro=-0.4)


# ------------------------------------------------------------------------------------------------
# La furgoneta: «Mercedes-Benz Sprinter», de Savelliy 07 (Sketchfab, CC BY 4.0), en .modelos/sprinter/source/.
# El modelo viene en pulgadas, con el morro hacia -Y y la trasera hacia +Y. Se pinta de blanco, se le quitan las
# estrellas de Mercedes, se le abre el hueco de las puertas traseras (en el modelo forman parte de la carrocería),
# se forra la zona de carga y se le ponen dos puertas propias abiertas contra los costados, como se abren las de una
# Sprinter (270°). Sin el modelo, una caja en su sitio para probar el resto.
# ------------------------------------------------------------------------------------------------
PULGADA = 0.0254
TRASERA_Y = 120.74  # la trasera del parachoques, en pulgadas: queda en x = 0
COSTADO_X = 39.6  # la chapa del costado en la zona de carga
SUELO_Z = 30.5  # el suelo de carga
HUECO = dict(x=31.0, z0=30.0, z1=100.0, y=111.0)  # el hueco de las puertas traseras
ESTRELLAS = ("Mesh319", "Mesh320")  # las de la calandra y la puerta trasera (cromadas)


def modelo_a_mundo(x, y, z):
    """De pulgadas del modelo a metros de la escena (morro hacia -X, trasera en x = 0, el costado izquierdo hacia -Y)"""
    return Vector(((y - TRASERA_Y) * PULGADA, -x * PULGADA, z * PULGADA))


def furgoneta():
    ruta = next(iter(sorted(glob.glob(os.path.join(WEB, ".modelos", "sprinter", "**", "*.blend"), recursive=True))), None)
    if not ruta:
        print("FURGONETA: no está en .modelos/sprinter/; se pone una caja en su sitio")
        mat_chapa = material("Chapa blanca", (0.85, 0.86, 0.87), 0.25, **{"Coat Weight": 1.0, "Coat Roughness": 0.05})
        caja("Furgoneta (provisional)", -FURGO["largo"], 0.0, -FURGO["ancho"] / 2, FURGO["ancho"] / 2, 0.35, FURGO["alto"], mat_chapa, bisel=0.05)
        return None
    print("FURGONETA:", ruta)
    with bpy.data.libraries.load(ruta, link=False) as (desde, hacia):
        hacia.objects = desde.objects
    piezas = [o for o in hacia.objects if o is not None]
    for o in piezas:
        coleccion.objects.link(o)
    # Sin esto, matrix_world de lo recién traído aún no tiene el giro de cada pieza y el recorte no acierta
    bpy.context.view_layer.update()

    # --- Materiales: chapa blanca con barniz, vidrio de verdad, llantas plateadas ---
    pintura = material("Pintura blanca", (0.82, 0.83, 0.84), 0.28, **{"Coat Weight": 1.0, "Coat Roughness": 0.04})
    llanta = material("Llanta", (0.62, 0.63, 0.65), 0.28, Metallic=1.0)
    freno = material("Disco de freno", (0.32, 0.32, 0.33), 0.4, Metallic=1.0)
    vidrio = material("Vidrio de la furgoneta", (0.05, 0.055, 0.06), 0.0)
    vidrio_fino(vidrio)
    cambio = {"_Color_A01_1": pintura, "Color_B01": pintura, "Color_A25": llanta, "FrontColor": freno}
    for o in piezas:
        for s in o.material_slots:
            nombre = s.material.name if s.material else ""
            if nombre in cambio:
                s.material = cambio[nombre]
            elif "Glass" in nombre or nombre.startswith("Material") or "window" in o.name or "windshield" in o.name:
                s.material = vidrio

    # --- Fuera las estrellas de Mercedes ---
    for o in [o for o in piezas if o.name.split(" ")[0] in ESTRELLAS]:
        piezas.remove(o)
        bpy.data.objects.remove(o)

    # --- El hueco de las puertas traseras: fuera lo que hay dentro de esa caja (en pulgadas del modelo) ---
    for o in piezas:
        if o.type != "MESH":
            continue
        mw = o.matrix_world
        bm = bmesh.new()
        bm.from_mesh(o.data)
        fuera = [v for v in bm.verts if (lambda w: abs(w.x) < HUECO["x"] and w.y > HUECO["y"] and HUECO["z0"] < w.z < HUECO["z1"])(mw @ v.co)]
        if fuera:
            bmesh.ops.delete(bm, geom=fuera, context="VERTS")
            bm.to_mesh(o.data)
        bm.free()

    # --- Todo cuelga de un vacío que lo pasa a metros y lo coloca ---
    raiz = bpy.data.objects.new("Furgoneta", None)
    coleccion.objects.link(raiz)
    raiz.scale = (PULGADA,) * 3
    raiz.rotation_euler.z = -math.pi / 2
    raiz.location.x = -TRASERA_Y * PULGADA
    for o in piezas:
        if o.parent is None:
            o.parent = raiz

    # --- Zona de carga forrada: suelo de contrachapado, laterales y techo claros (se ve por el hueco) ---
    mat_contrachapado = material_escaneado("Suelo de carga", "raw_plank_wall", 3.0, brillo=0.95, relieve=0.4)
    mat_forro = material("Forro de la zona de carga", (0.7, 0.7, 0.68), 0.6)
    forro = [
        caja("Suelo de carga", -36.0, 36.0, -40.0, 119.6, SUELO_Z - 1.0, SUELO_Z, mat_contrachapado, bisel=0),
        caja("Forro izquierdo", 35.0, 36.0, -40.0, 118.0, SUELO_Z, 101.0, mat_forro, bisel=0),
        caja("Forro derecho", -36.0, -35.0, -40.0, 118.0, SUELO_Z, 101.0, mat_forro, bisel=0),
        caja("Techo de carga", -36.0, 36.0, -40.0, 118.0, 101.0, 102.0, mat_forro, bisel=0),
        caja("Mampara", -36.0, 36.0, -41.0, -40.0, SUELO_Z, 101.0, mat_forro, bisel=0),
    ]
    for o in forro:
        o.parent = raiz

    # --- Puertas traseras propias, abiertas 270° contra los costados (bisagras en las esquinas) ---
    for lado in (1.0, -1.0):
        puerta = caja(f"Puerta trasera {lado:+.0f}", 0.0, 39.5, -1.0, 1.0, HUECO["z0"], HUECO["z1"] + 3.0, pintura, bisel=0.4)
        cristal = caja(f"Cristal puerta {lado:+.0f}", 4.0, 35.0, -1.15, 1.15, 63.0, 92.0, vidrio, bisel=0)
        bisagra = bpy.data.objects.new(f"Bisagra {lado:+.0f}", None)
        coleccion.objects.link(bisagra)
        for o in (puerta, cristal):
            o.parent = bisagra
        bisagra.parent = raiz
        # Cerrada iría del borde (x = ±40,8) hacia el centro; abierta, plegada hacia delante pegada al costado
        bisagra.location = (41.9 * lado, 120.2, 0.0)
        bisagra.rotation_euler.z = math.pi if lado > 0 else 0.0
        bisagra.rotation_euler.z += math.radians(-268.0 if lado > 0 else 268.0)
    return raiz, piezas


furgo = furgoneta()


# --- Vinilos del costado izquierdo (el que ve la cámara): logo, banda del lema, teléfono y web ---
# Se pegan a una copia invisible de toda la chapa (la carrocería viene en muchas piezas), proyectándolos en horizontal.
if furgo:
    bpy.context.view_layer.update()
    chapa = una_sola_malla("Chapa para los vinilos", [o for o in furgo[1] if o.type == "MESH" and "carpaint" in o.name])
    costado_y = -COSTADO_X * PULGADA - 0.03
    calcomania("Furgoneta logo", os.path.join(ASSETS, "logo-imtex.png"), 2.05, (-2.42, costado_y, 1.82), objetivo=chapa, rugosidad=0.7)
    calcomania("Furgoneta lema", os.path.join(ASSETS, "lema-imtex.png"), 2.75, (-2.34, costado_y, 1.1), objetivo=chapa, rugosidad=0.7)  # por debajo de la nervadura de la chapa (a 1,22 m)
    texto("Furgoneta contacto", "924 84 12 46   ·   www.imtexsl.com", 0.13, (-2.34, costado_y, 0.88), objetivo=chapa)


# ------------------------------------------------------------------------------------------------
# Plataforma elevadora trasera: dos brazos en paralelogramo bajo la trasera mantienen la plataforma horizontal
# mientras baja del suelo de carga al de la nave; al apoyar, la punta se inclina un poco hasta tocar el suelo.
# ------------------------------------------------------------------------------------------------
def material_chapa_estriada():
    m = material("Chapa estriada", (0.62, 0.63, 0.65), 0.38, Metallic=1.0)
    n = m.node_tree.nodes
    l = m.node_tree.links
    mapa = n.new("ShaderNodeMapping")
    mapa.inputs["Rotation"].default_value = (0, 0, math.radians(45))
    l.new(n.new("ShaderNodeTexCoord").outputs["Object"], mapa.inputs["Vector"])
    estrias = n.new("ShaderNodeTexChecker")
    estrias.inputs["Scale"].default_value = 60.0
    l.new(mapa.outputs["Vector"], estrias.inputs["Vector"])
    relieve = n.new("ShaderNodeBump")
    relieve.inputs["Strength"].default_value = 0.25
    l.new(estrias.outputs["Fac"], relieve.inputs["Height"])
    l.new(relieve.outputs["Normal"], n["Principled BSDF"].inputs["Normal"])
    return m


mat_estriada = material_chapa_estriada()
mat_negro = material("Acero negro", (0.03, 0.03, 0.035), 0.45, Metallic=0.6)
P = Vector((PLATAFORMA["pivote"][0], 0.0, PLATAFORMA["pivote"][1]))
Q_ARRIBA = Vector((0.0, 0.0, FURGO["suelo"]))
BRAZO = (Q_ARRIBA - P).length

# La plataforma, con su origen en el borde de giro (junto a la furgoneta) y la cara de arriba en z = 0
plataforma = caja("Plataforma", 0.0, PLATAFORMA["fondo"], -PLATAFORMA["ancho"] / 2, PLATAFORMA["ancho"] / 2, -PLATAFORMA["grueso"], 0.0, mat_estriada, bisel=0.006)
brazos = [caja(f"Brazo {y}", 0.0, BRAZO, y - 0.04, y + 0.04, -0.05, 0.05, mat_negro, bisel=0.008) for y in (-0.62, 0.62)]
caja("Bastidor de la plataforma", P.x - 0.12, P.x + 0.12, -0.75, 0.75, P.z - 0.06, P.z + 0.08, mat_negro, bisel=0.01)
caja("Grupo hidráulico", -1.2, -0.55, -0.35, 0.05, 0.3, 0.5, mat_negro, bisel=0.01)
# Lo que lleva encima: la carga, centrada en la plataforma
SOBRE = PLATAFORMA["fondo"] / 2 + 0.05


def plataforma_en(b):
    """b de 0 (arriba, al nivel del suelo de carga) a 1 (en el suelo de la nave): el borde de giro de la plataforma,
    el ángulo de los brazos y lo que se inclina la punta al apoyar"""
    z = mezcla(Q_ARRIBA.z, PLATAFORMA["grueso"], b)
    dz = z - P.z
    dx = math.sqrt(max(0.0, BRAZO * BRAZO - dz * dz))
    inclina = math.radians(2.2) * suave(tramo(b, 0.93, 1.0))
    return Vector((P.x + dx, 0.0, z)), math.atan2(dz, dx), inclina


def poner_plataforma(b, f):
    """Pone la plataforma, los brazos y la carga en el fotograma `f`; devuelve dónde queda el centro de la carga"""
    q, angulo, inclina = plataforma_en(b)
    clave(plataforma, "location", q, f)
    clave(plataforma, "rotation_euler", Vector((0, inclina, 0)), f)
    for b_o in brazos:
        clave(b_o, "location", Vector((P.x, 0.0, P.z)), f)
        clave(b_o, "rotation_euler", Vector((0, -angulo, 0)), f)
    # Girar +Y baja la punta (+X): la carga va sobre la plataforma inclinada
    centro = q + Vector((SOBRE * math.cos(inclina), 0.0, -SOBRE * math.sin(inclina)))
    clave(carga, "location", centro, f)
    clave(carga, "rotation_euler", Vector((0, inclina, 0)), f)
    return centro


# ------------------------------------------------------------------------------------------------
# Cámara: plano general (furgoneta y cartel) → se acerca mientras baja → recorre los materiales → vuelve
# ------------------------------------------------------------------------------------------------
camara_datos = bpy.data.cameras.new("Cámara")
camara_datos.lens = 35
camara_datos.dof.use_dof = True
camara_datos.dof.aperture_fstop = 2.8
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

GENERAL = (Vector((4.6, -8.2, 2.3)), Vector((-1.6, 1.0, 1.7)))  # la furgoneta de tres cuartos y el cartel
CERCA = (Vector((3.0, -3.6, 1.45)), Vector((0.85, 0.0, 0.6)))  # la plataforma bajando


def parada(i, centro_carga):
    """Encuadre de un material: algo por delante y por encima, mirando a su centro"""
    c = centro_carga + CENTROS[i]
    return c + Vector((0.35, -1.55, 0.35)), c


def encuadre(t, centro_carga):
    if t < BAJA[0]:
        return GENERAL
    if t < PARADAS[0][0]:
        f = suave(tramo(t, BAJA[0], PARADAS[0][0]))
        return GENERAL[0].lerp(CERCA[0], f), GENERAL[1].lerp(CERCA[1], f)
    for i, (a, b) in enumerate(PARADAS):
        if t < b:
            destino = parada(i, centro_carga)
            origen = CERCA if i == 0 else parada(i - 1, centro_carga)
            f = suave(tramo(t, a, a + 0.9))
            return origen[0].lerp(destino[0], f), origen[1].lerp(destino[1], f)
    f = suave(tramo(t, VUELVE[0], VUELVE[1]))
    ultima = parada(len(PARADAS) - 1, centro_carga)
    return ultima[0].lerp(GENERAL[0], f), ultima[1].lerp(GENERAL[1], f)


# ------------------------------------------------------------------------------------------------
# Animación: un fotograma clave por fotograma
# ------------------------------------------------------------------------------------------------
FIJA = [float(x) for x in opcion("--camara").split(",")] if opcion("--camara") else None
for f in range(FOTOGRAMAS):
    t = f / FPS
    centro = poner_plataforma(suave(tramo(t, *BAJA)), f)
    pos_c, mira_c = (Vector(FIJA[:3]), Vector(FIJA[3:])) if FIJA else encuadre(t, centro)
    clave(camara, "location", pos_c, f)
    clave(mira, "location", mira_c, f)

# Los tramos de la leyenda, en segundos (los mismos que en src/pages/empresa.astro)
for nombre, (a, b_t) in zip(("Morteros", "Láminas", "Resinas", "Fibra de carbono"), PARADAS):
    print(f"TRAMO {nombre}: [{a:.2f}, {b_t:.2f}]")

render()
