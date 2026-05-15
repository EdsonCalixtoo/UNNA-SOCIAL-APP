import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useUI } from '@/contexts/UIContext';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

function TabBarButton({ isFocused, onPress, onLongPress, children, isCenter, accent }: any) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.15 : 1, { damping: 12, stiffness: 150 });
    translateY.value = withSpring(isFocused && !isCenter ? -3 : 0, { damping: 12 });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }] as any
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tabButton, isCenter && styles.centerButtonWrapper]}
    >
      <Animated.View style={[animatedStyle, isCenter && (styles.centerButton as any), isCenter && { backgroundColor: accent, shadowColor: accent }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { tabBarOffset } = useUI();
  const { isDark, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const focusedOptions = descriptors[state.routes[state.index].key].options;

  // Se a tela ativa pede para esconder a tab bar
  if ((focusedOptions.tabBarStyle as any)?.display === 'none') {
    return null;
  }

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: tabBarOffset.value }],
    };
  });

  return (
    <Animated.View 
      style={[
        styles.wrapper, 
        containerStyle, 
        { bottom: Math.max(insets.bottom, 16) + (Platform.OS === 'ios' ? 10 : 0) }
      ]} 
      pointerEvents="box-none"
    >
      {/* BARRA DE FUNDO COM BLUR E OVERFLOW HIDDEN */}
      <BlurView 
        intensity={isDark ? 40 : 80} 
        tint={isDark ? "dark" : "light"}
        style={[styles.blurContainer, {
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        }]}
      >
        <View style={styles.tabContent}>
          {state.routes.map((route, index) => {
            const options = descriptors[route.key].options as any;
            if (options.href === null || !options.tabBarIcon) return null;

            const isCenter = route.name === 'create';
            if (isCenter) {
              return <View key={route.key} style={{ flex: 1 }} pointerEvents="none" />;
            }

            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            };
            const onLongPress = () => { navigation.emit({ type: 'tabLongPress', target: route.key }); };

            const iconColor = isFocused ? accent : (isDark ? '#A0A0A0' : '#666666');

            return (
              <TabBarButton
                key={route.key}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                isCenter={false}
                accent={accent}
              >
                {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color: iconColor, size: 24 }) : null}
              </TabBarButton>
            );
          })}
        </View>
      </BlurView>

      {/* OVERLAY PARA O BOTÃO CENTRAL NÃO SER CORTADO PELO OVERFLOW: HIDDEN */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]}>
        <View style={[styles.tabContent, { pointerEvents: 'box-none' }]}>
          {state.routes.map((route, index) => {
            const options = descriptors[route.key].options as any;
            if (options.href === null || !options.tabBarIcon) return null;

            const isCenter = route.name === 'create';
            if (!isCenter) {
              return <View key={`overlay-${route.key}`} style={{ flex: 1 }} pointerEvents="none" />;
            }

            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            };
            const onLongPress = () => { navigation.emit({ type: 'tabLongPress', target: route.key }); };

            return (
              <TabBarButton
                key={route.key}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                isCenter={true}
                accent={accent}
              >
                {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color: '#fff', size: 24 }) : null}
              </TabBarButton>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: width * 0.05,
    right: width * 0.05,
    zIndex: 1000,
  },

  blurContainer: {
    width: '100%',
    height: 65,
    borderRadius: 33,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tabContent: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -25, // Efeito pop out
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  }
});
