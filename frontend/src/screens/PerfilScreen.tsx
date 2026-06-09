import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { styles } from './PerfilStyles';

interface Cupon {
    id: string;
    codigo: string;
    descuento: string;
    motivo: string;
}

export default function PerfilScreen() {

    const usuarioInfo = {
        nombre: 'Franco Schimizzi',
        cuenta: 'Cuenta Empresa (B2B)',
        legajo: 'LEG-99421',
        email: 'franco.schimizzi@logitrack.com'
    };

    const cuponesMock: Cupon[] = [
        { id: 'c1', codigo: 'SLA-INCUMP-054', descuento: '25% OFF', motivo: 'Compensación: Demora de arribo de 8 min excedida.' },
        { id: 'c2', codigo: 'SLA-INCUMP-102', descuento: '15% OFF', motivo: 'Compensación: Demora por congestión de tráfico pesado.' },
    ];

    return (
        <View style={styles.container}>
            {/* Tarjeta de Información del Usuario */}
            <View style={styles.tarjetaUsuario}>
                <Text style={styles.avatar}>🏢</Text>
                <Text style={styles.nombre}>{usuarioInfo.nombre}</Text>
                <Text style={styles.detalle}>{usuarioInfo.cuenta}</Text>
                <Text style={[styles.detalle, { color: '#64748B' }]}>Legajo: {usuarioInfo.legajo}</Text>
                <Text style={styles.detalle}>{usuarioInfo.email}</Text>
            </View>

            <Text style={styles.seccionTitulo}>🎟️ Mis Cupones de Compensación (SLA)</Text>

            <FlatList
                data={cuponesMock}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.tarjetaCupon}>
                        <View style={styles.cuponHeader}>
                            <Text style={styles.cuponCodigo}>CÓDIGO: {item.codigo}</Text>
                            <Text style={styles.cuponDescuento}>{item.descuento}</Text>
                        </View>
                        <Text style={styles.cuponMotivo}>{item.motivo}</Text>
                    </View>
                )}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}