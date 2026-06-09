import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { styles } from './SolicitudEnvioStyles';
import InputTexto from '../components/InputTexto';
import { TEMA } from '../theme/colores';

export default function SolicitudEnvioScreen({ navigation }: any) { // <-- Agregamos navigation
    const [origen, setOrigen] = useState('');
    const [destino, setDestino] = useState('');
    const [peso, setPeso] = useState('');
    const [bultos, setBultos] = useState('');

    const [error, setError] = useState('');
    const [resultadoIA, setResultadoIA] = useState<any>(null);

    const procesarEnvioInteligente = () => {
        if (!origen || !destino || !peso || !bultos) {
            setError('Por favor completa todos los campos requeridos.');
            setResultadoIA(null);
            return;
        }

        setError('');
        const pesoNum = parseFloat(peso);

        let vehiculoAsignado = 'Auto Utilitario';
        let precioEstimado = 3500;

        if (pesoNum <= 5) {
            vehiculoAsignado = 'Motomensajería (Inmediato)';
            precioEstimado = 1200 * parseInt(bultos);
        } else if (pesoNum > 50) {
            vehiculoAsignado = 'Camión de Carga Pesada';
            precioEstimado = 8500 + (pesoNum * 20);
        } else {
            vehiculoAsignado = 'Furgoneta / Auto';
            precioEstimado = 3200 + (pesoNum * 50);
        }

        setResultadoIA({
            vehiculo: vehiculoAsignado,
            precio: precioEstimado,
            sla: 'Garantía: Llegada en menos de 20 min al origen'
        });
    };

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.formulario}>
                {error ? <Text style={styles.errorTexto}>{error}</Text> : null}

                <InputTexto
                    label="Punto de Retiro (Origen)"
                    placeholder="Ej: Av. Rivadavia 5000, CABA"
                    value={origen}
                    onChangeText={setOrigen}
                />

                <InputTexto
                    label="Punto de Entrega (Destino)"
                    placeholder="Ej: Av. Corrientes 1200, CABA"
                    value={destino}
                    onChangeText={setDestino}
                />

                <View style={styles.fila}>
                    <View style={styles.columnaMedio}>
                        <InputTexto
                            label="Peso Total (Kg)"
                            placeholder="Ej: 8"
                            value={peso}
                            onChangeText={setPeso}
                        />
                    </View>
                    <View style={styles.columnaMedio}>
                        <InputTexto
                            label="Cantidad Bultos"
                            placeholder="Ej: 2"
                            value={bultos}
                            onChangeText={setBultos}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.botonCalcular} onPress={procesarEnvioInteligente}>
                    <Text style={styles.botonTexto}>Calcular Envío Inteligente</Text>
                </TouchableOpacity>
            </View>

            {resultadoIA && (
                <View style={styles.resultadoCard}>
                    <Text style={styles.resultadoTitulo}>🤖 Asignación de Flota Automática:</Text>
                    <Text style={styles.resultadoDetalle}>• Vehículo Sugerido: {resultadoIA.vehiculo}</Text>
                    <Text style={styles.resultadoDetalle}>• Cotización Final: ${resultadoIA.precio}</Text>
                    <Text style={[styles.resultadoDetalle, {fontWeight: 'bold', color: '#10B981', marginTop: 5, marginBottom: 10}]}>
                        ⏱️ {resultadoIA.sla}
                    </Text>

                    <TouchableOpacity
                        style={localStyles.botonConfirmar}
                        onPress={() => navigation.navigate('Seguimiento')}
                    >
                        <Text style={localStyles.botonConfirmarTexto}>Confirmar y Solicitar Chofer</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const localStyles = StyleSheet.create({
    botonConfirmar: {
        backgroundColor: '#10B981',
        height: 45,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
    },
    botonConfirmarTexto: {
        color: TEMA.colores.blanco,
        fontSize: 15,
        fontWeight: 'bold',
    }
});