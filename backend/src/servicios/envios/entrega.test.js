import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { generarPin, leerFoto, MAX_BYTES_FOTO, pinCorrecto } from './entrega.js';

const jpeg = (extra = 200) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(extra)]);

describe('PIN de entrega', () => {
    test('siempre 4 dígitos, y no siempre el mismo', () => {
        const pines = new Set(Array.from({ length: 50 }, generarPin));
        for (const p of pines) assert.match(p, /^\d{4}$/);
        assert.ok(pines.size > 40);
    });

    test('compara exacto', () => {
        assert.equal(pinCorrecto('0427', '0427'), true);
        assert.equal(pinCorrecto('0427', '427'), false);
        assert.equal(pinCorrecto('0427', '0428'), false);
        assert.equal(pinCorrecto(null, '0427'), false);
    });
});

describe('foto de comprobante', () => {
    test('acepta JPG con o sin prefijo data:, y reconoce el tipo por su contenido', () => {
        const b64 = jpeg().toString('base64');
        assert.equal(leerFoto(b64).tipo, 'image/jpeg');
        assert.equal(leerFoto(`data:image/png;base64,${b64}`).ext, 'jpg', 'el prefijo no manda: manda el contenido');
        const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200)]);
        assert.equal(leerFoto(png.toString('base64')).tipo, 'image/png');
    });

    test('rechaza lo que no es una imagen, lo vacío y lo demasiado grande', () => {
        assert.match(leerFoto(Buffer.from('<script>'.repeat(40)).toString('base64')).error, /JPG, PNG o WebP/);
        assert.match(leerFoto('').error, /Falta/);
        assert.match(leerFoto(jpeg(MAX_BYTES_FOTO).toString('base64')).error, /8 MB/);
    });
});
