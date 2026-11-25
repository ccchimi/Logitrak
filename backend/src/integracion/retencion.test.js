import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

describe('plazos de conservación de datos personales (integración)', { skip: SALTEAR }, () => {
    let e;
    let retencion;

    before(async () => {
        e = await levantarApi();
        retencion = await import('../servicios/retencion.js');
    });
    after(() => e?.cerrar());

    test('los plazos se configuran por variable de entorno y tienen valores por defecto', () => {
        assert.deepEqual(retencion.plazosDeRetencion({}), { fotosEntregaDias: 180, fotosChatDias: 90, auditoriaDias: 365 });
        assert.deepEqual(
            retencion.plazosDeRetencion({ RETENCION_FOTOS_ENTREGA_DIAS: '30', RETENCION_FOTOS_CHAT_DIAS: 'x', RETENCION_AUDITORIA_DIAS: '-4' }),
            { fotosEntregaDias: 30, fotosChatDias: 90, auditoriaDias: 365 },
            'un valor inválido usa el de defecto'
        );
    });

    test('borra solo lo que cumplió su plazo: fotos de entrega, fotos del chat e IP de los ingresos', async () => {
        const cli = await e.cuenta('ret.cli');
        const viejo = await e.crearEnvio(cli);
        const reciente = await e.crearEnvio(cli);
        const sufijo = `${Date.now()}`;
        const ruta = (n) => `pruebas-retencion/${sufijo}/${n}.jpg`;

        await e.pool.query(
            `UPDATE envios SET estado = 'entregado', entregado_en = now() - interval '200 days', foto_entrega_path = $2 WHERE id = $1`,
            [viejo.id, ruta('entrega-vieja')]
        );
        await e.pool.query(
            `UPDATE envios SET estado = 'entregado', entregado_en = now() - interval '10 days', foto_entrega_path = $2 WHERE id = $1`,
            [reciente.id, ruta('entrega-reciente')]
        );
        const mensaje = async (envioId, texto, foto) => (await e.pool.query(
            `INSERT INTO envio_mensajes (envio_id, autor_id, autor_rol, texto, foto_ruta, foto_tipo)
             VALUES ($1, $2, 'cliente', $3, $4, 'image/jpeg') RETURNING id`,
            [envioId, cli.perfil.id, texto, foto]
        )).rows[0].id;
        const soloFoto = await mensaje(viejo.id, null, ruta('chat-solo-foto'));
        const conTexto = await mensaje(viejo.id, 'Te dejo la foto del portón', ruta('chat-con-texto'));
        const chatReciente = await mensaje(reciente.id, null, ruta('chat-reciente'));

        const usuario = `ret.${sufijo}`.slice(0, 20);
        await e.pool.query(
            `INSERT INTO auditoria_accesos (usuario, exito, motivo, ip, user_agent, fecha)
             VALUES ($1, true, 'ok', '200.1.1.1', 'Navegador viejo', now() - interval '400 days'),
                    ($1, true, 'ok', '200.2.2.2', 'Navegador nuevo', now() - interval '5 days')`,
            [usuario]
        );

        const borradosEnStorage = [];
        const r = await retencion.aplicarRetencion(e.pool, {
            env: {},
            borrarEnStorage: async (rutas) => {
                borradosEnStorage.push(...rutas);
                return [];
            },
        });
        assert.ok(r.fotosEntrega >= 1 && r.fotosChat >= 2 && r.ingresosAnonimizados >= 1, JSON.stringify(r));

        const envio = async (id) => (await e.pool.query('SELECT foto_entrega_path FROM envios WHERE id = $1', [id])).rows[0];
        assert.equal((await envio(viejo.id)).foto_entrega_path, null, 'foto de entrega de hace 200 días');
        assert.equal((await envio(reciente.id)).foto_entrega_path, ruta('entrega-reciente'), 'la reciente queda');

        const msj = async (id) => (await e.pool.query('SELECT texto, foto_ruta FROM envio_mensajes WHERE id = $1', [id])).rows[0];
        assert.deepEqual(await msj(soloFoto), { texto: retencion.TEXTO_FOTO_VENCIDA, foto_ruta: null }, 'el mensaje queda explicado');
        assert.deepEqual(await msj(conTexto), { texto: 'Te dejo la foto del portón', foto_ruta: null }, 'el texto se conserva');
        assert.equal((await msj(chatReciente)).foto_ruta, ruta('chat-reciente'));

        for (const n of ['entrega-vieja', 'chat-solo-foto', 'chat-con-texto']) assert.ok(borradosEnStorage.includes(ruta(n)), n);
        for (const n of ['entrega-reciente', 'chat-reciente']) assert.equal(borradosEnStorage.includes(ruta(n)), false, n);
        const anotados = await e.pool.query('SELECT 1 FROM archivos_por_borrar WHERE ruta LIKE $1', [`pruebas-retencion/${sufijo}/%`]);
        assert.equal(anotados.rowCount, 0, 'lo que se borró no queda pendiente');

        const ingresos = (await e.pool.query('SELECT ip, user_agent FROM auditoria_accesos WHERE usuario = $1 ORDER BY fecha', [usuario])).rows;
        // eslint-disable-next-line sonarjs/no-hardcoded-ip -- IP de prueba insertada arriba
        assert.deepEqual(ingresos, [{ ip: null, user_agent: null }, { ip: '200.2.2.2', user_agent: 'Navegador nuevo' }]);

        const otraVez = await retencion.aplicarRetencion(e.pool, { env: {}, borrarEnStorage: async () => [] });
        assert.equal(otraVez.fotosEntrega + otraVez.fotosChat, 0, 'repetir no vuelve a borrar lo mismo');
    });

    test('si Storage no responde, los archivos quedan anotados para reintentar', async () => {
        const cli = await e.cuenta('ret.falla');
        const envio = await e.crearEnvio(cli);
        const ruta = `pruebas-retencion/falla-${Date.now()}.jpg`;
        await e.pool.query(
            `UPDATE envios SET estado = 'entregado', entregado_en = now() - interval '365 days', foto_entrega_path = $2 WHERE id = $1`,
            [envio.id, ruta]
        );
        await retencion.aplicarRetencion(e.pool, { env: {}, borrarEnStorage: async (rutas) => rutas });
        const anotado = await e.pool.query('SELECT motivo FROM archivos_por_borrar WHERE ruta = $1', [ruta]);
        assert.equal(anotado.rows[0]?.motivo, 'retención: foto de entrega');
        await e.pool.query('DELETE FROM archivos_por_borrar WHERE ruta = $1', [ruta]);
    });
});
