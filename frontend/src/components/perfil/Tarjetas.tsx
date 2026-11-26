import React from "react";
import { ActivityIndicator, Text, View, type GestureResponderEvent } from "react-native";
import { useTema } from "../../hooks/useTema";
import Boton from "../Boton";
import Interruptor from "../Interruptor";
import { actualizarPreferencias } from "../../services/preferenciasService";
import { usePreferencias } from "../../hooks/usePreferencias";
import type { CampoPerfil, PerfilEditable } from "../../services/perfilService";
import type { EstadoDobleFactor } from "../../services/dobleFactorService";
import type { AccionDobleFactor } from "../DobleFactorModal";
import { contactoDelPerfil, textoDobleFactor } from "../../helpers/perfil";
import { DatoEditable, FilaPerfil } from "./Filas";
import { s } from "./estilos";

// Tarjetas de Mi Perfil.

function Tarjeta({ titulo, children, estilo }: { titulo: string; children: React.ReactNode; estilo?: object }) {
  const tema = useTema();
  return (
    <View style={[tema.estilo(s.card), estilo]}>
      <Text accessibilityRole="header" style={tema.estilo(s.heading)}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

interface PropsInformacion {
  perfil: PerfilEditable | null;
  nombre: string;
  usuario: string;
  rolVisible: string;
  miembroDesde: number | null;
  cargando: boolean;
  estilo?: object;
  onEditar: (campo: CampoPerfil, evento: GestureResponderEvent) => void;
}

export function TarjetaInformacion({ perfil, nombre, usuario, rolVisible, miembroDesde, cargando, estilo, onEditar }: PropsInformacion) {
  const tema = useTema();
  const contacto = contactoDelPerfil(perfil);
  return (
    <Tarjeta titulo="Información personal" estilo={estilo}>
      <Text style={tema.estilo(s.description)}>
        {nombre} · {rolVisible}
      </Text>
      {cargando ? (
        <View style={s.loading}>
          <ActivityIndicator color={tema.colores.acento} />
          <Text style={tema.estilo(s.label)}>Cargando información…</Text>
        </View>
      ) : (
        <>
          <DatoEditable campo="nombreCompleto" icono="person" etiqueta="Nombre completo" valor={nombre} onEditar={onEditar} />
          <DatoEditable campo="usuario" icono="person" etiqueta="Nombre de usuario" valor={usuario} onEditar={onEditar} />
          <DatoEditable campo="email" icono="mail" etiqueta="Correo electrónico" valor={contacto.email} onEditar={onEditar} />
          <DatoEditable campo="telefono" icono="phone" etiqueta="Número de teléfono" valor={contacto.telefono} onEditar={onEditar} />
          {perfil?.chofer && (
            <>
              <DatoEditable campo="domicilio" icono="pin" etiqueta="Domicilio" valor={perfil.chofer.domicilio} onEditar={onEditar} />
              <DatoEditable campo="vehiculoId" icono="truck" etiqueta="Vehículo" valor={perfil.chofer.vehiculoId ?? ""} onEditar={onEditar} />
            </>
          )}
        </>
      )}
      <Text style={tema.estilo(s.footnote)}>Miembro desde {miembroDesde ?? "—"}</Text>
    </Tarjeta>
  );
}

export function TarjetaPreferencias() {
  const tema = useTema();
  const preferencias = usePreferencias();
  return (
    <Tarjeta titulo="Preferencias">
      <FilaPerfil icono="moon" titulo="Modo claro" detalle="Apariencia de toda la aplicación">
        <Interruptor
          etiqueta="Modo claro"
          value={preferencias.tema === "claro"}
          onValueChange={(valor) => void actualizarPreferencias({ tema: valor ? "claro" : "oscuro" })}
        />
      </FilaPerfil>
      <FilaPerfil icono="notifications" titulo="Modo silencioso" detalle="Silencia los sonidos propios de Logitrak">
        <Interruptor
          etiqueta="Modo silencioso"
          value={preferencias.silencioso}
          onValueChange={(valor) => void actualizarPreferencias({ silencioso: valor })}
        />
      </FilaPerfil>
      <Text style={tema.estilo(s.footnote)}>
        Las notificaciones visuales siguen activas. Las preferencias se guardan en este dispositivo.
      </Text>
    </Tarjeta>
  );
}

interface PropsSeguridad {
  dobleFactor: EstadoDobleFactor | null;
  puedeEliminarCuenta: boolean;
  onEditar: (campo: CampoPerfil, evento: GestureResponderEvent) => void;
  onDobleFactor: (accion: AccionDobleFactor) => void;
  onSalir: () => void;
  onEliminar: () => void;
}

export function TarjetaSeguridad({ dobleFactor, puedeEliminarCuenta, onEditar, onDobleFactor, onSalir, onEliminar }: PropsSeguridad) {
  const tema = useTema();
  const df = dobleFactor?.disponible ? textoDobleFactor(dobleFactor) : null;
  return (
    <Tarjeta titulo="Seguridad y cuenta">
      <DatoEditable campo="contrasena" icono="lock" etiqueta="Contraseña" valor="Cambiar mi contraseña" onEditar={onEditar} />
      {dobleFactor && df && (
        <FilaPerfil
          icono="lock"
          titulo="Verificación en dos pasos"
          detalle={
            <>
              <Text style={tema.estilo(s.label)}>{df.estado}</Text>
              {df.pocosCodigos && (
                <Text accessibilityRole="alert" style={tema.estilo([s.label, { color: "#FBBF24" }])}>
                  Te quedan pocos códigos de respaldo: generá nuevos.
                </Text>
              )}
            </>
          }
        >
          {!dobleFactor.activado && <Boton texto="Activar" secundario onPress={() => onDobleFactor("activar")} />}
        </FilaPerfil>
      )}
      {dobleFactor?.activado && (
        <View style={s.links}>
          <Boton texto="Nuevos códigos de respaldo" secundario onPress={() => onDobleFactor("codigos")} />
          <Boton texto="Desactivar" secundario onPress={() => onDobleFactor("desactivar")} />
        </View>
      )}
      <View style={s.accountActions}>
        <Boton texto="Cerrar sesión" icono="logout" peligro onPress={onSalir} />
        {puedeEliminarCuenta && (
          <View style={s.deleteAction}>
            <Boton texto="Eliminar cuenta" icono="delete" peligro onPress={onEliminar} />
          </View>
        )}
      </View>
    </Tarjeta>
  );
}
