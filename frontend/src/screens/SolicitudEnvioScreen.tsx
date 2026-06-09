import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { styles } from './SolicitudEnvioStyles';
import InputTexto from '../components/InputTexto';
import { TEMA } from '../theme/colores';
import { calcularEnvioConGemini } from '../services/geminiService'; // Importamos el servicio de IA

export default function SolicitudEnvioScreen({ navigation }: any) {
    const [origen, setOrigen] = useState('');
    const [destino, setDestino] = useState('');
    const [peso, setPeso] = useState('');
    const [bultos, setBultos] = useState('');

    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false); // Estado para controlar el spinner de carga
    const [resultadoIA, setResultadoIA] = useState<any>(null);

    const procesarEnvioInteligente = async () => {
        if (!origen || !destino || !peso || !bultos) {
            setError('Por favor completa todos los campos requeridos.');
            setResultadoIA(null);
            return;
        }

        setError('');
        setCargando(true);
        setResultadoIA(null);

        const respuestaIA = await calcularEnvioConGemini(peso, bultos, origen, destino);

        setResultadoIA({
            vehiculo: respuestaIA.vehiculo,
            precio: respuestaIA.precio,
            explicacion: respuestaIA.explicacion,
            sla: 'Garantía: Llegada en menos de 20 min al origen o cupón de descuento.'
        });

        setCargando(false);
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

                <TouchableOpacity
                    style={[styles.botonCalcular, { backgroundColor: cargando ? '#94A3B8' : TEMA.colores.primario }]}
                    onPress={procesarEnvioInteligente}
                    disabled={cargando}
                >
                    {cargando ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.botonTexto}>Calcular Envío Inteligente</Text>
                    )}
                </TouchableOpacity>
            </View>

            {resultadoIA && (
                <View style={styles.resultadoCard}>
                    <Text style={styles.resultadoTitulo}>🤖 Analizado por Gemini AI:</Text>
                    <Text style={styles.resultadoDetalle}>• Unidad Sugerida: {resultadoIA.vehiculo}</Text>
                    <Text style={styles.resultadoDetalle}>• Cotización Dinámica: ${resultadoIA.precio}</Text>
                    <Text style={[styles.resultadoDetalle, { fontStyle: 'italic', color: '#475569', marginTop: 3 }]}>
                        💬 "{resultadoIA.explicacion}"
                    </Text>
                    <Text style={[styles.resultadoDetalle, {fontWeight: 'bold', color: '#10B981', marginTop: 8, marginBottom: 10}]}>
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