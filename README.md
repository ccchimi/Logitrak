# Logitrak

**Logitrak es una plataforma de logística de última milla** que conecta a quien
necesita enviar algo con la flota que puede llevarlo, sin fricción: el cliente
cotiza conversando con un asistente, paga, sigue su envío en un mapa en tiempo
real y recibe una compensación automática si no cumplimos el plazo prometido.

## Nuestro objetivo

Hacer que mandar un paquete sea tan simple, transparente y confiable como pedir
un viaje. Apuntamos a tres cosas:

- **Cotización honesta e instantánea.** Un motor de pricing que explica cada
  peso del precio (vehículo, distancia, peso volumétrico, franja horaria,
  demanda) en vez de una tarifa opaca.
- **Confianza de punta a punta.** Seguimiento en vivo, choferes con identidad
  verificada y un SLA que, si se incumple, se compensa solo con un cupón.
- **Una sola experiencia, en todos lados.** La misma app en web, Android e iOS,
  pensada para que cualquiera la use sin instrucciones.

La visión: ser la capa de logística sobre la que se apoyen comercios y personas
en Argentina para mover cualquier cosa, de un punto a otro, con previsibilidad.

## Cómo funciona

1. **Cotizás** un envío conversando con **Boxy**, el asistente de logística que
   corre on-device: interpreta direcciones y carga, elige el vehículo y arma el
   precio con su desglose.
2. **Confirmás y pagás** (Mercado Pago, MODO o tarjeta).
3. El envío se **asigna a un chofer** verificado y empieza el **seguimiento en
   vivo** sobre el mapa.
4. Si el envío excede el SLA, se **emite un cupón de compensación** automático.

Roles del sistema: **cliente** (todo el que se registra), **chofer** (un cliente
que se postuló y pasó la verificación de identidad) y **admin** (gestión
interna, no se crea desde la app).

## Estructura del repositorio

| Carpeta | Qué es | Tecnología |
|---------|--------|------------|
| [`backend/`](backend/README.md) | API REST: auth con roles, cotizaciones, envíos, asignaciones, pagos, cupones y verificación de identidad. | Node.js · Express · PostgreSQL |
| [`frontend/`](frontend/README.md) | App multiplataforma con Boxy, mapa de seguimiento, pago y alta de chofer. | Expo · React Native · TypeScript |

Cada carpeta tiene su propio README con el detalle de cómo configurarla y
correrla. El recorrido típico es: **levantar el `backend`** (PostgreSQL local o
Azure) y luego **correr el `frontend`** apuntándolo a esa API.

## Puesta en marcha rápida

```bash
# 1) Backend
cd backend && npm install
cp .env.example .env        # completá las credenciales de PostgreSQL
npm run dev                 # API en http://localhost:4000

# 2) Frontend (en otra terminal)
cd frontend && npm install
cp .env.example .env        # fijá EXPO_PUBLIC_API_URL a la IP LAN de tu backend
npm start                   # escaneá el QR con Expo Go o elegí plataforma
```

---

© 2026 LogiTrack. Todos los derechos reservados.
