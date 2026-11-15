import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const raiz = (ruta) => fileURLToPath(new URL(ruta, import.meta.url));

await build({
    entryPoints: [raiz('../../frontend/src/services/botLogistica/tarifas.ts')],
    outfile: raiz('../src/servicios/cotizador/cotizador.generado.js'),
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    legalComments: 'none',
    banner: {
        js: '// ARCHIVO GENERADO por scripts/generar-cotizador.js a partir de\n' +
            '// frontend/src/services/botLogistica. No editar a mano: npm run generar:cotizador',
    },
});

console.log('Cotizador generado en src/servicios/cotizador/cotizador.generado.js');
