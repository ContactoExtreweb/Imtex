# Lo común de las escenas que se renderizan con Blender (Cycles) para los vídeos de la web: render/<escena>.py.
# Cada escena hace `from comun import *`, llama a preparar() al principio y a render() al final.
#   preparar(nombre, vuelta): Blender vacío, Cycles con la tarjeta gráfica que haya, AgX, tamaño y fotogramas.
#   render(): fotogramas sueltos (--fotogramas 0,100) o el vídeo (--video, por tramos que se retoman).
# Opciones comunes: --muestras N, --ancho N (el alto sale a 4:3), --guardar (deja también el .blend),
# --video con --desde N y --hasta N, --con-hiprt (AMD con trazado por hardware; sale mal en la RX 6650 XT).

import math
import os
import sys

import bmesh
import bpy

WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECURSOS = os.path.join(WEB, ".polyhaven", "render")

args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
opcion = lambda nombre, defecto=None: args[args.index(nombre) + 1] if nombre in args else defecto

FPS = 24

# Los pone preparar()
NOMBRE = None
SALIDA = None
FOTOGRAMAS = 0
ancho = 0
escena = None
coleccion = None


# --- Curvas de avance, las mismas que en web/src/scripts/escena3d/texturas.ts ---
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
# Escena y render
# ------------------------------------------------------------------------------------------------
def preparar(nombre, vuelta):
    """Blender vacío y listo para renderizar `vuelta` segundos de la escena `nombre` (salida en .render/<nombre>/)"""
    global NOMBRE, SALIDA, FOTOGRAMAS, ancho, escena, coleccion
    NOMBRE = nombre
    SALIDA = os.path.join(WEB, ".render", nombre)
    FOTOGRAMAS = round(vuelta * FPS)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Las claves van una por fotograma con su valor ya calculado: entre ellas, en línea recta
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    escena = bpy.context.scene
    escena.render.engine = "CYCLES"
    # La tarjeta gráfica si la hay: OptiX en NVIDIA (el PC de la oficina, RTX 4060), HIP en AMD (el de casa, RX 6650 XT),
    # oneAPI en Intel. Si no, el procesador (la sesión de Claude en la nube). get_devices() lista todos los dispositivos,
    # de cualquier tipo: hay que mirar que alguno sea del tipo que se pide.
    prefs = bpy.context.preferences.addons["cycles"].preferences
    TARJETA = None
    for tipo in ("OPTIX", "HIP", "ONEAPI", "CUDA"):
        try:
            prefs.compute_device_type = tipo
        except TypeError:
            continue
        prefs.get_devices()
        if any(d.type == tipo for d in prefs.devices):
            TARJETA = tipo
            break
    for d in prefs.devices:
        d.use = d.type == TARJETA
    if TARJETA == "HIP" and hasattr(prefs, "use_hiprt"):
        # El trazado por hardware de AMD sale mal con la RX 6650 XT (Blender 5.2.2): apagado salvo que se pida
        prefs.use_hiprt = "--con-hiprt" in args
    CON_TARJETA = TARJETA is not None
    escena.cycles.device = "GPU" if CON_TARJETA else "CPU"
    print("RENDER CON", f"tarjeta gráfica ({TARJETA})" if CON_TARJETA else "procesador")
    escena.cycles.samples = int(opcion("--muestras", 96))
    escena.cycles.adaptive_threshold = 0.02
    escena.cycles.use_denoising = True
    # OptiX solo en NVIDIA. OpenImageDenoise va en la tarjeta si puede; en AMD RDNA2 (RX 6000) Blender 5.2 lo pasa al procesador
    escena.cycles.denoiser = "OPTIX" if TARJETA == "OPTIX" else "OPENIMAGEDENOISE"
    escena.cycles.denoising_use_gpu = True
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
    coleccion = escena.collection
    return escena


def render():
    os.makedirs(SALIDA, exist_ok=True)
    if "--guardar" in args:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SALIDA, f"{NOMBRE}.blend"))
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


# ------------------------------------------------------------------------------------------------
# Materiales, geometría, modelos de Poly Haven y claves de animación
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


def clave(objeto, ruta, valor, f, indice=-1):
    if indice >= 0:
        getattr(objeto, ruta)[indice] = valor
        objeto.keyframe_insert(ruta, index=indice, frame=f)
    else:
        setattr(objeto, ruta, valor)
        objeto.keyframe_insert(ruta, frame=f)


# ------------------------------------------------------------------------------------------------
# Rotulación: calcomanías (una imagen con transparencia) y textos, para logos, vinilos y carteles
# ------------------------------------------------------------------------------------------------
def ajustar(o, objetivo, separa, eje="Y"):
    """Pega `o` (un vinilo plano que mira hacia -Y) a la superficie de `objetivo`, proyectándolo en horizontal:
    así no salta a otras caras, como pasa al buscar el punto más cercano en una carrocería de varias piezas.
    `eje` es el eje propio del objeto que apunta a la superficie (Y en las calcomanías; Z en los textos, que van girados)."""
    ajuste = o.modifiers.new("Ajuste", "SHRINKWRAP")
    ajuste.target = objetivo
    ajuste.wrap_method = "PROJECT"
    ajuste.use_project_y = eje == "Y"
    ajuste.use_project_z = eje == "Z"
    ajuste.use_negative_direction = True
    ajuste.use_positive_direction = True
    ajuste.wrap_mode = "OUTSIDE_SURFACE"
    ajuste.offset = separa


def una_sola_malla(nombre, piezas):
    """Junta en una malla nueva e invisible la geometría de `piezas` tal como está en la escena: sirve de superficie a la
    que pegar vinilos cuando la carrocería viene en muchas piezas"""
    bpy.context.view_layer.update()
    bm = bmesh.new()
    for o in piezas:
        antes = len(bm.verts)
        bm.from_mesh(o.data)
        bm.verts.ensure_lookup_table()
        bmesh.ops.transform(bm, matrix=o.matrix_world, verts=bm.verts[antes:])
    malla_u = bpy.data.meshes.new(nombre)
    bm.to_mesh(malla_u)
    bm.free()
    o = bpy.data.objects.new(nombre, malla_u)
    coleccion.objects.link(o)
    o.hide_render = True
    return o


def calcomania(nombre, ruta, ancho, posicion, giro=(0.0, 0.0, 0.0), objetivo=None, separa=0.002, rugosidad=0.35):
    """Un plano con la imagen de `ruta` (PNG con transparencia), de `ancho` metros y el alto que pida la imagen.
    De frente mira hacia -Y (como un cartel visto desde delante); `giro` lo orienta. Con `objetivo`, se ajusta a su
    superficie (un vinilo sobre la chapa), separado `separa` para que no parpadee."""
    imagen_c = bpy.data.images.load(ruta, check_existing=True)
    alto = ancho * imagen_c.size[1] / imagen_c.size[0]
    malla_c = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    bm.loops.layers.uv.new()  # sin esta capa, create_grid no pone coordenadas de textura y la imagen no se ve
    # Un vértice por centímetro (hasta 300 por lado): así sigue las nervaduras de la chapa sin que asomen por delante
    bmesh.ops.create_grid(bm, x_segments=min(300, max(8, round(ancho / 0.01))), y_segments=min(300, max(8, round(alto / 0.01))), size=0.5, calc_uvs=True)
    for v in bm.verts:
        v.co = (v.co.x * ancho, 0.0, v.co.y * alto)
    bm.to_mesh(malla_c)
    bm.free()
    o = bpy.data.objects.new(nombre, malla_c)
    coleccion.objects.link(o)
    m = bpy.data.materials.new(f"Vinilo {nombre}")
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    t = m.node_tree.nodes.new("ShaderNodeTexImage")
    t.image = imagen_c
    t.interpolation = "Cubic"
    m.node_tree.links.new(t.outputs["Color"], p.inputs["Base Color"])
    m.node_tree.links.new(t.outputs["Alpha"], p.inputs["Alpha"])
    p.inputs["Roughness"].default_value = rugosidad
    malla_c.materials.append(m)
    for cara in malla_c.polygons:
        cara.use_smooth = True
    o.location = posicion
    o.rotation_euler = giro
    if objetivo is not None:
        ajustar(o, objetivo, separa)
    return o


def texto(nombre, contenido, alto, posicion, giro=(math.pi / 2, 0.0, 0.0), color=(0.02, 0.02, 0.025), fuente="bahnschrift.ttf", alinear="CENTER", objetivo=None, separa=0.002):
    """Texto plano (un vinilo de letras), de `alto` metros de cuerpo. De frente mira hacia -Y.
    La fuente se busca en las de Windows y, si no está, se usa la de Blender. Con `objetivo`, se convierte en malla
    y se ajusta a su superficie, como las calcomanías."""
    curva = bpy.data.curves.new(nombre, "FONT")
    curva.body = contenido
    curva.size = alto
    curva.align_x = alinear
    ruta = os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts", fuente)
    if os.path.exists(ruta):
        curva.font = bpy.data.fonts.load(ruta, check_existing=True)
    o = bpy.data.objects.new(nombre, curva)
    coleccion.objects.link(o)
    curva.materials.append(material(f"Letras {nombre}", color, 0.4))
    o.location = posicion
    o.rotation_euler = giro
    if objetivo is not None:
        bpy.context.view_layer.update()
        malla_t = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        plano = bpy.data.objects.new(nombre, malla_t)
        coleccion.objects.link(plano)
        plano.matrix_world = o.matrix_world.copy()
        bpy.data.objects.remove(o)
        # Más vértices para que siga la curva de la chapa
        sub = plano.modifiers.new("Subdividir", "SUBSURF")
        sub.subdivision_type = "SIMPLE"
        sub.levels = sub.render_levels = 2
        ajustar(plano, objetivo, separa, eje="Z")
        return plano
    return o
