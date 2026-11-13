import { cerrarSesion, guardarSesion, hayToken, llamarApi, obtenerUsuarioSesion } from '../api';
import { borrar } from '../almacenamiento';

jest.mock('react-native', () => ({
    NativeModules: {},
    Platform: { OS: 'web' },
}));

jest.mock('../almacenamiento', () => ({
    borrar: jest.fn(),
    guardar: jest.fn(),
    guardarJson: jest.fn(),
    leer: jest.fn(),
    leerJson: jest.fn(),
}));

jest.mock('../monitoreo', () => ({
    identificarUsuario: jest.fn(),
    registrarFallaApi: jest.fn(),
}));

const fetchOriginal = global.fetch;

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    global.fetch = fetchOriginal;
    jest.useRealTimers();
});

test('termina una solicitud sin respuesta y permite una nueva solicitud', async () => {
    const fetchSimulado = jest.fn().mockImplementation((_url, opciones) =>
        new Promise((_resolve, reject) => {
            opciones.signal.addEventListener('abort', () => reject(new Error('Abortado')));
        })
    );
    global.fetch = fetchSimulado;

    const solicitud = llamarApi('/api/auth/registro', {
        metodo: 'POST',
        cuerpo: { usuario: 'prueba' },
    });
    await jest.advanceTimersByTimeAsync(60000);

    expect(await solicitud).toEqual({
        exito: false,
        sinConexion: true,
        error: 'El servidor tardó demasiado en responder. Intentá nuevamente en unos instantes.',
    });
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);

    fetchSimulado.mockResolvedValue({ json: async () => ({ exito: true }) });
    expect(await llamarApi('/api/salud')).toEqual({ exito: true });
    expect(jest.getTimerCount()).toBe(0);
});

test('conserva los errores de validación del backend y limpia el temporizador', async () => {
    global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ exito: false, error: 'El usuario ya existe.' }),
    });

    expect(await llamarApi('/api/auth/registro')).toEqual({
        exito: false,
        error: 'El usuario ya existe.',
    });
    expect(jest.getTimerCount()).toBe(0);
});

test('cerrar sesión limpia autenticación y navegación persistida', () => {
    guardarSesion('token-prueba', { id: 1, usuario: 'prueba', rol: 'cliente', nombreCompleto: 'Cuenta prueba', chofer: null });
    expect(hayToken()).toBe(true);
    cerrarSesion();
    expect(hayToken()).toBe(false);
    expect(obtenerUsuarioSesion()).toBeNull();
    for (const clave of ['logitrak.token', 'logitrak.refresh', 'logitrak.usuario', 'logitrak.navegacion']) expect(borrar).toHaveBeenCalledWith(clave);
});

const usuario = { id: 1, usuario: 'prueba', rol: 'cliente' as const, nombreCompleto: 'Prueba', chofer: null };
const tokenVencido = () => ({ status: 401, json: async () => ({ exito: false, codigo: 'token_vencido' }) });

test('renueva el token vencido y reintenta el pedido con el token nuevo', async () => {
    guardarSesion('viejo', usuario, 'refresh1');
    const llamar = jest.fn()
        .mockResolvedValueOnce(tokenVencido())
        .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'nuevo', refreshToken: 'refresh2', usuario }) })
        .mockResolvedValueOnce({ status: 200, json: async () => ({ exito: true }) });
    global.fetch = llamar;
    expect(await llamarApi('/api/admin/usuarios', { conAuth: true })).toEqual({ exito: true });
    expect(llamar.mock.calls[1][0]).toMatch(/\/api\/auth\/refresh$/);
    expect(llamar.mock.calls[2][1].headers.Authorization).toBe('Bearer nuevo');
    expect(jest.getTimerCount()).toBe(0);
    cerrarSesion();
});

test('el límite de espera también cubre la renovación y conserva la sesión', async () => {
    guardarSesion('viejo', usuario, 'refresh1');
    global.fetch = jest.fn().mockResolvedValueOnce(tokenVencido())
        .mockImplementationOnce((_url, opciones) => new Promise((_resolve, reject) => {
            opciones.signal.addEventListener('abort', () => reject(new Error('Abortado')));
        }));
    const pedido = llamarApi('/api/perfil/resumen', { conAuth: true });
    await jest.advanceTimersByTimeAsync(60000);
    expect(await pedido).toMatchObject({ exito: false, sinConexion: true, error: expect.stringContaining('demasiado') });
    expect(hayToken()).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
    cerrarSesion();
});

test('no repite la eliminación de cuenta si el servidor rechaza la contraseña', async () => {
    guardarSesion('actual', usuario, 'refresh1');
    const rechazo = { exito: false, error: 'La contraseña no es correcta.' };
    global.fetch = jest.fn().mockResolvedValue({ status: 401, json: async () => rechazo });
    expect(await llamarApi('/api/perfil/eliminar-cuenta', { metodo: 'POST', conAuth: true })).toEqual(rechazo);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    cerrarSesion();
});
