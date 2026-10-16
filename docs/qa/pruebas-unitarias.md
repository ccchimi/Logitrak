# Pruebas Unitarias aplicadas al Proyecto de Tesis — Logitrak

## 1. Lenguaje y herramienta elegida

Logitrak está desarrollado en **TypeScript / JavaScript**: la app móvil usa **React Native con Expo** y la API usa **Node.js con Express**. Para las pruebas unitarias elegimos **Jest** (versión 29) junto con **ts-jest**, que permite ejecutar los tests directamente sobre el código TypeScript.

¿Por qué Jest?

- Es el framework de testing estándar del ecosistema JavaScript/React y el que recomienda Expo, así que sirve tanto para el frontend como para el backend.
- Trae todo integrado: ejecutor, aserciones (`expect`), *mocks*, temporizadores falsos y reporte de **cobertura de código**, sin instalar librerías aparte.
- Con `ts-jest` los tests se escriben en TypeScript y se chequean los tipos, igual que el código de producción.
- Tiene modo *watch*, que vuelve a correr los tests automáticamente al guardar un archivo.

## 2. Sintaxis y uso básico

### Organización y nombres de archivos

- Los tests se guardan en una carpeta `__tests__/` al lado del código que prueban, y cada archivo se llama igual que el módulo con el sufijo **`.test.ts`** (también se acepta `.spec.ts`). En Logitrak:

```
frontend/src/services/botLogistica/
├── tarifas.ts
├── direcciones.ts
├── cargas.ts
├── nlp.ts
└── __tests__/
    ├── tarifas.test.ts
    ├── direcciones.test.ts
    ├── cargas.test.ts
    └── nlp.test.ts
```

- Dentro de cada archivo, `describe('nombre', ...)` agrupa los casos de una misma función y cada `it('debería…', ...)` (o `test(...)`) es un caso de prueba. `it.each([...])` ejecuta el mismo test con una tabla de datos.
- La configuración está en `frontend/jest.config.js`.

### Aserciones

Jest usa la función **`expect(valorObtenido)`** seguida de un *matcher*:

| Matcher | Uso |
|---|---|
| `expect(x).toBe(3500)` | Igualdad estricta (números, strings, booleanos). |
| `expect(obj).toEqual({...})` / `toMatchObject({...})` | Igualdad profunda de objetos / que contenga ciertas propiedades. |
| `expect(x).toBeCloseTo(1.1)` | Comparación de decimales con tolerancia. |
| `expect(x).toBeGreaterThan(50)` / `toBeLessThanOrEqual(25)` | Comparaciones numéricas. |
| `expect(lista).toContain('peso_invalido')` | Que un arreglo o string contenga un elemento. |
| `expect(texto).toMatch(/^Mañana/)` | Que un string cumpla una expresión regular. |
| `expect(x).toBeNull()` | Que sea `null`. |
| `expect(x).not.toBe(...)` | Niega cualquier matcher. |

### Cómo se ejecutan

Desde la carpeta `frontend/`:

```bash
npm test                 # corre todos los tests
npm run test:watch       # los vuelve a correr al guardar cambios
npm run test:coverage    # corre los tests y genera el reporte de cobertura
npx jest tarifas         # corre solo los archivos que coinciden con "tarifas"
```

Desde el IDE (VS Code) se pueden correr con la extensión oficial **Jest** (*Orta.vscode-jest*), que muestra un ✓ o ✗ al lado de cada `it`.

## 3. Aplicación en el código de la tesis

### Función elegida: `cotizarSync` (cotizador de envíos)

Es la regla de negocio más importante del sistema: calcula **el precio que paga el cliente** por un envío. Valida las direcciones y el peso, calcula el peso facturable, elige el vehículo más barato que pueda llevar la carga y suma recargos.

Fragmento principal de [`frontend/src/services/botLogistica/tarifas.ts`](../../frontend/src/services/botLogistica/tarifas.ts):

```ts
export function cotizarSync(solicitud: SolicitudCotizacion): RespuestaCotizacion {
    const fecha = solicitud.fecha ?? new Date();
    const { limites } = CONFIG_OPERATIVA;
    // ... validación de origen y destino ...

    if (!isFinite(solicitud.pesoKg) || solicitud.pesoKg < limites.pesoMinKg) {
        return {
            exito: false,
            motivo: 'El peso informado no es válido.',
            problemas: [{ codigo: 'peso_invalido', severidad: 'critica',
                          mensaje: `Necesito un peso real en kg (mínimo ${limites.pesoMinKg} kg).` }],
        };
    }
    // ... límite máximo de peso y de bultos ...

    const pesoVolumetricoKg = (volumenUnitarioCm3 * bultos) / CONFIG_OPERATIVA.divisorVolumetrico;
    const pesoFacturableKg = Math.max(pesoRealKg, pesoVolumetricoKg);

    const seleccion = seleccionarVehiculo(pesoFacturableKg, bultos, volumenTotalDm3, carga, distancia.km);
    // Desglose: cargo base + kg facturables + bultos + km (+ peajes, recargo por carga,
    // seguro y ajuste por horario/día/demanda)
    const precio = redondear(desglose.reduce((acc, l) => acc + l.monto, 0)); // múltiplos de $50
    // ...
    return { exito: true, cotizacion };
}
```

### Pruebas unitarias

Fragmento de [`__tests__/tarifas.test.ts`](../../frontend/src/services/botLogistica/__tests__/tarifas.test.ts):

```ts
// Miércoles 14/10/2026 a las 14:00 (franja valle, día sin recargo).
const MIERCOLES_VALLE = new Date(2026, 9, 14, 14, 0);

const solicitudBase: SolicitudCotizacion = {
    origen: 'Av. Corrientes 1300, CABA',
    destino: 'Av. Santa Fe 3200, CABA',
    pesoKg: 3,
    bultos: 1,
    descripcionCarga: 'sobre con documentos',
    fecha: MIERCOLES_VALLE,
};

// ✔ Camino feliz: datos correctos → precio esperado calculado a mano
it('cotiza un envío urbano de documentos con moto y el precio calculado a mano', () => {
    const c = cotizacionOk(cotizarSync(solicitudBase));

    // Moto: 1900 base + 3 kg × 130 + 1 bulto × 160 + 7,7 km × 95 (732) = 3182
    // Ajuste por demanda CABA (×1,10): +318  →  3500, ya múltiplo de 50.
    expect(c.vehiculo.id).toBe('moto');
    expect(c.distanciaKm).toBe(7.7);
    expect(c.precio).toBe(3500);
});

// ✘ Caso de error: pesos inválidos
it.each([
    ['cero', 0],
    ['negativo', -5],
    ['NaN', Number.NaN],
    ['infinito', Number.POSITIVE_INFINITY],
    ['debajo del mínimo (0,01 kg)', 0.01],
])('rechaza peso %s', (_, pesoKg) => {
    const r = motivoError(cotizarSync({ ...solicitudBase, pesoKg }));
    expect(r.problemas[0].codigo).toBe('peso_invalido');
});

// ⚠ Caso de borde: límite exacto de capacidad de la flota
it('acepta exactamente el peso máximo (12.000 kg) y rechaza 12.001 kg', () => {
    const limite = cotizacionOk(cotizarSync({ ...solicitudBase, pesoKg: 12000 }));
    const excedido = motivoError(cotizarSync({ ...solicitudBase, pesoKg: 12001 }));

    expect(limite.vehiculo.id).toBe('camion');
    expect(excedido.problemas[0].codigo).toBe('peso_fuera_de_rango');
});
```

Además de estos casos, la batería completa tiene **98 pruebas** sobre el cotizador y sus funciones auxiliares (direcciones, clasificación de carga y procesamiento de texto). Están detalladas en el [Plan de Pruebas](plan-de-pruebas-cotizador.md).

### Resultado de la ejecución

```
> npm run test:coverage

PASS src/services/botLogistica/__tests__/nlp.test.ts
PASS src/services/botLogistica/__tests__/cargas.test.ts
PASS src/services/botLogistica/__tests__/tarifas.test.ts
PASS src/services/botLogistica/__tests__/direcciones.test.ts
----------------|---------|----------|---------|---------|
File            | % Stmts | % Branch | % Funcs | % Lines |
----------------|---------|----------|---------|---------|
All files       |   97.66 |    91.88 |     100 |   98.11 |
 cargas.ts      |   96.55 |    94.11 |     100 |     100 |
 direcciones.ts |    99.3 |    93.93 |     100 |   99.22 |
 nlp.ts         |     100 |      100 |     100 |     100 |
 tarifas.ts     |   94.83 |    86.04 |     100 |   95.55 |
----------------|---------|----------|---------|---------|
Test Suites: 4 passed, 4 total
Tests:       98 passed, 98 total
```

Salida completa: [evidencias/ejecucion-tests.txt](evidencias/ejecucion-tests.txt).

> **Hallazgo:** al escribir un caso de borde descubrimos que una dirección real como *"Av. Rivadavia 10000, CABA"* se rechazaba como "texto ilegible", porque la regla que detecta letras repetidas (`aaaa`) también se aplicaba a los números (`0000`). Lo registramos como DEF-01 en el plan de pruebas y lo corregimos así:
>
> 1. Primero escribimos 6 pruebas que describen el comportamiento correcto. Con el código original **fallaron las 6** (`Tests: 6 failed, 92 passed`), lo que confirmó el error.
> 2. Después cambiamos una sola línea en `nlp.ts` para que la regla mire solo letras:
>
>    ```ts
>    // Antes:   if (/(.)\1{3,}/.test(n)) return true;
>    if (/([a-zñ])\1{3,}/.test(n)) return true;
>    ```
>
> 3. Volvimos a correr toda la batería: **98 de 98 aprobadas**, incluidas las que siguen detectando texto basura como `aaaaaa`.
>
> Es un buen ejemplo de para qué sirven las pruebas unitarias: encuentran errores en casos límite que en el uso normal no aparecen, y las pruebas nuevas quedan como **pruebas de regresión** para que el error no vuelva.

Fragmento de una de las pruebas de regresión ([`__tests__/direcciones.test.ts`](../../frontend/src/services/botLogistica/__tests__/direcciones.test.ts)):

```ts
// DEF-01: antes se rechazaban como "texto ilegible" por los dígitos repetidos.
it('acepta alturas reales con dígitos repetidos', () => {
    const a = analizarDireccion('Av. Rivadavia 10000, CABA');

    expect(a.veredicto).toBe('verificada');
    expect(a.componentes.altura).toBe(10000);
});
```

## 4. Cierre: ¿cuándo correr las pruebas?

Vamos a correr las pruebas en tres momentos. **Mientras programamos**, dejamos `npm run test:watch` abierto para que, cada vez que guardamos un cambio en el cotizador, los tests se vuelvan a ejecutar al instante y veamos enseguida si rompimos una regla que ya funcionaba. **Antes de cada commit o push**, corremos `npm run test:coverage` completo para confirmar que pasan todos los casos y que la cobertura no baja del mínimo definido. Y **cada vez que cambie una regla de negocio** (tarifas, recargos, límites de la flota), primero actualizamos o agregamos el test con el nuevo valor esperado y después modificamos el código, así la prueba documenta el cambio y evita regresiones. Más adelante, la idea es sumarlas a un pipeline de integración continua (GitHub Actions) para que se ejecuten solas en cada push.
