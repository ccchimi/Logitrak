// Roles y permisos (Hito 3.2) contra PostgreSQL real.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

const TARJETA_OK = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };

describe('roles y permisos (integración)', { skip: SALTEAR }, () => {
    let entorno;
    let api;
    let cuenta;
    let pool;

    before(async () => {
        entorno = await levantarApi();
        ({ api, cuenta, pool } = entorno);
    });

    after(() => entorno?.cerrar());

    // Cuenta con un rol dado, ya logueada con ese rol.
    async function conRol(sufijo, rol) {
        const s = await cuenta(sufijo);
        if (rol !== 'cliente') await pool.query('UPDATE usuarios SET rol = $2 WHERE id = $1', [s.perfil.id, rol]);
        const r = await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: s.usuario, contrasena: entorno.clave } });
        return { ...s, token: r.body.token, refreshToken: r.body.refreshToken, login: r.body };
    }

    async function envioPagado(cliente) {
        const codigo = `COT-ROL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await api('/api/cotizaciones', {
            metodo: 'POST',
            token: cliente.token,
            cuerpo: { codigo, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg: 2, bultos: 1 },
        });
        const envio = (await api('/api/envios', { metodo: 'POST', token: cliente.token, cuerpo: { cotizacionCodigo: codigo } })).body.envio;
        await api('/api/pagos/tarjeta', { metodo: 'POST', token: cliente.token, cuerpo: { envioCodigo: envio.codigo, ...TARJETA_OK } });
        return envio;
    }

    test('el login devuelve los permisos del rol', async () => {
        assert.deepEqual((await conRol('rol.cli', 'cliente')).login.usuario.permisos, []);
        const soporte = await conRol('rol.sop', 'soporte');
        assert.equal(soporte.login.usuario.rol, 'soporte');
        assert.ok(soporte.login.usuario.permisos.includes('soporte.atender'));
        assert.equal(soporte.login.usuario.permisos.includes('envios.reembolsar'), false);
    });

    test('soporte ve la operación y atiende consultas de cualquier cliente', async () => {
        const cliente = await conRol('rol.cli2', 'cliente');
        const soporte = await conRol('rol.sop2', 'soporte');
        const envio = await envioPagado(cliente);

        assert.equal((await api(`/api/envios/${envio.codigo}`, { token: soporte.token })).status, 200);
        const lista = await api('/api/envios', { token: soporte.token });
        assert.ok(lista.body.envios.some((e) => e.codigo === envio.codigo));
        assert.equal((await api('/api/pagos', { token: soporte.token })).status, 200);
        assert.equal((await api('/api/admin/usuarios', { token: soporte.token })).status, 200);

        const ticket = await api('/api/soporte/tickets', {
            metodo: 'POST',
            token: cliente.token,
            cuerpo: { asunto: 'Consulta por mi envío', categoria: 'envio_demorado', texto: 'Hola, ¿cuándo llega?' },
        });
        assert.equal(ticket.status, 201, JSON.stringify(ticket.body));
        const codigo = ticket.body.ticket.codigo;
        const respuesta = await api(`/api/soporte/tickets/${codigo}/mensajes`, { metodo: 'POST', token: soporte.token, cuerpo: { texto: 'Hoy a la tarde.' } });
        assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body));
        assert.equal(respuesta.body.mensaje.autor, 'admin', 'en el hilo figura como el equipo');
        assert.equal((await api(`/api/soporte/tickets/${codigo}/cerrar`, { metodo: 'POST', token: soporte.token })).status, 200);
        assert.equal((await api(`/api/soporte/tickets/${codigo}/cerrar`, { metodo: 'POST', token: cliente.token })).status, 403);
    });

    test('soporte no mueve plata, ni datos sensibles, ni roles', async () => {
        const cliente = await conRol('rol.cli3', 'cliente');
        const soporte = await conRol('rol.sop3', 'soporte');
        const envio = await envioPagado(cliente);

        assert.equal((await api(`/api/envios/${envio.codigo}/reembolsar`, { metodo: 'POST', token: soporte.token, cuerpo: {} })).status, 403);
        assert.equal((await api(`/api/envios/${envio.codigo}/archivar`, { metodo: 'POST', token: soporte.token, cuerpo: {} })).status, 403);
        assert.equal((await api(`/api/envios/${envio.codigo}/eventos`, { metodo: 'POST', token: soporte.token, cuerpo: { tipo: 'retirado', titulo: 'x' } })).status, 403);
        assert.equal((await api('/api/choferes/CH-XXXX/documentos', { token: soporte.token })).status, 403);
        assert.equal((await api(`/api/admin/usuarios/${cliente.perfil.id}/rol`, { metodo: 'PUT', token: soporte.token, cuerpo: { rol: 'admin' } })).status, 403);
        assert.equal((await api('/api/admin/reset', { metodo: 'POST', token: soporte.token })).status, 403);
        // Sí desbloquea un PIN y emite un cupón de compensación.
        assert.equal((await api(`/api/envios/${envio.codigo}/pin/desbloquear`, { metodo: 'POST', token: soporte.token })).status, 200);
        const cupon = await api('/api/cupones', { metodo: 'POST', token: soporte.token, cuerpo: { clienteId: cliente.perfil.id, descuentoPct: 10, motivo: 'Gesto por la demora' } });
        assert.equal(cupon.status, 201, JSON.stringify(cupon.body));
    });

    test('un cliente no ve lo ajeno', async () => {
        const a = await conRol('rol.a', 'cliente');
        const b = await conRol('rol.b', 'cliente');
        const envio = await envioPagado(a);
        assert.equal((await api(`/api/envios/${envio.codigo}`, { token: b.token })).status, 403);
        assert.equal((await api('/api/admin/usuarios', { token: b.token })).status, 403);
    });

    test('el admin cambia roles; el cambio cierra las sesiones de esa cuenta', async () => {
        const admin = await conRol('rol.adm', 'admin');
        const cliente = await conRol('rol.prom', 'cliente');
        const cambiar = (id, rol) => api(`/api/admin/usuarios/${id}/rol`, { metodo: 'PUT', token: admin.token, cuerpo: { rol } });

        const r = await cambiar(cliente.perfil.id, 'soporte');
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal((await pool.query('SELECT rol FROM usuarios WHERE id = $1', [cliente.perfil.id])).rows[0].rol, 'soporte');
        assert.equal((await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: cliente.refreshToken } })).status, 401);
        const nuevo = await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: cliente.usuario, contrasena: entorno.clave } });
        assert.equal(nuevo.body.usuario.rol, 'soporte');

        assert.equal((await cambiar(admin.perfil.id, 'cliente')).status, 409, 'no a sí mismo');
        assert.equal((await cambiar(cliente.perfil.id, 'chofer')).status, 400, 'chofer no se asigna por acá');
        assert.equal((await cambiar(999999, 'soporte')).status, 404);

        const chofer = await conRol('rol.ch', 'chofer');
        assert.equal((await cambiar(chofer.perfil.id, 'cliente')).status, 409, 'un chofer tiene ficha');
    });

    test('el personal no recupera la contraseña ni elimina la cuenta desde la app', async () => {
        const soporte = await conRol('rol.sop4', 'soporte');
        const nueva = `${entorno.clave}-2`;
        const r = await api('/api/auth/recuperar', { metodo: 'POST', cuerpo: { usuario: soporte.usuario, nueva, confirmacion: nueva } });
        assert.equal(r.status, 403);
        const baja = await api('/api/perfil/eliminar-cuenta', { metodo: 'POST', token: soporte.token, cuerpo: { contrasena: entorno.clave } });
        assert.equal(baja.status, 403);
    });
});
