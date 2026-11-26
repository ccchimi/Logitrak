import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';
import {
    base32,
    codigoTotp,
    desdeBase32,
    firmarDesafio,
    generarCodigosRespaldo,
    hashRespaldo,
    leerDesafio,
    pareceRespaldo,
    pasoDe,
    uriOtpauth,
    verificarTotp,
} from '../servicios/dobleFactor.js';

const RFC = Buffer.from('12345678901234567890');

describe('TOTP (RFC 6238)', () => {
    test('coincide con los vectores de prueba del RFC', () => {
        const casos = [[59, '94287082'], [1111111109, '07081804'], [1234567890, '89005924'], [2000000000, '69279037']];
        for (const [segundos, esperado] of casos) assert.equal(codigoTotp(RFC, Math.floor(segundos / 30), 8), esperado, String(segundos));
    });

    test('acepta el código actual y el de un paso de diferencia, y nunca uno ya usado', () => {
        const ahora = 1_800_000_000_000;
        const paso = pasoDe(ahora);
        assert.equal(verificarTotp(RFC, codigoTotp(RFC, paso), { ahora }), paso);
        assert.equal(verificarTotp(RFC, codigoTotp(RFC, paso - 1), { ahora }), paso - 1);
        assert.equal(verificarTotp(RFC, codigoTotp(RFC, paso + 2), { ahora }), null, 'fuera de la ventana');
        assert.equal(verificarTotp(RFC, codigoTotp(RFC, paso), { ahora, ultimoPaso: paso }), null, 'no se reutiliza');
        assert.equal(verificarTotp(RFC, '12345', { ahora }), null);
    });

    test('base32, URI para la app y códigos de respaldo', () => {
        assert.equal(base32(RFC), 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
        assert.deepEqual(desdeBase32('gezd gnbv gy3t qojq gezd gnbv gy3t qojq'), RFC);
        assert.equal(uriOtpauth('ana.admin', RFC), 'otpauth://totp/Logitrak%3Aana.admin?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Logitrak&algorithm=SHA1&digits=6&period=30');
        const codigos = generarCodigosRespaldo();
        assert.equal(new Set(codigos).size, 10);
        assert.ok(codigos.every((c) => /^[a-z2-9]{4}-[a-z2-9]{4}$/.test(c)));
        assert.equal(hashRespaldo('ABCD-efgh'), hashRespaldo('abcdefgh'));
        assert.equal(pareceRespaldo('12345678'), false, 'solo números no es de respaldo');
    });

    test('el desafío del login no sirve como token de acceso', () => {
        process.env.JWT_SECRET ??= 'secreto-de-prueba';
        const d = firmarDesafio(7);
        assert.equal(leerDesafio(d), 7);
        assert.equal(leerDesafio('basura'), null);
    });
});

describe('verificación en dos pasos para el equipo (integración)', { skip: SALTEAR }, () => {
    let e;
    let despachar;

    before(async () => {
        e = await levantarApi();
        ({ despachar } = await import('../outbox/index.js'));
    });
    after(() => e?.cerrar());

    const iniciar = (s, contrasena = e.clave) => e.http('post', '/api/perfil/doble-factor/iniciar', { token: s.token }).send({ contrasena });
    const activar = (s, codigo) => e.http('post', '/api/perfil/doble-factor/activar', { token: s.token }).send({ codigo });
    const login = (usuario, contrasena = e.clave) => e.http('post', '/api/auth/login').send({ usuario, contrasena });
    const segundo = (desafio, codigo) => e.http('post', '/api/auth/login/segundo-factor').send({ desafio, codigo });

    // Activa el 2FA y devuelve el secreto y los códigos de respaldo.
    async function conDobleFactor(sufijo, rol = 'admin') {
        const s = await e.conRol(sufijo, rol);
        const ini = await iniciar(s);
        assert.equal(ini.status, 200, JSON.stringify(ini.body));
        const secreto = desdeBase32(ini.body.secreto);
        const act = await activar(s, codigoTotp(secreto, pasoDe()));
        assert.equal(act.status, 200, JSON.stringify(act.body));
        return { s, secreto, respaldo: act.body.codigosRespaldo, ini: ini.body };
    }

    test('el admin la activa escaneando el QR y confirmando el primer código', async () => {
        const s = await e.conRol('2fa.act', 'admin');
        const estado0 = await e.http('get', '/api/perfil/doble-factor', { token: s.token });
        assert.deepEqual(estado0.body.dobleFactor, { disponible: true, activado: false, activadoEn: null, codigosRestantes: 0 });

        assert.equal((await iniciar(s, 'otra')).status, 401, 'pide la contraseña');
        const ini = await iniciar(s);
        assert.match(ini.body.uri, /^otpauth:\/\/totp\/Logitrak%3A/);
        assert.match(ini.body.qr, /^data:image\/png;base64,/);
        const fila = (await e.pool.query('SELECT totp_pendiente, totp_secreto, totp_activado_en FROM usuarios WHERE id = $1', [s.perfil.id])).rows[0];
        assert.ok(fila.totp_pendiente.startsWith('v1.'), 'el secreto se guarda cifrado');
        assert.ok(!fila.totp_pendiente.includes(ini.body.secreto));
        assert.equal(fila.totp_activado_en, null, 'todavía no está activa');

        const secreto = desdeBase32(ini.body.secreto);
        assert.equal((await activar(s, '000000')).status, 400);
        const act = await activar(s, codigoTotp(secreto, pasoDe()));
        assert.equal(act.status, 200, JSON.stringify(act.body));
        assert.equal(act.body.codigosRespaldo.length, 10);
        assert.equal(act.body.dobleFactor.activado, true);
        assert.equal(act.body.dobleFactor.disponible, true, 'la app sigue mostrando la opción');
        assert.equal(act.body.dobleFactor.codigosRestantes, 10);
        assert.equal((await iniciar(s)).status, 409, 'no se activa dos veces');
    });

    test('con 2FA, la contraseña sola no abre sesión; con el código sí, y el código no sirve dos veces', async () => {
        const { s, secreto } = await conDobleFactor('2fa.login');

        const paso1 = await login(s.usuario);
        assert.equal(paso1.status, 200);
        assert.equal(paso1.body.requiereSegundoFactor, true);
        assert.equal(paso1.body.token, undefined, 'no entrega un token de acceso');
        assert.equal((await e.http('get', '/api/auth/perfil', { token: paso1.body.desafio })).status, 401, 'el desafío no sirve como sesión');

        assert.equal((await segundo(paso1.body.desafio, '123456')).status, 401);
        const codigo = codigoTotp(secreto, pasoDe() + 1);
        const paso2 = await segundo(paso1.body.desafio, codigo);
        assert.equal(paso2.status, 200, JSON.stringify(paso2.body));
        assert.ok(paso2.body.token);
        assert.ok(paso2.body.refreshToken);
        assert.equal(paso2.body.usuario.dobleFactor, true);
        assert.equal((await e.http('get', '/api/auth/perfil', { token: paso2.body.token })).status, 200);

        const otra = await login(s.usuario);
        assert.equal((await segundo(otra.body.desafio, codigo)).status, 401, 'el mismo código no se reutiliza');
        assert.equal((await segundo('desafio-falso-de-prueba', codigo)).body.codigo, 'desafio_vencido');

        const auditoria = (await e.pool.query('SELECT motivo FROM auditoria_accesos WHERE usuario = $1 ORDER BY id', [s.usuario])).rows.map((r) => r.motivo);
        assert.ok(auditoria.includes('falta el segundo factor'));
        assert.ok(auditoria.includes('segundo factor incorrecto'));
        assert.ok(auditoria.includes('segundo factor'));
    });

    test('un código de respaldo sirve una sola vez', async () => {
        const { s, respaldo } = await conDobleFactor('2fa.resp');
        const d1 = (await login(s.usuario)).body.desafio;
        assert.equal((await segundo(d1, respaldo[0].toUpperCase())).status, 200, 'sin importar mayúsculas');
        const d2 = (await login(s.usuario)).body.desafio;
        assert.equal((await segundo(d2, respaldo[0])).status, 401, 'ya se usó');
        const estado = await e.http('get', '/api/perfil/doble-factor', { token: s.token });
        assert.equal(estado.body.dobleFactor.codigosRestantes, 9);
    });

    test('desactivar y regenerar códigos piden la contraseña y un código; se avisa al usuario', async () => {
        const { s, secreto, respaldo } = await conDobleFactor('2fa.des');
        const regen = await e.http('post', '/api/perfil/doble-factor/codigos', { token: s.token }).send({ contrasena: e.clave, codigo: respaldo[1] });
        assert.equal(regen.status, 200, JSON.stringify(regen.body));
        assert.equal(regen.body.codigosRespaldo.length, 10);
        assert.notDeepEqual(regen.body.codigosRespaldo, respaldo);

        const des = (cuerpo) => e.http('post', '/api/perfil/doble-factor/desactivar', { token: s.token }).send(cuerpo);
        assert.equal((await des({ contrasena: 'otra', codigo: '123456' })).status, 401);
        assert.equal((await des({ contrasena: e.clave, codigo: respaldo[2] })).status, 400, 'los códigos viejos ya no sirven');
        const ok = await des({ contrasena: e.clave, codigo: codigoTotp(secreto, pasoDe() + 1) });
        assert.equal(ok.status, 200, JSON.stringify(ok.body));
        assert.equal(ok.body.dobleFactor.activado, false);
        assert.ok((await login(s.usuario)).body.token, 'vuelve a entrar solo con la contraseña');

        const eventos = (await e.pool.query(`SELECT id FROM outbox_events WHERE event_type = 'usuario.doble_factor' AND aggregate_id = $1`, [String(s.perfil.id)])).rows;
        await despachar({ ids: eventos.map((x) => x.id) });
        const titulos = (await e.pool.query(`SELECT titulo FROM notificaciones WHERE usuario_id = $1 AND tipo = 'usuario.doble_factor' ORDER BY id`, [s.perfil.id])).rows.map((r) => r.titulo);
        assert.deepEqual(titulos, ['Activaste la verificación en dos pasos', 'Desactivaste la verificación en dos pasos']);
    });

    test('un admin restablece el 2FA de otro miembro del equipo, pero no el propio', async () => {
        const admin = await e.conRol('2fa.jefe', 'admin');
        const { s: sop } = await conDobleFactor('2fa.sop', 'soporte');
        const restablecer = (token, id) => e.http('post', `/api/admin/usuarios/${id}/doble-factor/restablecer`, { token });

        assert.equal((await restablecer(sop.token, admin.perfil.id)).status, 403, 'soporte no puede');
        assert.equal((await restablecer(admin.token, admin.perfil.id)).status, 409, 'no la propia');
        assert.equal((await restablecer(admin.token, sop.perfil.id)).status, 200);
        assert.equal((await restablecer(admin.token, sop.perfil.id)).status, 409, 'ya no tiene');
        assert.ok((await login(sop.usuario)).body.token);
        const perfil = await e.http('get', `/api/admin/usuarios/${sop.perfil.id}`, { token: admin.token });
        assert.equal(perfil.body.perfil?.dobleFactor ?? perfil.body.usuario?.dobleFactor, false);
    });

    test('es solo para el equipo, y una cuenta con 2FA no se recupera sin el código', async () => {
        const cli = await e.cuenta('2fa.cli');
        assert.equal((await iniciar(cli)).status, 403);
        assert.equal((await e.http('get', '/api/perfil/doble-factor', { token: cli.token })).body.dobleFactor.disponible, false);

        await e.pool.query(`UPDATE usuarios SET totp_activado_en = now(), totp_secreto = 'v1.x.x.x' WHERE id = $1`, [cli.perfil.id]);
        const r = await e.http('post', '/api/auth/recuperar').send({ usuario: cli.usuario, contacto: 'ana@mail.com' });
        assert.equal(r.status, 200, 'la respuesta es la misma para no revelar nada');
        const pedidos = await e.pool.query('SELECT 1 FROM soporte_tickets WHERE usuario_id = $1', [cli.perfil.id]);
        assert.equal(pedidos.rowCount, 0, 'pero no se abre ningún pedido');
    });
});
