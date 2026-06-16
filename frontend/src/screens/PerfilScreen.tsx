import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './PerfilStyles';
import { obtenerUsuarioSesion } from '../services/authService';
import { obtenerResumenPerfil, ResumenPerfil } from '../services/perfilService';
import { Cupon, listarCupones } from '../services/cuponesService';

const ETIQUETA_CUENTA: Record<string, string> = {
    admin: 'Cuenta Administrador',
    cliente: 'Cuenta Cliente',
    chofer: 'Cuenta Chofer',
};

export default function PerfilScreen({ navigation }: any) {
    const sesion = obtenerUsuarioSesion();
    const [resumen, setResumen] = useState<ResumenPerfil | null>(null);
    const [cupones, setCupones] = useState<Cupon[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let activo = true;
        Promise.all([obtenerResumenPerfil(), listarCupones()]).then(([r, c]) => {
            if (!activo) return;
            setResumen(r);
            setCupones(c);
            setCargando(false);
        });
        return () => {
            activo = false;
        };
    }, []);

    const nombre = resumen?.nombreCompleto ?? sesion?.nombreCompleto ?? 'Mi cuenta';
    const usuario = resumen?.usuario ?? sesion?.usuario ?? '';
    const rol = resumen?.rol ?? sesion?.rol ?? 'cliente';

    const iniciales = useMemo(
        () =>
            nombre
                .split(' ')
                .map((p) => p.charAt(0))
                .slice(0, 2)
                .join('')
                .toUpperCase(),
        [nombre]
    );

    const Encabezado = (
        <>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    accessibilityRole="button"
                    accessibilityLabel="Volver"
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>

                <View style={styles.headerTextos}>
                    <Text style={styles.eyebrow}>Mi cuenta</Text>
                    <Text style={styles.titulo}>Perfil</Text>
                </View>
            </View>

            <View style={styles.tarjetaUsuario}>
                <View style={styles.avatarCirculo}>
                    <Text style={styles.avatarTexto}>{iniciales}</Text>
                </View>

                <Text style={styles.nombre}>{nombre}</Text>

                <View style={styles.cuentaPill}>
                    <Text style={styles.cuentaPillTexto}>{ETIQUETA_CUENTA[rol] ?? 'Cuenta'}</Text>
                </View>

                {usuario ? <Text style={styles.detalle}>Usuario: @{usuario}</Text> : null}
                <Text style={styles.detalle}>
                    Miembro desde {resumen?.clienteDesde ?? new Date().getFullYear()}
                </Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCaja}>
                    <Text style={styles.statValor}>{cargando ? '—' : resumen?.enviosTotales ?? 0}</Text>
                    <Text style={styles.statLabel}>Envíos totales</Text>
                </View>
                <View style={styles.statCaja}>
                    <Text style={styles.statValor}>{cargando ? '—' : resumen?.cuponesActivos ?? cupones.length}</Text>
                    <Text style={styles.statLabel}>Cupones activos</Text>
                </View>
                <View style={styles.statCaja}>
                    <Text style={styles.statValor}>{cargando ? '—' : resumen?.enviosEntregados ?? 0}</Text>
                    <Text style={styles.statLabel}>Entregados</Text>
                </View>
            </View>

            <Text style={styles.seccionTitulo}>🎟️ Cupones de compensación</Text>
            <Text style={styles.seccionSub}>
                Créditos emitidos automáticamente cuando un envío excede su SLA.
            </Text>
        </>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <FlatList
                    data={cupones}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={Encabezado}
                    ListEmptyComponent={
                        cargando ? (
                            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                                <ActivityIndicator color="#FFD700" />
                            </View>
                        ) : (
                            <View style={{ paddingVertical: 24, alignItems: 'center', paddingHorizontal: 24 }}>
                                <Text style={[styles.seccionSub, { textAlign: 'center' }]}>
                                    No tenés cupones por ahora. Aparecen solos si un envío excede su SLA.
                                </Text>
                            </View>
                        )
                    }
                    renderItem={({ item }) => (
                        <View style={styles.tarjetaCupon}>
                            <View style={styles.cuponHeader}>
                                <Text style={styles.cuponCodigo}>CÓDIGO: {item.codigo}</Text>
                                <Text style={styles.cuponDescuento}>{item.descuentoPct}% OFF</Text>
                            </View>
                            <Text style={styles.cuponMotivo}>{item.motivo}</Text>
                        </View>
                    )}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
}
