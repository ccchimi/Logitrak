const plano = new Map<string, string>();
const llavero = new Map<string, string>();
let llaveroFalla = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn(async (k: string) => plano.get(k) ?? null),
        setItem: jest.fn(async (k: string, v: string) => void plano.set(k, v)),
        removeItem: jest.fn(async (k: string) => void plano.delete(k)),
    },
}));

jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(async (k: string) => {
        if (llaveroFalla) throw new Error('sin llavero');
        return llavero.get(k) ?? null;
    }),
    setItemAsync: jest.fn(async (k: string, v: string) => {
        if (llaveroFalla) throw new Error('sin llavero');
        llavero.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => void llavero.delete(k)),
}));

const plataforma = { OS: 'android' };
jest.mock('react-native', () => ({ Platform: plataforma }));

type Modulo = typeof import('../almacenamiento');
function cargar(os: string): Modulo {
    plataforma.OS = os;
    let modulo!: Modulo;
    jest.isolateModules(() => {
        modulo = require('../almacenamiento');
    });
    return modulo;
}

beforeEach(() => {
    plano.clear();
    llavero.clear();
    llaveroFalla = false;
});

describe('Secretos de la sesión en el teléfono', () => {
    test('se guardan en el llavero y nunca en el almacenamiento común', async () => {
        const a = cargar('android');
        await a.guardarSecreto('logitrak.refresh', 'r-1');

        expect(a.usaLlavero()).toBe(true);
        expect(llavero.get('logitrak.refresh')).toBe('r-1');
        expect(plano.has('logitrak.refresh')).toBe(false);
        expect(await a.leerSecreto('logitrak.refresh')).toBe('r-1');
    });

    test('una sesión guardada por una versión anterior pasa al llavero y se borra la copia en claro', async () => {
        plano.set('logitrak.refresh', 'r-viejo');
        const a = cargar('ios');

        expect(await a.leerSecreto('logitrak.refresh')).toBe('r-viejo');
        expect(llavero.get('logitrak.refresh')).toBe('r-viejo');
        expect(plano.has('logitrak.refresh')).toBe(false);
    });

    test('borrar limpia el llavero y cualquier copia vieja', async () => {
        llavero.set('logitrak.token', 't');
        plano.set('logitrak.token', 't-viejo');
        const a = cargar('android');

        await a.borrarSecreto('logitrak.token');
        expect(llavero.has('logitrak.token')).toBe(false);
        expect(plano.has('logitrak.token')).toBe(false);
    });

    test('si el llavero falla no deja el secreto en claro', async () => {
        plano.set('logitrak.refresh', 'r-anterior');
        llaveroFalla = true;
        const a = cargar('android');

        await a.guardarSecreto('logitrak.refresh', 'r-nuevo');
        expect(plano.has('logitrak.refresh')).toBe(false);
        expect(await a.leerSecreto('logitrak.refresh')).toBeNull();
    });
});

describe('Secretos de la sesión en la web', () => {
    test('sin llavero, usan el almacenamiento del navegador', async () => {
        const a = cargar('web');
        await a.guardarSecreto('logitrak.refresh', 'r-web');

        expect(a.usaLlavero()).toBe(false);
        expect(plano.get('logitrak.refresh')).toBe('r-web');
        expect(llavero.size).toBe(0);
        expect(await a.leerSecreto('logitrak.refresh')).toBe('r-web');
        await a.borrarSecreto('logitrak.refresh');
        expect(plano.has('logitrak.refresh')).toBe(false);
    });
});
