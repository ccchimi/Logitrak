import type { NombreIcono } from "../Icono";
import type { DatosChofer } from "../../helpers/postulacion";

export type PasoPostulacion = {
  titulo: string;
  corto: string;
  detalle: string;
  icono: NombreIcono;
};

export const PASOS: PasoPostulacion[] = [
  {
    titulo: "Empecemos por tus datos",
    corto: "Tus datos",
    detalle: "Usá los datos que figuran en tu DNI para verificar tu identidad.",
    icono: "person",
  },
  {
    titulo: "Elegí tu vehículo",
    corto: "Vehículo",
    detalle: "Seleccioná la unidad de la flota con la que vas a trabajar.",
    icono: "truck",
  },
  {
    titulo: "Verificá tu identidad",
    corto: "Identidad",
    detalle: "Tené a mano tu DNI y buscá un lugar con buena iluminación.",
    icono: "card",
  },
  {
    titulo: "Todo listo para revisar",
    corto: "Revisión",
    detalle: "Comprobá tus datos antes de enviar la postulación.",
    icono: "check",
  },
];

export const ORDEN_CAMPOS: (keyof DatosChofer)[] = [
  "nombreCompleto",
  "dni",
  "email",
  "telefono",
  "domicilio",
];
