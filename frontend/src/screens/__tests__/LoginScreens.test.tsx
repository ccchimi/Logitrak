import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import LoginScreens from '../LoginScreens';
import { completarSegundoFactor, iniciarSesion } from '../../services/authService';

jest.mock('../../services/authService', () => ({ iniciarSesion: jest.fn(), completarSegundoFactor: jest.fn() }));

const iniciar = iniciarSesion as jest.Mock;
const segundo = completarSegundoFactor as jest.Mock;
const ADMIN = { id: 7, usuario: 'ana.admin', rol: 'admin', nombreCompleto: 'Ana Admin', chofer: null, dobleFactor: true };

async function abrir() {
    const navigation = { navigate: jest.fn(), reset: jest.fn() };
    await render(<LoginScreens navigation={navigation} />);
    return navigation;
}
async function ingresar(usuario: string, contrasena: string) {
    await fireEvent.changeText(screen.getByLabelText('Email o usuario'), usuario);
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), contrasena);
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

beforeEach(() => jest.clearAllMocks());

describe('LoginScreens', () => {
    test('con usuario y contraseña correctos entra a su pantalla según el rol', async () => {
        iniciar.mockResolvedValue({ exito: true, usuario: { ...ADMIN, dobleFactor: false } });
        const navigation = await abrir();
        await ingresar('ana.admin', 'Clave-segura-1');
        expect(iniciar).toHaveBeenCalledWith('ana.admin', 'Clave-segura-1');
        expect(navigation.navigate).toHaveBeenCalledWith('Home', expect.objectContaining({ rol: 'admin' }));
    });

    test('si los datos no son correctos muestra el error y no entra', async () => {
        iniciar.mockResolvedValue({ exito: false, error: 'Usuario o contraseña incorrectos.' });
        const navigation = await abrir();
        await ingresar('ana.admin', 'otra');
        expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeOnTheScreen();
        expect(navigation.navigate).not.toHaveBeenCalled();
    });

    test('con la verificación en dos pasos pide el código y recién ahí entra', async () => {
        iniciar.mockResolvedValue({ exito: true, requiereSegundoFactor: true, desafio: 'desafio-firmado', nombre: 'Ana Admin' });
        segundo.mockResolvedValue({ exito: true, usuario: ADMIN });
        const navigation = await abrir();
        await ingresar('ana.admin', 'Clave-segura-1');

        expect(await screen.findByText('Verificación en dos pasos')).toBeOnTheScreen();
        expect(navigation.navigate).not.toHaveBeenCalled();

        // Un código incompleto se frena en la app, sin llamar al servidor.
        await fireEvent.changeText(screen.getByLabelText('Código de verificación'), '123');
        await fireEvent.press(screen.getByRole('button', { name: 'Verificar e ingresar' }));
        expect(await screen.findByText('Ingresá los 6 dígitos de tu app o un código de respaldo.')).toBeOnTheScreen();
        expect(segundo).not.toHaveBeenCalled();

        // Pegado con espacios también sirve.
        await fireEvent.changeText(screen.getByLabelText('Código de verificación'), '123 456');
        await fireEvent.press(screen.getByRole('button', { name: 'Verificar e ingresar' }));
        expect(segundo).toHaveBeenCalledWith('desafio-firmado', '123456');
        expect(navigation.navigate).toHaveBeenCalledWith('Home', expect.objectContaining({ rol: 'admin' }));
    });

    test('si el código venció vuelve a pedir la contraseña', async () => {
        iniciar.mockResolvedValue({ exito: true, requiereSegundoFactor: true, desafio: 'viejo', nombre: 'Ana Admin' });
        segundo.mockResolvedValue({ exito: false, codigo: 'desafio_vencido', error: 'Pasaron más de 5 minutos. Volvé a ingresar tu contraseña.' });
        await abrir();
        await ingresar('ana.admin', 'Clave-segura-1');
        await fireEvent.changeText(await screen.findByLabelText('Código de verificación'), '654321');
        await fireEvent.press(screen.getByRole('button', { name: 'Verificar e ingresar' }));
        expect(await screen.findByText(/Pasaron más de 5 minutos/)).toBeOnTheScreen();
        expect(screen.queryByLabelText('Código de verificación')).toBeNull();
        expect(screen.getByLabelText('Contraseña')).toBeOnTheScreen();
    });
});
