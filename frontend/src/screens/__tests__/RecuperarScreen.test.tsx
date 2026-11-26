import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import RecuperarScreen from '../RecuperarScreen';
import { pedirRecuperacion } from '../../services/authService';

jest.mock('../../services/authService', () => ({ pedirRecuperacion: jest.fn() }));
jest.mock('../../components/AuthFrame', () => ({ children }: { children: React.ReactNode }) => children);

const pedir = pedirRecuperacion as jest.Mock;
const MENSAJE = 'Recibimos tu pedido. Si el usuario existe, el equipo de soporte te va a contactar.';

beforeEach(() => jest.clearAllMocks());

describe('RecuperarScreen', () => {
    test('manda el pedido a soporte con el usuario y el contacto, sin pedir una contraseña', async () => {
        pedir.mockResolvedValue({ exito: true, mensaje: MENSAJE });
        await render(<RecuperarScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);
        expect(screen.queryByLabelText(/contraseña/i)).toBeNull();

        await fireEvent.changeText(screen.getByLabelText('Usuario'), ' Ana.Perez ');
        await fireEvent.changeText(screen.getByLabelText('Email o teléfono de contacto'), 'ana@mail.com');
        await fireEvent.press(screen.getByRole('button', { name: 'Pedir ayuda a soporte' }));

        expect(pedir).toHaveBeenCalledWith('ana.perez', 'ana@mail.com', '');
        expect(await screen.findByText(MENSAJE)).toBeOnTheScreen();
        expect(screen.getByRole('button', { name: 'Pedir ayuda a soporte' })).toBeDisabled();
    });

    test('sin contacto no manda nada', async () => {
        await render(<RecuperarScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);
        await fireEvent.changeText(screen.getByLabelText('Usuario'), 'ana');
        await fireEvent.press(screen.getByRole('button', { name: 'Pedir ayuda a soporte' }));
        expect(await screen.findByRole("alert")).toHaveTextContent(/un email o teléfono/);
        expect(pedir).not.toHaveBeenCalled();
    });
});
