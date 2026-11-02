import React from 'react';
import { Animated, View } from 'react-native';
import { styles } from '../../styles/SolicitudEnvioStyles';

export type PulsoBoxy = {
    opacity: Animated.AnimatedInterpolation<number>;
    scale: Animated.AnimatedInterpolation<number>;
};

export default function AvatarBoxy({ pulso }: { pulso: PulsoBoxy }) {
    return (
        <View style={styles.boxyLogoWrapper}>
            <Animated.View
                style={[
                    styles.boxyPulseGlow,
                    {
                        opacity: pulso.opacity,
                        transform: [{ scale: pulso.scale }],
                    },
                ]}
            />

            <View style={styles.boxyAuraCore} />
        </View>
    );
}
