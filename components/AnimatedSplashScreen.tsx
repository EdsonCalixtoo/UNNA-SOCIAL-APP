import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function AnimatedSplashScreen() {
  const loadingProgress = useSharedValue(0);

  useEffect(() => {
    // Infinite loading progress
    loadingProgress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );
  }, []);

  const loadingStyle = useAnimatedStyle(() => ({
    width: `${loadingProgress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brandName}>
          U<Text style={{color: '#ff1493'}}>N</Text><Text style={{color: '#00d9ff'}}>И</Text>A
        </Text>

        <View style={styles.loaderWrapper}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, loadingStyle]}>
              <LinearGradient
                colors={['#00d9ff', '#ff1493']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  brandName: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 8,
    marginBottom: 40,
    marginLeft: 8, // Compensar o letter spacing no final
  },
  loaderWrapper: {
    width: '60%',
    alignItems: 'center',
  },
  track: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 15,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
