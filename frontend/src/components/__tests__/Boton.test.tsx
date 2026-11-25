import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Boton from '../Boton';

describe('Boton', () => {
    test('muestra el texto y avisa al tocarlo', async () => {
        const alTocar = jest.fn();
        await render(<Boton texto="Confirmar envío" onPress={alTocar} />);
        await fireEvent.press(screen.getByRole('button', { name: 'Confirmar envío' }));
        expect(alTocar).toHaveBeenCalledTimes(1);
    });

    test('mientras está ocupado no se puede tocar y lo anuncia', async () => {
        const alTocar = jest.fn();
        await render(<Boton texto="Pagar" ocupado onPress={alTocar} />);
        const boton = screen.getByRole('button', { name: 'Pagar' });
        await fireEvent.press(boton);
        expect(alTocar).not.toHaveBeenCalled();
        expect(boton).toBeBusy();
        expect(boton).toBeDisabled();
    });
});
