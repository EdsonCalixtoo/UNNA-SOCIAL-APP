import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ArrowRight, Sparkles, SkipForward } from 'lucide-react-native';

interface Category {
  id: string;
  name: string;
  icon: string;
}

const CARD_GRADIENTS = [
  ['#00d9ff22', '#00d9ff44'],
  ['#ff149322', '#ff149344'],
  ['#34C75922', '#34C75944'],
  ['#FF950022', '#FF950044'],
  ['#AF52DE22', '#AF52DE44'],
  ['#FF3B3022', '#FF3B3044'],
  ['#00C9A722', '#00C9A744'],
  ['#FF6B3522', '#FF6B3544'],
  ['#5856D622', '#5856D644'],
  ['#FFD60A22', '#FFD60A44'],
];

const CARD_BORDERS = [
  '#00d9ff', '#ff1493', '#34C759', '#FF9500',
  '#AF52DE', '#FF3B30', '#00C9A7', '#FF6B35',
  '#5856D6', '#FFD60A',
];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { width, height } = useWindowDimensions();
  const isSmall = height < 700;
  const fs = (n: number) => Math.max(n * 0.85, Math.min(n, width * (n / 390)));
  const sp = (n: number) => Math.max(n * 0.8, Math.min(n, height * (n / 844)));

  // Entrance animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const gridFade = useRef(new Animated.Value(0)).current;
  const gridSlide = useRef(new Animated.Value(40)).current;
  const footerFade = useRef(new Animated.Value(0)).current;
  const footerSlide = useRef(new Animated.Value(40)).current;

  // Badge pulse
  const badgePulse = useRef(new Animated.Value(1)).current;

  // Per-card scale refs
  const cardScales = useRef<{ [key: string]: Animated.Value }>({}).current;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(headerSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(gridFade, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(gridSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(footerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(footerSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [loading]);

  const pulseBadge = () => {
    Animated.sequence([
      Animated.spring(badgePulse, { toValue: 1.15, useNativeDriver: true, speed: 80, bounciness: 12 }),
      Animated.spring(badgePulse, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }),
    ]).start();
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('order');
      if (error) throw error;
      setCategories(data || []);
      // Initialize card scale refs
      (data || []).forEach((cat: Category) => {
        if (!cardScales[cat.id]) cardScales[cat.id] = new Animated.Value(1);
      });
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const scale = cardScales[categoryId];
    if (scale) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 80, bounciness: 5 }),
        Animated.spring(scale, { toValue: 1.06, useNativeDriver: true, speed: 40, bounciness: 12 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
      ]).start();
    }
    setSelectedCategories(prev => {
      const next = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      return next;
    });
    pulseBadge();
  };

  const saveAndNavigate = async (skip = false) => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from('profiles')
        .update({
          preferred_categories: skip ? [] : selectedCategories,
          onboarding_completed: true,
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error saving onboarding:', error);
    } finally {
      await refreshProfile();
      setSaving(false);
      // router.replace('/(tabs)'); // AuthGuard will handle this

    }
  };

  const cardSize = (width - 24 * 2 - 12) / 2;

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <LinearGradient colors={['#0a0a12', '#0f0f1e']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#00d9ff" />
        <Text style={styles.loadingText}>Carregando categorias...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0a0a12', '#0f0f1e', '#0a0a12']} style={StyleSheet.absoluteFill} />
      {/* Decorative orbs */}
      <View style={[styles.orb, { backgroundColor: 'rgba(0,217,255,0.07)', width: width * 0.6, height: width * 0.6, top: -width * 0.1, right: -width * 0.2 }]} />
      <View style={[styles.orb, { backgroundColor: 'rgba(255,20,147,0.07)', width: width * 0.5, height: width * 0.5, bottom: 80, left: -width * 0.15 }]} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: 24, paddingTop: sp(isSmall ? 36 : 52), paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}>
          <LinearGradient
            colors={['#00d9ff', '#7b2fff', '#ff1493']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.logoWrap, { width: sp(72), height: sp(72), borderRadius: sp(18) }]}
          >
            <Image
              source={require('@/assets/images/icone.jpg')}
              style={{ width: sp(60), height: sp(60), borderRadius: sp(14) }}
            />
          </LinearGradient>

          <View style={[styles.sparkleRow, { marginTop: sp(16) }]}>
            <Sparkles size={fs(20)} color="#00d9ff" />
            <Text style={[styles.welcomeLabel, { fontSize: fs(13) }]}>  Personalize sua experiência</Text>
          </View>

          <Text style={[styles.title, { fontSize: fs(30), marginTop: sp(8) }]}>
            O que mais te{'\n'}representa? ✨
          </Text>
          <Text style={[styles.subtitle, { fontSize: fs(15), marginTop: sp(10) }]}>
            Selecione as categorias que combinam{'\n'}com você — ou pule essa etapa!
          </Text>
          <Text style={[styles.hint, { fontSize: fs(12), marginTop: sp(6) }]}>
            Isso é opcional. Você pode mudar depois 🙂
          </Text>

          {/* Counter Badge */}
          <Animated.View style={[styles.badge, { marginTop: sp(16), transform: [{ scale: badgePulse }] }]}>
            {selectedCategories.length === 0 ? (
              <Text style={[styles.badgeText, { fontSize: fs(13) }]}>Nenhuma selecionada ainda</Text>
            ) : (
              <Text style={[styles.badgeText, { fontSize: fs(13) }]}>
                {selectedCategories.length} {selectedCategories.length === 1 ? 'categoria escolhida' : 'categorias escolhidas'} 🎉
              </Text>
            )}
          </Animated.View>
        </Animated.View>

        {/* Categories Grid */}
        <Animated.View style={[styles.grid, { opacity: gridFade, transform: [{ translateY: gridSlide }] }]}>
          {categories.map((category, index) => {
            const isSelected = selectedCategories.includes(category.id);
            const scale = cardScales[category.id] || new Animated.Value(1);
            const borderColor = CARD_BORDERS[index % CARD_BORDERS.length];
            const gradColors = CARD_GRADIENTS[index % CARD_GRADIENTS.length] as [string, string];

            return (
              <Animated.View
                key={category.id}
                style={[
                  styles.cardWrap,
                  { width: cardSize, height: cardSize, transform: [{ scale }] },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.card,
                    { borderRadius: cardSize * 0.22 },
                    isSelected && { borderColor, borderWidth: 2.5 },
                  ]}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.9}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={[borderColor + '33', borderColor + '22']}
                      style={[styles.cardInner, { borderRadius: cardSize * 0.20 }]}
                    >
                      <View style={[styles.checkBadge, { backgroundColor: borderColor }]}>
                        <Check size={fs(13)} color="#fff" strokeWidth={3} />
                      </View>
                      <Text style={styles.icon}>{category.icon}</Text>
                      <Text style={[styles.cardName, { fontSize: fs(13), color: '#fff' }]}>{category.name}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.cardInner, { borderRadius: cardSize * 0.20 }]}>
                      <Text style={styles.icon}>{category.icon}</Text>
                      <Text style={[styles.cardName, { fontSize: fs(13) }]}>{category.name}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Footer buttons */}
      <Animated.View style={[styles.footer, { opacity: footerFade, transform: [{ translateY: footerSlide }], paddingBottom: Platform.OS === 'ios' ? 36 : 24 }]}>
        {/* Skip */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => saveAndNavigate(true)}
          disabled={saving}
          activeOpacity={0.7}
        >
          <SkipForward size={fs(15)} color="#666" />
          <Text style={[styles.skipText, { fontSize: fs(13) }]}>Pular por agora</Text>
        </TouchableOpacity>

        {/* Continue */}
        <TouchableOpacity
          style={[styles.continueBtn, saving && { opacity: 0.6 }]}
          onPress={() => saveAndNavigate(false)}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={selectedCategories.length > 0 ? ['#00d9ff', '#7b2fff', '#ff1493'] : ['#2a2a3a', '#2a2a3a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnGradient}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.continueBtnContent}>
                <Text style={[styles.continueBtnText, { fontSize: fs(16) }]}>
                  {selectedCategories.length > 0 ? 'Ir para o Feed!' : 'Entrar sem selecionar'}
                </Text>
                <ArrowRight size={fs(20)} color="#fff" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a12' },
  orb: { position: 'absolute', borderRadius: 9999 },

  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a12' },
  loadingText: { color: '#666', marginTop: 16, fontSize: 14 },

  scroll: { flexGrow: 1 },

  header: { alignItems: 'center', marginBottom: 32 },
  logoWrap: { justifyContent: 'center', alignItems: 'center', shadowColor: '#00d9ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  sparkleRow: { flexDirection: 'row', alignItems: 'center' },
  welcomeLabel: { color: '#00d9ff', fontWeight: '600' },
  title: { fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.5, lineHeight: 38 },
  subtitle: { color: '#888', textAlign: 'center', lineHeight: 22 },
  hint: { color: '#555', textAlign: 'center' },

  badge: {
    backgroundColor: 'rgba(0,217,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  badgeText: { color: '#00d9ff', fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  cardWrap: {},
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 40, marginBottom: 10 },
  cardName: { fontWeight: '700', color: '#666', textAlign: 'center' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: 'rgba(10,10,18,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  skipText: { color: '#666', fontWeight: '600' },

  continueBtn: { borderRadius: 18, overflow: 'hidden' },
  continueBtnGradient: { paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  continueBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  continueBtnText: { color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
});
