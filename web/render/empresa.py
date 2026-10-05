# «Lo que aplicamos», renderizada con Blender (Cycles): la versión en vídeo del palé de /empresa.
# Un palé europeo en la nave, y encima van llegando los materiales del oficio, uno tras otro:
#   1. Morteros: tres sacos que se asientan al apoyar.
#   2. Láminas: dos rollos de pie.
#   3. Resinas: dos cubos de 20 L.
#   4. Fibra de carbono: la bobina, tumbada sobre los sacos.
# Lleno, un momento quieto; luego todo sube y sale de cuadro en orden inverso, y vuelve a empezar sin salto.
# La cámara va y vuelve en un arco lento alrededor del palé. Sin marcas: los sacos llevan una impresión propia.
#
# Se ejecuta desde web/ (los recursos los baja `node render/recursos.mjs empresa`):
#   blender -b --factory-startup --python render/empresa.py -- --fotogramas 40,100,160,250
#   blender -b --factory-startup --python render/empresa.py -- --video
# Opciones comunes en render/comun.py. Además: --giro-cielo N (grados) para mover la nave alrededor del palé.

import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *  # noqa: E402,F403  (render/comun.py)

VUELTA = 14.0  # segundos; los tramos de la leyenda de /empresa salen de aquí
FOTOGRAMAS = round(VUELTA * FPS)

# --- Medidas, en metros. X a la derecha, Y hacia el fondo, Z arriba. El palé está centrado en el origen. ---
PALE = dict(largo=1.2, fondo=0.8, alto=0.144)
CAIDA = 0.7  # segundos que tarda cada cosa en bajar
SALIDA_TODO = 10.6  # cuándo empieza a vaciarse

escena = preparar("empresa", VUELTA)
coleccion = escena.collection
# El ruido que quede cambia en cada fotograma: parece grano, no una mancha fija
escena.cycles.use_animated_seed = True
# Lo que cae lleva su estela, como en una cámara de verdad
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


# Dónde acaba cada cosa y cuándo llega. `grupo` es el material de la leyenda (Morteros, Láminas, Resinas, Fibra).
SACO = 0.165  # alto de un saco ya asentado
llegadas = [
    dict(pieza=sacos[0], destino=(-0.3, 0.02, ARRIBA), giro=math.radians(2), llega=0.3, grupo=0, blando=True),
    dict(pieza=sacos[1], destino=(-0.3, 0.0, ARRIBA + SACO), giro=math.radians(-5), llega=0.9, grupo=0, blando=True),
    dict(pieza=sacos[2], destino=(-0.31, 0.01, ARRIBA + 2 * SACO), giro=math.radians(4), llega=1.5, grupo=0, blando=True),
    dict(pieza=rollo("Rollo 1"), destino=(0.2, 0.24, ARRIBA), giro=0.4, llega=2.3, grupo=1),
    dict(pieza=rollo("Rollo 2"), destino=(0.46, 0.2, ARRIBA), giro=1.9, llega=2.85, grupo=1),
    dict(pieza=cubo("Cubo 1"), destino=(0.16, -0.2, ARRIBA), giro=0.3, llega=3.6, grupo=2),
    dict(pieza=cubo("Cubo 2"), destino=(0.48, -0.19, ARRIBA), giro=2.2, llega=4.15, grupo=2),
    dict(pieza=bobina("Bobina"), destino=(-0.31, 0.0, ARRIBA + 3 * SACO), giro=math.radians(90), llega=5.0, grupo=3),
]

# Al fondo, desenfocados: dos estanterías con cubos y la carretilla. El modelo de la estantería viene a escala 10:1;
# sus baldas quedan a 0,13, 0,64, 1,15 y 1,65 m.
Y_FONDO = 4.0
for x in (-1.3, -0.15):
    modelo("steel_frame_shelves_01", (x, Y_FONDO, 0), giro=math.pi, escala=(0.1, 0.1, 0.1))
for i, (x, z) in enumerate(((-1.6, 0.639), (-1.15, 0.639), (-0.35, 1.145), (0.1, 0.133), (-1.45, 1.651))):
    c = cubo(f"Cubo estantería {i}")
    c.location = (x, Y_FONDO, z)
modelo("hand_truck", (2.4, 2.6, 0), giro=-0.9)  # apartada: que no asome por detrás de los rollos

# ------------------------------------------------------------------------------------------------
# Cámara: un arco lento de ida y vuelta (el bucle cierra solo) y foco en el palé
# ------------------------------------------------------------------------------------------------
camara_datos = bpy.data.cameras.new("Cámara")
camara_datos.lens = 42
camara_datos.dof.use_dof = True
camara_datos.dof.aperture_fstop = 1.8
camara = bpy.data.objects.new("Cámara", camara_datos)
coleccion.objects.link(camara)
escena.camera = camara
mira = bpy.data.objects.new("Mira", None)
mira.location = (0.02, 0.0, 0.5)
coleccion.objects.link(mira)
seguir = camara.constraints.new("TRACK_TO")
seguir.target = mira
seguir.track_axis = "TRACK_NEGATIVE_Z"
seguir.up_axis = "UP_Y"
camara_datos.dof.focus_object = mira
DISTANCIA, ALTURA, RUMBO = 3.1, 1.25, math.radians(-28)


def encuadre(t):
    a = RUMBO + math.radians(20) * math.sin(2 * math.pi * t / VUELTA)
    return Vector((DISTANCIA * math.sin(a), -DISTANCIA * math.cos(a), ALTURA))


# ------------------------------------------------------------------------------------------------
# Animación: un fotograma clave por fotograma
# ------------------------------------------------------------------------------------------------
minimo = 0.0005
for f in range(FOTOGRAMAS):
    t = f / FPS
    for i, c in enumerate(llegadas):
        destino = Vector(c["destino"])
        # Baja acelerando (como al soltarlo) y se asienta; los sacos se aplastan un poco al apoyar
        baja = tramo(t, c["llega"], c["llega"] + CAIDA)
        alto = 1.6 * (1 - baja * baja)
        apoyo = tramo(t, c["llega"] + CAIDA, c["llega"] + CAIDA + 0.35)
        aplasta = 0.0
        if c.get("blando") and 0 < apoyo < 1:
            aplasta = 0.1 * math.sin(math.pi * apoyo) * (1 - apoyo)
        # Al vaciar, sube en orden inverso, acelerando, y sale de cuadro
        orden = len(llegadas) - 1 - i
        sube = tramo(t, SALIDA_TODO + orden * 0.2, SALIDA_TODO + orden * 0.2 + 0.7)
        alto += 2.2 * sube * sube
        dentro = baja > 0 and sube < 1
        clave(c["pieza"], "location", destino + Vector((0, 0, alto)), f)
        clave(c["pieza"], "rotation_euler", Vector((0, 0, c["giro"] + 0.25 * (1 - baja))), f)
        clave(c["pieza"], "scale", Vector((1 + aplasta * 0.5, 1 + aplasta * 0.5, 1 - aplasta)) if dentro else Vector((minimo,) * 3), f)
    clave(camara, "location", encuadre(t), f)

# Los tramos de la leyenda, en segundos (los mismos que en src/pages/empresa.astro)
# Cada parte, desde que llega su primera pieza hasta que llega la de la siguiente; la última, hasta que se asienta
inicios = [next(c["llega"] for c in llegadas if c["grupo"] == g) for g in range(4)]
finales = inicios[1:] + [llegadas[-1]["llega"] + CAIDA + 0.4]
for nombre, a, b in zip(("Morteros", "Láminas", "Resinas", "Fibra de carbono"), inicios, finales):
    print(f"TRAMO {nombre}: [{a:.2f}, {b:.2f}]")

render()
