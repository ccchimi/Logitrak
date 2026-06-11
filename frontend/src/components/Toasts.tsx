import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type TipoToast = 'exito' | 'info' | 'alerta' | 'error';

export interface ToastItem {
    id: number;
    tipo: TipoToast;
    titulo: string;
    detalle?: string;
}

const DURACION_MS = 4200;

let proximoId = 1;

export function useToasts() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const cerrar = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }, []);

    const mostrar = useCallback(
        (tipo: TipoToast, titulo: string, detalle?: string) => {
            const id = proximoId++;
            setToasts((prev) => [...prev.slice(-2), { id, tipo, titulo, detalle }]);
            timersRef.current.set(
                id,
                setTimeout(() => cerrar(id), DURACION_MS)
            );
            return id;
        },
        [cerrar]
    );

    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach((t) => clearTimeout(t));
            timers.clear();
        };
    }, []);

    return { toasts, mostrar, cerrar };
}

const ICONOS: Record<TipoToast, string> = {
    exito: '✓',
    info: 'ℹ',
    alerta: '⚠',
    error: '✕',
};

const ACENTOS: Record<TipoToast, string> = {
    exito: '#10B981',
    info: '#FFD700',
    alerta: '#F59E0B',
    error: '#EF4444',
};

function ToastCard({ toast, onCerrar }: { toast: ToastItem; onCerrar: (id: number) => void }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.back(1.4)),
            useNativeDriver: true,
        }).start();
    }, [anim]);

    const acento = ACENTOS[toast.tipo];

    return (
        <Animated.View
            style={[
                estilos.card,
                {
                    opacity: anim,
                    transform: [
                        {
                            translateY: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-16, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <View style={[estilos.icono, { backgroundColor: `${acento}22`, borderColor: `${acento}55` }]}>
                <Text style={[estilos.iconoTexto, { color: acento }]}>{ICONOS[toast.tipo]}</Text>
            </View>

            <View style={estilos.textos}>
                <Text style={estilos.titulo}>{toast.titulo}</Text>
                {toast.detalle ? <Text style={estilos.detalle}>{toast.detalle}</Text> : null}
            </View>

            <TouchableOpacity
                onPress={() => onCerrar(toast.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Text style={estilos.cerrar}>✕</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

export function ToastStack({
    toasts,
    onCerrar,
    topOffset = 16,
}: {
    toasts: ToastItem[];
    onCerrar: (id: number) => void;
    topOffset?: number;
}) {
    if (toasts.length === 0) return null;

    return (
        <View pointerEvents="box-none" style={[estilos.stack, { top: topOffset }]}>
            {toasts.map((toast) => (
                <ToastCard key={toast.id} toast={toast} onCerrar={onCerrar} />
            ))}
        </View>
    );
}

const estilos = StyleSheet.create({
    stack: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 1000,
        alignItems: 'center',
        gap: 8,
    },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        maxWidth: 440,
        backgroundColor: 'rgba(14, 14, 14, 0.96)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 18,
        elevation: 10,
    },

    icono: {
        width: 32,
        height: 32,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    iconoTexto: {
        fontSize: 15,
        fontWeight: '900',
    },

    textos: { flex: 1 },

    titulo: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'DMSans_700Bold',
    },

    detalle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        lineHeight: 16,
        fontFamily: 'DMSans_400Regular',
        marginTop: 1,
    },

    cerrar: {
        color: 'rgba(255, 255, 255, 0.45)',
        fontSize: 13,
        fontWeight: '900',
        paddingHorizontal: 2,
    },
});