import { limpiarEvento, sinQuery } from '../filtro';

describe('limpiarEvento', () => {
    it('quita cuerpo, cookies, query y encabezados privados', () => {
        const e = limpiarEvento({
            request: {
                data: { contrasena: 'x' },
                cookies: 'a=1',
                query_string: 'origenLat=-34.5',
                headers: { Authorization: 'Bearer t', 'X-Logitrak-Sesion': 'refresh', Accept: 'json' },
            },
        });
        expect(e.request?.data).toBeUndefined();
        expect(e.request?.cookies).toBeUndefined();
        expect(e.request?.query_string).toBeUndefined();
        expect(e.request?.headers).toEqual({ Authorization: '[oculto]', 'X-Logitrak-Sesion': '[oculto]', Accept: 'json' });
    });

    it('del usuario deja solo el id', () => {
        expect(limpiarEvento({ user: { id: 7, email: 'ana@mail.com', ip_address: '1.2.3.4' } }).user).toEqual({ id: '7' });
        expect(limpiarEvento({ user: { email: 'ana@mail.com' } }).user).toBeNull();
    });

    it('saca la query de las URL de las migas', () => {
        const e = limpiarEvento({
            breadcrumbs: [{ data: { url: 'https://api/x/api/recorridos?origenLat=-34.5&origenLng=-58.4', method: 'GET' } }],
        });
        expect(e.breadcrumbs?.[0].data?.url).toBe('https://api/x/api/recorridos');
    });
});

describe('sinQuery', () => {
    it('deja la ruta sin parámetros', () => {
        expect(sinQuery('/api/envios?estado=pendiente')).toBe('/api/envios');
        expect(sinQuery('/api/envios')).toBe('/api/envios');
    });
});
