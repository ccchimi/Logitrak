import { analizarDireccion, Cotizacion, ContextoConversacion, cotizarEnvio } from "./botLogistica";
import { guardarCotizacion } from "./cotizacionesService";
import type { EnvioData } from "../helpers/pasosSolicitudEnvio";

const numero = (valor: string) => parseFloat(valor) || undefined;

export function contextoDeConversacion(data: EnvioData): ContextoConversacion {
  return {
    origen: data.origen ? analizarDireccion(data.origen) : null,
    destino: data.destino ? analizarDireccion(data.destino) : null,
    pesoKg: parseFloat(data.peso) || null,
    bultos: parseInt(data.bultos, 10) || null,
  };
}

export type ResultadoCotizacionChat = {
  texto: string;
  cotizacion?: Cotizacion;
};

export async function cotizarYGuardar(data: EnvioData): Promise<ResultadoCotizacionChat> {
  try {
    const respuesta = await cotizarEnvio({
      origen: data.origen,
      destino: data.destino,
      pesoKg: parseFloat(data.peso),
      bultos: parseInt(data.bultos, 10),
      descripcionCarga: data.descripcion || undefined,
      dimensiones: { largo: numero(data.largo), ancho: numero(data.ancho), alto: numero(data.alto) },
    });

    if (!respuesta.exito) {
      const detalles = respuesta.problemas
        .map((p) => `• ${p.mensaje}${p.sugerencia ? ` ${p.sugerencia}` : ""}`)
        .join("\n");
      return { texto: `${respuesta.motivo}\n${detalles}\n\nTocá "Nueva cotización" para corregir los datos.` };
    }

    const guardado = await guardarCotizacion(respuesta.cotizacion, {
      origen: data.origen,
      destino: data.destino,
      pesoKg: parseFloat(data.peso),
      bultos: parseInt(data.bultos, 10) || undefined,
      descripcionCarga: data.descripcion || undefined,
      largoCm: numero(data.largo),
      anchoCm: numero(data.ancho),
      altoCm: numero(data.alto),
    });

    if (!guardado.exito) {
      return { texto: `No pude registrar la cotización: ${guardado.error}\n\nTocá "Nueva cotización" para intentarlo de nuevo.` };
    }

    let texto = `Listo. Analicé ruta, carga y contexto operativo: esta es mi cotización con un ${guardado.cotizacion.puntajeConfianza}% de confianza.`;
    if (guardado.precioAjustado) {
      const kmServidor = guardado.cotizacion.distanciaKm;
      texto +=
        kmServidor !== respuesta.cotizacion.distanciaKm
          ? `\n\nAjusté el precio con la distancia por calle: ${kmServidor.toLocaleString("es-AR")} km.`
          : "\n\nAjusté el precio con la tarifa vigente del servidor.";
    }
    return { texto, cotizacion: guardado.cotizacion };
  } catch {
    return { texto: "No pude calcular la cotización en este momento. Revisá los datos e intentá nuevamente." };
  }
}
