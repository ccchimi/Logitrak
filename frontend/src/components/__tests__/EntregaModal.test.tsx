import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import EntregaModal from '../EntregaModal';
import { completarAsignacion } from '../../services/asignacionesService';
import * as ImagePicker from 'expo-image-picker';

jest.mock('../../services/asignacionesService', () => ({ completarAsignacion: jest.fn() }));
jest.mock('expo-image-picker', () => ({
    requestCameraPermissionsAsync: jest.fn(),
    launchCameraAsync: jest.fn(),
    launchImageLibraryAsync: jest.fn(),
}));

const completar = completarAsignacion as jest.Mock;
const picker = ImagePicker as unknown as Record<string, jest.Mock>;
const FOTO = { canceled: false, assets: [{ uri: 'file:///paquete.jpg', base64: 'Zm90bw==' }] };

async function abrir() {
    const onEntregado = jest.fn();
    await render(<EntregaModal visible asignacionCodigo="VJ-TRK-2026-000123" onCerrar={jest.fn()} onEntregado={onEntregado} />);
    return onEntregado;
}
const confirmar = () => screen.getByRole('button', { name: 'Confirmar entrega' });
const escribirPin = (texto: string) => fireEvent.changeText(screen.getByLabelText('PIN de entrega de 4 dígitos'), texto);

beforeEach(() => {
    jest.clearAllMocks();
    picker.launchImageLibraryAsync.mockResolvedValue(FOTO);
});

describe('EntregaModal', () => {
    test('no deja confirmar sin el PIN de 4 dígitos y la foto del paquete', async () => {
        await abrir();
        expect(confirmar()).toBeDisabled();
        await escribirPin('12a3');
        expect(screen.getByLabelText('PIN de entrega de 4 dígitos')).toHaveDisplayValue('123');
        await escribirPin('1234');
        expect(confirmar()).toBeDisabled();
        await fireEvent.press(screen.getByRole('button', { name: 'Elegir de la galería' }));
        expect(await screen.findByLabelText('Foto de comprobante')).toBeOnTheScreen();
        expect(confirmar()).toBeEnabled();
    });

    test('con PIN y foto entrega el envío', async () => {
        completar.mockResolvedValue({ exito: true });
        const onEntregado = await abrir();
        await escribirPin('4821');
        await fireEvent.press(screen.getByRole('button', { name: 'Elegir de la galería' }));
        await screen.findByLabelText('Foto de comprobante');
        await fireEvent.press(confirmar());
        expect(completar).toHaveBeenCalledWith('VJ-TRK-2026-000123', { pin: '4821', foto: 'Zm90bw==' });
        expect(onEntregado).toHaveBeenCalled();
    });

    test('con un PIN incorrecto avisa y lo borra; si se bloquea, no deja reintentar', async () => {
        completar.mockResolvedValueOnce({ exito: false, codigo: 'pin_incorrecto', error: 'El PIN no coincide. Te quedan 2 intentos.' });
        const onEntregado = await abrir();
        await escribirPin('0000');
        await fireEvent.press(screen.getByRole('button', { name: 'Elegir de la galería' }));
        await screen.findByLabelText('Foto de comprobante');
        await fireEvent.press(confirmar());
        expect(await screen.findByText('El PIN no coincide. Te quedan 2 intentos.')).toBeOnTheScreen();
        expect(screen.getByLabelText('PIN de entrega de 4 dígitos')).toHaveDisplayValue('');
        expect(onEntregado).not.toHaveBeenCalled();

        completar.mockResolvedValueOnce({ exito: false, codigo: 'pin_bloqueado', error: 'El PIN se bloqueó.' });
        await escribirPin('1111');
        await fireEvent.press(confirmar());
        expect(await screen.findByText('El PIN se bloqueó.')).toBeOnTheScreen();
        expect(confirmar()).toBeDisabled();
    });

    test('si no hay permiso de cámara lo explica', async () => {
        picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
        await abrir();
        await fireEvent.press(screen.getByRole('button', { name: 'Sacar foto' }));
        expect(await screen.findByText(/Necesitamos la cámara/)).toBeOnTheScreen();
        expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    });
});
