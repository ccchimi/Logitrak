import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { styles } from '../screens/LoginStyles';

const NUM_BARS = 50;
const ACTIVE_TRAIL = 8;

export default function SpinnerFondo() {
    const [activeBar, setActiveBar] = useState(0);
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const rotation = Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 20000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        rotation.start();

        const interval = setInterval(() => {
            setActiveBar((prev) => (prev + 1) % NUM_BARS);
        }, 100);

        return () => {
            rotation.stop();
            clearInterval(interval);
        };
    }, [rotateAnim]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const estaActiva = (index: number) => {
        const diff = (activeBar - index + NUM_BARS) % NUM_BARS;
        return diff >= 0 && diff < ACTIVE_TRAIL;
    };

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.circleContainer,
                {
                    transform: [{ rotate: spin }],
                },
            ]}
        >
            {Array.from({ length: NUM_BARS }).map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.barWrapper,
                        {
                            transform: [
                                {
                                    rotate: `${(360 / NUM_BARS) * index}deg`,
                                },
                            ],
                        },
                    ]}
                >
                    <View style={[styles.bar, estaActiva(index) && styles.barActive]} />
                </View>
            ))}
        </Animated.View>
    );
}