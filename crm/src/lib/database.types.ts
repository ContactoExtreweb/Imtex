export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alquileres: {
        Row: {
          concepto: string | null
          created_at: string
          created_by: string | null
          documento: string | null
          empresa: string | null
          fecha: string
          id: string
          importe: number
          mes: string
          obra_id: string
          updated_at: string
        }
        Insert: {
          concepto?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          empresa?: string | null
          fecha: string
          id?: string
          importe: number
          mes: string
          obra_id: string
          updated_at?: string
        }
        Update: {
          concepto?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          empresa?: string | null
          fecha?: string
          id?: string
          importe?: number
          mes?: string
          obra_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alquileres_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_profesionales: {
        Row: {
          activa: boolean
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          precio_ext: number
          precio_ord: number
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          precio_ext?: number
          precio_ord?: number
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          precio_ext?: number
          precio_ord?: number
          updated_at?: string
        }
        Relationships: []
      }
      certificaciones: {
        Row: {
          created_at: string
          created_by: string | null
          descripcion: string | null
          fecha_corte: string | null
          id: string
          importe_origen: number
          mes: string
          numero: number
          obra_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          fecha_corte?: string | null
          id?: string
          importe_origen: number
          mes: string
          numero: number
          obra_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          fecha_corte?: string | null
          id?: string
          importe_origen?: number
          mes?: string
          numero?: number
          obra_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificaciones_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cif: string | null
          contacto: string | null
          created_at: string
          created_by: string | null
          direccion: string | null
          email: string | null
          id: string
          localidad: string | null
          nombre: string
          notas: string | null
          provincia: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          cif?: string | null
          contacto?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre: string
          notas?: string | null
          provincia?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          cif?: string | null
          contacto?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre?: string
          notas?: string | null
          provincia?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      combustible: {
        Row: {
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          importe: number
          km: number
          mes: string
          obra_id: string
          tarifa_km: number
          tipo_vehiculo: string
          updated_at: string
          vehiculo: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fecha: string
          id?: string
          importe: number
          km?: number
          mes: string
          obra_id: string
          tarifa_km?: number
          tipo_vehiculo: string
          updated_at?: string
          vehiculo?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          importe?: number
          km?: number
          mes?: string
          obra_id?: string
          tarifa_km?: number
          tipo_vehiculo?: string
          updated_at?: string
          vehiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "combustible_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos_viaje: {
        Row: {
          concepto: string | null
          created_at: string
          created_by: string | null
          documento: string | null
          fecha: string
          id: string
          importe: number
          mes: string
          obra_id: string
          tercero: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          concepto?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          fecha: string
          id?: string
          importe: number
          mes: string
          obra_id: string
          tercero?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          concepto?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          fecha?: string
          id?: string
          importe?: number
          mes?: string
          obra_id?: string
          tercero?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_viaje_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      materiales: {
        Row: {
          concepto: string | null
          created_at: string
          created_by: string | null
          documento: string | null
          fecha: string
          id: string
          importe: number
          mes: string
          obra_id: string
          proveedor: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          concepto?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          fecha: string
          id?: string
          importe: number
          mes: string
          obra_id: string
          proveedor?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          concepto?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          fecha?: string
          id?: string
          importe?: number
          mes?: string
          obra_id?: string
          proveedor?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiales_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          created_at: string
          id: string
          perfil_id: string
          texto: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          perfil_id?: string
          texto?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          perfil_id?: string
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          cliente_id: string | null
          codigo: string
          created_at: string
          created_by: string | null
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          gastos_generales_pct: number
          id: string
          importe_pedido: number
          localidad: string | null
          nombre: string
          presupuesto_id: string | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          gastos_generales_pct?: number
          id?: string
          importe_pedido?: number
          localidad?: string | null
          nombre: string
          presupuesto_id?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          gastos_generales_pct?: number
          id?: string
          importe_pedido?: number
          localidad?: string | null
          nombre?: string
          presupuesto_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: true
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: true
            referencedRelation: "presupuestos_totales"
            referencedColumns: ["presupuesto_id"]
          },
        ]
      }
      partes_horas: {
        Row: {
          alojamiento: number
          categoria_id: string | null
          created_at: string
          created_by: string | null
          dietas: number
          fecha: string
          horas_ext: number
          horas_ord: number
          id: string
          mes: string
          obra_id: string
          operario: string
          precio_ext: number
          precio_ord: number
          trabajador_id: string | null
          updated_at: string
        }
        Insert: {
          alojamiento?: number
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          dietas?: number
          fecha: string
          horas_ext?: number
          horas_ord?: number
          id?: string
          mes: string
          obra_id: string
          operario: string
          precio_ext?: number
          precio_ord?: number
          trabajador_id?: string | null
          updated_at?: string
        }
        Update: {
          alojamiento?: number
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          dietas?: number
          fecha?: string
          horas_ext?: number
          horas_ord?: number
          id?: string
          mes?: string
          obra_id?: string
          operario?: string
          precio_ext?: number
          precio_ord?: number
          trabajador_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partes_horas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_horas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_horas_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "trabajadores"
            referencedColumns: ["id"]
          },
        ]
      }
      partidas_tipo: {
        Row: {
          ben_pct: number
          cantidad: number
          codigo: string
          created_at: string
          created_by: string | null
          gg_pct: number
          id: string
          medicion: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ben_pct?: number
          cantidad?: number
          codigo: string
          created_at?: string
          created_by?: string | null
          gg_pct?: number
          id?: string
          medicion?: string
          titulo?: string
          updated_at?: string
        }
        Update: {
          ben_pct?: number
          cantidad?: number
          codigo?: string
          created_at?: string
          created_by?: string | null
          gg_pct?: number
          id?: string
          medicion?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      partidas_tipo_lineas: {
        Row: {
          coste_unitario: number | null
          descripcion: string | null
          id: string
          orden: number
          partida_tipo_id: string
          precio_id: string | null
          rendimiento: number
          unidad: string | null
        }
        Insert: {
          coste_unitario?: number | null
          descripcion?: string | null
          id?: string
          orden?: number
          partida_tipo_id: string
          precio_id?: string | null
          rendimiento?: number
          unidad?: string | null
        }
        Update: {
          coste_unitario?: number | null
          descripcion?: string | null
          id?: string
          orden?: number
          partida_tipo_id?: string
          precio_id?: string | null
          rendimiento?: number
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partidas_tipo_lineas_partida_tipo_id_fkey"
            columns: ["partida_tipo_id"]
            isOneToOne: false
            referencedRelation: "partidas_tipo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_tipo_lineas_precio_id_fkey"
            columns: ["precio_id"]
            isOneToOne: false
            referencedRelation: "precios"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          id: string
          nombre: string
          rol: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          id: string
          nombre: string
          rol: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          rol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_rol_fkey"
            columns: ["rol"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["codigo"]
          },
        ]
      }
      permisos_rol: {
        Row: {
          modulo: string
          puede_editar: boolean
          puede_ver: boolean
          rol: string
        }
        Insert: {
          modulo: string
          puede_editar?: boolean
          puede_ver?: boolean
          rol: string
        }
        Update: {
          modulo?: string
          puede_editar?: boolean
          puede_ver?: boolean
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "permisos_rol_rol_fkey"
            columns: ["rol"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["codigo"]
          },
        ]
      }
      precios: {
        Row: {
          activo: boolean
          codigo: string
          coste: number
          created_at: string
          created_by: string | null
          descripcion: string
          fabricante: string | null
          familia: string
          id: string
          notas: string | null
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          coste?: number
          created_at?: string
          created_by?: string | null
          descripcion: string
          fabricante?: string | null
          familia: string
          id?: string
          notas?: string | null
          unidad?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          coste?: number
          created_at?: string
          created_by?: string | null
          descripcion?: string
          fabricante?: string | null
          familia?: string
          id?: string
          notas?: string | null
          unidad?: string
          updated_at?: string
        }
        Relationships: []
      }
      presupuesto_lineas: {
        Row: {
          codigo: string | null
          coste_unitario: number
          descripcion: string
          id: string
          orden: number
          partida_id: string
          precio_id: string | null
          rendimiento: number
          unidad: string | null
        }
        Insert: {
          codigo?: string | null
          coste_unitario?: number
          descripcion: string
          id?: string
          orden?: number
          partida_id: string
          precio_id?: string | null
          rendimiento?: number
          unidad?: string | null
        }
        Update: {
          codigo?: string | null
          coste_unitario?: number
          descripcion?: string
          id?: string
          orden?: number
          partida_id?: string
          precio_id?: string | null
          rendimiento?: number
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_lineas_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "presupuesto_partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_lineas_precio_id_fkey"
            columns: ["precio_id"]
            isOneToOne: false
            referencedRelation: "precios"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto_partidas: {
        Row: {
          ben_pct: number
          cantidad: number
          codigo: string
          gg_pct: number
          id: string
          medicion: string
          orden: number
          presupuesto_id: string
          titulo: string
        }
        Insert: {
          ben_pct?: number
          cantidad?: number
          codigo?: string
          gg_pct?: number
          id?: string
          medicion?: string
          orden?: number
          presupuesto_id: string
          titulo?: string
        }
        Update: {
          ben_pct?: number
          cantidad?: number
          codigo?: string
          gg_pct?: number
          id?: string
          medicion?: string
          orden?: number
          presupuesto_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_partidas_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_partidas_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos_totales"
            referencedColumns: ["presupuesto_id"]
          },
        ]
      }
      presupuestos: {
        Row: {
          ben_pct_def: number
          carta: string
          cliente_id: string | null
          codigo: string
          condiciones: string
          contacto: string | null
          created_at: string
          created_by: string | null
          estado: string
          fecha: string
          forma_pago: string | null
          gg_pct_def: number
          id: string
          iva_pct: number
          localidad: string | null
          plazo: string | null
          titulo: string
          updated_at: string
          validez: string | null
        }
        Insert: {
          ben_pct_def?: number
          carta?: string
          cliente_id?: string | null
          codigo: string
          condiciones?: string
          contacto?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          forma_pago?: string | null
          gg_pct_def?: number
          id?: string
          iva_pct?: number
          localidad?: string | null
          plazo?: string | null
          titulo?: string
          updated_at?: string
          validez?: string | null
        }
        Update: {
          ben_pct_def?: number
          carta?: string
          cliente_id?: string | null
          codigo?: string
          condiciones?: string
          contacto?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          forma_pago?: string | null
          gg_pct_def?: number
          id?: string
          iva_pct?: number
          localidad?: string | null
          plazo?: string | null
          titulo?: string
          updated_at?: string
          validez?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          codigo: string
          nombre: string
        }
        Insert: {
          codigo: string
          nombre: string
        }
        Update: {
          codigo?: string
          nombre?: string
        }
        Relationships: []
      }
      subcontratas: {
        Row: {
          concepto: string | null
          created_at: string
          created_by: string | null
          documento: string | null
          empresa: string | null
          fecha: string
          id: string
          importe: number
          mes: string
          obra_id: string
          retencion_pct: number
          updated_at: string
        }
        Insert: {
          concepto?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          empresa?: string | null
          fecha: string
          id?: string
          importe: number
          mes: string
          obra_id: string
          retencion_pct?: number
          updated_at?: string
        }
        Update: {
          concepto?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          empresa?: string | null
          fecha?: string
          id?: string
          importe?: number
          mes?: string
          obra_id?: string
          retencion_pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontratas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas_combustible: {
        Row: {
          consumo_camion_l100: number
          consumo_furgon_l100: number
          id: boolean
          precio_litro_ref: number
          updated_at: string
        }
        Insert: {
          consumo_camion_l100: number
          consumo_furgon_l100: number
          id?: boolean
          precio_litro_ref: number
          updated_at?: string
        }
        Update: {
          consumo_camion_l100?: number
          consumo_furgon_l100?: number
          id?: boolean
          precio_litro_ref?: number
          updated_at?: string
        }
        Relationships: []
      }
      trabajadores: {
        Row: {
          activo: boolean
          categoria_id: string | null
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          perfil_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          perfil_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          perfil_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajadores_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajadores_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      web_fotos: {
        Row: {
          alt: string
          alto: number
          ancho: number
          created_at: string
          created_by: string | null
          id: string
          obra_id: string
          orden: number
          storage_path: string
        }
        Insert: {
          alt?: string
          alto: number
          ancho: number
          created_at?: string
          created_by?: string | null
          id?: string
          obra_id: string
          orden?: number
          storage_path: string
        }
        Update: {
          alt?: string
          alto?: number
          ancho?: number
          created_at?: string
          created_by?: string | null
          id?: string
          obra_id?: string
          orden?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_fotos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "web_obras"
            referencedColumns: ["id"]
          },
        ]
      }
      web_obras: {
        Row: {
          anio: string | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          destacada: boolean
          id: string
          obra_id: string | null
          publicada: boolean
          resumen: string | null
          servicio: string | null
          slug: string
          titulo: string
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          anio?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          destacada?: boolean
          id?: string
          obra_id?: string | null
          publicada?: boolean
          resumen?: string | null
          servicio?: string | null
          slug: string
          titulo: string
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          anio?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          destacada?: boolean
          id?: string
          obra_id?: string | null
          publicada?: boolean
          resumen?: string | null
          servicio?: string | null
          slug?: string
          titulo?: string
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_obras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: true
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      control_obra_mensual: {
        Row: {
          alquileres: number | null
          certificacion: number | null
          combustible: number | null
          dietas: number | null
          hoteles: number | null
          materiales: number | null
          mes: string | null
          obra_id: string | null
          personal: number | null
          subcontrata: number | null
        }
        Relationships: []
      }
      presupuesto_costes_familia: {
        Row: {
          coste: number | null
          familia: string | null
          presupuesto_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_partidas_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_partidas_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos_totales"
            referencedColumns: ["presupuesto_id"]
          },
        ]
      }
      presupuestos_totales: {
        Row: {
          base: number | null
          coste_directo: number | null
          iva: number | null
          presupuesto_id: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      guardar_partida_tipo: { Args: { p: Json }; Returns: string }
      guardar_presupuesto: { Args: { p: Json }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
