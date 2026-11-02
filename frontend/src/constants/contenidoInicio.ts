// Textos y datos de la landing (pantalla Inicio). Separados de la pantalla
// para que el contenido se edite sin tocar el layout.

export const HERO_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=2000';

export const stats = [
  { num: '98%', label: 'Entregas a tiempo' },
  { num: '2.4h', label: 'Tiempo promedio' },
  { num: '50k+', label: 'Paquetes al mes' },
];

export const trustedBy = ['Mercanorte', 'AndesCargo', 'PymeExpress', 'NovaRetail', 'GrupoSur'];

export const features = [
  {
    indice: '01',
    title: 'Entrega express',
    text: 'Disponemos de rutas optimizadas para garantizar la entrega más rápida en cada zona.',
  },
  {
    indice: '02',
    title: 'Rastreo en vivo',
    text: 'Seguí tu paquete en tiempo real desde el celular con actualizaciones al instante.',
  },
  {
    indice: '03',
    title: 'Envíos seguros',
    text: 'Cada paquete está asegurado y manejado con protocolos de seguridad estrictos.',
  },
];

export const solutions = [
  { indice: '01', title: 'Última milla', text: 'Entregas urbanas en el día con flota propia y ruteo dinámico por zona.' },
  { indice: '02', title: 'Cargas FTL / LTL', text: 'Cargas completas o consolidadas a todo el país, con seguimiento en cada tramo.' },
  { indice: '03', title: 'Cadena de frío', text: 'Transporte refrigerado con control y registro de temperatura en tiempo real.' },
  { indice: '04', title: 'Logística inversa', text: 'Gestionamos devoluciones y cambios para tu cliente final.' },
  { indice: '05', title: 'Cross-docking', text: 'Consolidamos y redistribuimos sin almacenamiento intermedio para ganar tiempo.' },
  { indice: '06', title: 'Comercio exterior', text: 'Importación y exportación con gestión aduanera integrada al envío.' },
];

export const coverageStats = [
  { num: '23', label: 'Provincias' },
  { num: '+850', label: 'Localidades' },
  { num: '40', label: 'Centros de distribución' },
];

export const coverageCities = [
  'CABA', 'Rosario', 'Córdoba', 'Mendoza', 'La Plata',
  'Mar del Plata', 'Tucumán', 'Salta', 'Neuquén', 'Bahía Blanca',
];

export const steps = [
  { num: '01', title: 'Creá tu envío', text: 'Ingresa los datos en nuestra plataforma en 2 minutos.' },
  { num: '02', title: 'Recolección', text: 'Un mensajero retira el paquete por tu domicilio.' },
  { num: '03', title: 'En tránsito', text: 'Monitorea el recorrido en tiempo real mediante GPS.' },
  { num: '04', title: 'Entregado', text: 'Confirmación de recepción inmediata para tu tranquilidad.' },
];

export const trackingSteps = [
  { label: 'Pedido confirmado', time: 'Hoy · 08:14', done: true },
  { label: 'Retirado del depósito', time: 'Hoy · 09:02', done: true },
  { label: 'En camino a destino', time: 'Hoy · 11:30', done: true },
  { label: 'En reparto', time: 'Estimado · 14:00', done: false },
  { label: 'Entregado', time: 'Pendiente', done: false },
];

export const testimonials = [
  {
    quote: 'Pasamos de tener entregas impredecibles a un 97% a tiempo. El rastreo en vivo nos sacó la mitad de los llamados de soporte.',
    author: 'Lucía Fernández', role: 'Ops Manager · NovaRetail', initials: 'LF',
  },
  {
    quote: 'Integramos la API con nuestra tienda en una tarde. Hoy despachamos el triple de pedidos con el mismo equipo.',
    author: 'Martín Suárez', role: 'Founder · PymeExpress', initials: 'MS',
  },
  {
    quote: 'La cadena de frío con registro de temperatura nos abrió clientes que antes no podíamos atender. Cero rechazos.',
    author: 'Carolina Ríos', role: 'Supply Chain · GrupoSur', initials: 'CR',
  },
];

export const plans = [
  {
    name: 'Emprendedor', price: '$0', unit: '/ mes', featured: false, cta: 'Empezar gratis',
    items: ['Hasta 30 envíos por mes', 'Rastreo en vivo', 'Soporte por email'],
  },
  {
    name: 'Pyme', price: '$49', unit: '/ mes', featured: true, cta: 'Probar 14 días',
    items: [
      'Envíos ilimitados', 'Rastreo + alertas automáticas', 'Panel multiusuario',
      'Soporte prioritario', 'API de integración',
    ],
  },
  {
    name: 'Empresa', price: 'A medida', unit: '', featured: false, cta: 'Hablar con ventas',
    items: ['Todo lo del plan Pyme', 'SLA garantizado', 'Account manager dedicado', 'Integraciones a medida'],
  },
];

export const faqs = [
  {
    q: '¿Cómo rastreo mi envío?',
    a: 'Cada envío genera un código TRK único. Lo seguís en vivo desde el panel o la app, con actualizaciones automáticas en cada etapa del recorrido.',
  },
  {
    q: '¿Llegan a todo el país?',
    a: 'Sí. Operamos en 23 provincias y más de 850 localidades, con centros de distribución en los principales nodos logísticos del país.',
  },
  {
    q: '¿Puedo integrar logitrak con mi tienda?',
    a: 'Con el plan Pyme o superior accedés a nuestra API para integrar tu e-commerce o ERP en minutos, sin desarrollo a medida.',
  },
  {
    q: '¿Qué pasa si necesito cancelar un envío?',
    a: 'Podés cancelar sin costo mientras el paquete no haya sido retirado. Después, aplica nuestra política de logística inversa.',
  },
];
