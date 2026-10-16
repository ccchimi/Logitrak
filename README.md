# Logitrak

Logitrak es una plataforma de logística de última milla que conecta a quien
necesita enviar algo con la flota que puede llevarlo. El cliente cotiza su envío
conversando con un asistente, lo paga, y a partir de ahí lo sigue en un mapa
hasta que llega a destino.

La idea detrás del proyecto es que mandar un paquete debería ser tan simple como
pedir un viaje. Para eso nos apoyamos en tres decisiones que atraviesan todo el
sistema. La primera es que el precio se explica: en lugar de mostrar una tarifa
cerrada, el motor de cotización desglosa cuánto pesa el vehículo elegido, la
distancia, el peso volumétrico y la franja horaria. La segunda es que la
confianza se construye con datos verificables, así que los choferes pasan por una
verificación de identidad y el cliente ve en todo momento quién lleva su carga y
en qué unidad. La tercera es que la misma aplicación corre en web, Android e iOS
desde una única base de código, para no mantener tres productos distintos.

## Cómo funciona el circuito

El cliente arranca cotizando con Boxy, el asistente que corre en el propio
dispositivo: interpreta las direcciones y la descripción de la carga, elige el
vehículo que corresponde y arma el precio. Cuando confirma y paga, el envío deja
de ser una cotización y pasa a estar disponible para la flota.

Ahí entra el modelo que usamos para asignar: el envío pagado se publica para
todos los choferes cuyo vehículo puede transportar esa carga, y el primero que lo
toma se lo queda. Es el mismo esquema de las aplicaciones de movilidad, y nos
evita tener que decidir centralmente a quién le toca cada viaje. Desde ese
momento el cliente ve el nombre del chofer, su identificador y la unidad real que
salió a buscar el paquete, mientras el chofer va marcando los hitos del viaje
desde su propia consola.

Si el envío supera el plazo comprometido, se emite un cupón de compensación a
favor del cliente. Conviene aclarar que hoy ese cupón se dispara desde la
aplicación cuando vence el contador, y no desde un proceso en el servidor: es una
deuda que tenemos pendiente y está anotada como tal.

El sistema maneja tres roles. Cliente es cualquiera que se registra. Chofer es un
cliente que se postuló, declaró con qué vehículo trabaja y aprobó la verificación
de identidad. Admin se siembra por sistema y no puede crearse desde la
aplicación.

## Cómo está organizado el repositorio

El proyecto se divide en dos partes que se desarrollan y se despliegan por
separado.

En `backend/` vive la API REST, escrita en Node.js con Express sobre PostgreSQL.
Resuelve la autenticación con roles, las cotizaciones, los envíos y su
seguimiento, la asignación a choferes, los pagos, los cupones y la verificación
de identidad.

En `frontend/` está la aplicación, hecha con Expo y React Native en TypeScript.
Incluye a Boxy, el mapa de seguimiento, el circuito de pago y el alta de chofer.

Cada carpeta tiene su propio README con el detalle de configuración. El orden
para levantar el proyecto es siempre el mismo: primero el backend apuntado a la
base del equipo, y después el frontend apuntado a esa API.

## Puesta en marcha

```bash
# 1) Backend
cd backend && npm install
cp .env.example .env        # pegá el DATABASE_URL del proyecto de Supabase
npm run dev                 # API en http://localhost:4000

# 2) Frontend (en otra terminal)
cd frontend && npm install
cp .env.example .env        # fijá EXPO_PUBLIC_API_URL a la IP LAN de tu backend
npm start                   # escaneá el QR con Expo Go o elegí plataforma
```

## Dónde corre

El backend está desplegado en Render como Web Service, con despliegue automático
desde `main`, y responde en `https://logitrak.onrender.com`. La base de datos es
un PostgreSQL gestionado en Supabase, que además nos guarda en un bucket privado
las fotos de la verificación de identidad. La aplicación se compila con EAS
Build, que es el servicio de builds de Expo.

Una limitación a tener presente: el plan gratuito de Render apaga la instancia
cuando no recibe tráfico, así que el primer pedido después de un rato puede
demorar cerca de cincuenta segundos. Para producción hace falta un plan que
mantenga el servicio siempre activo.

---

© 2026 Logitrak. Todos los derechos reservados.
