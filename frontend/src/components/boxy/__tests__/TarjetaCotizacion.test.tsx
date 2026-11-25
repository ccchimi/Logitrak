import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TarjetaCotizacion from '../TarjetaCotizacion';
import { cotizarSync } from '../../../services/botLogistica/tarifas';
import type { Cotizacion } from '../../../services/botLogistica';

// La tarjeta se prueba con una cotización real de Boxy, no con datos inventados:
// si cambia el cotizador, la pantalla tiene que seguir mostrándolo bien.
function cotizacionDeHelado(): Cotizacion {
    const r = cotizarSync({
        origen: 'Cabildo 2000, Belgrano',
        destino: 'Rivadavia 5000, Caballito',
        descripcionCarga: 'helado congelado',
        pesoKg: 3,
        bultos: 1,
        fecha: new Date('2026-11-25T15:00:00-03:00'),
    });
    if (!r.exito) throw new Error('la cotización de prueba debería ser válida');
    return r.cotizacion;
}

describe('TarjetaCotizacion', () => {
    test('muestra el vehículo, el precio, el desglose y los requisitos de la carga', async () => {
        const c = cotizacionDeHelado();
        await render(<TarjetaCotizacion resultado={c} confirmando={false} onConfirmar={jest.fn()} />);

        expect(screen.getByText('Utilitario liviano')).toBeOnTheScreen();
        expect(screen.getByText(`$${Math.round(c.precio).toLocaleString('es-AR')}`)).toBeOnTheScreen();
        for (const linea of c.desglose) expect(screen.getAllByText(linea.concepto).length).toBeGreaterThan(0);
        for (const requisito of c.carga.requisitos) expect(screen.getByText(`• ${requisito}`)).toBeOnTheScreen();
        expect(screen.getByText(new RegExp(`Ref\\. ${c.id}`))).toBeOnTheScreen();
    });

    test('al confirmar entrega la misma cotización', async () => {
        const c = cotizacionDeHelado();
        const onConfirmar = jest.fn();
        await render(<TarjetaCotizacion resultado={c} confirmando={false} onConfirmar={onConfirmar} />);
        await fireEvent.press(screen.getByRole('button', { name: 'Confirmar y Solicitar Chofer' }));
        expect(onConfirmar).toHaveBeenCalledWith(c);
    });

    test('mientras registra el envío no deja confirmar dos veces', async () => {
        const onConfirmar = jest.fn();
        await render(<TarjetaCotizacion resultado={cotizacionDeHelado()} confirmando onConfirmar={onConfirmar} />);
        const boton = screen.getByRole('button', { name: 'Registrando envío…' });
        expect(boton).toBeDisabled();
        await fireEvent.press(boton);
        expect(onConfirmar).not.toHaveBeenCalled();
    });
});
