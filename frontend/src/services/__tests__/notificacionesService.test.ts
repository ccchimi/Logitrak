// La regla no usa la API: se mockea para no cargar react-native.
jest.mock('../api', () => ({ llamarApi: jest.fn() }));

import { destinoDeNotificacion } from '../notificacionesService';

describe('destinoDeNotificacion', () => {
    it('una notificación de un envío abre su detalle', () => {
        expect(destinoDeNotificacion({ tipo: 'pago.aprobado', envioCodigo: 'TRK-1' }, 'cliente')).toEqual({
            ruta: 'DetalleEnvio',
            params: { codigo: 'TRK-1' },
        });
    });

    it('una oferta nueva lleva al chofer a sus ofertas', () => {
        expect(destinoDeNotificacion({ tipo: 'oferta.disponible', envioCodigo: 'TRK-2' }, 'chofer')).toEqual({ ruta: 'Chofer' });
    });

    it('un pedido eliminado no abre un detalle que ya no existe', () => {
        expect(destinoDeNotificacion({ tipo: 'envio.eliminado_sin_pago', envioCodigo: 'TRK-3' }, 'cliente').ruta).toBe('Notificaciones');
    });

    it('sin datos va a la bandeja', () => {
        expect(destinoDeNotificacion(null, 'cliente')).toEqual({ ruta: 'Notificaciones' });
    });
});
