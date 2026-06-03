import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { ms } from '@/utils/responsive';
import { useRouter } from 'expo-router';

interface EventFomoRSVPProps {
  eventId: string;
  totalParticipants: number;
}

export default function EventFomoRSVP({ eventId, totalParticipants }: EventFomoRSVPProps) {
  const [avatars, setAvatars] = useState<string[]>([]);
  const { textSecondary, isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const fetchParticipants = async () => {
      try {
        const { data, error } = await supabase
          .from('event_participants')
          .select('profiles(avatar_url)')
          .eq('event_id', eventId)
          .limit(3);
          
        if (!error && data && isMounted) {
          const fetchedAvatars = data
            .map(p => (p.profiles as any)?.avatar_url)
            .filter(url => !!url);
          setAvatars(fetchedAvatars);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchParticipants();
    return () => { isMounted = false; };
  }, [eventId]);

  if (totalParticipants === 0 && avatars.length === 0) return null;

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.8}
      onPress={() => router.push(`/event/${eventId}`)}
    >
      <View style={styles.avatarsWrapper}>
        {avatars.map((url, index) => (
          <Image 
            key={`${url}-${index}`} 
            source={{ uri: url }} 
            style={[
              styles.avatar, 
              { 
                borderColor: isDark ? '#1C1C1E' : '#FFFFFF',
                transform: [{ translateX: -index * 12 }],
                zIndex: 3 - index
              }
            ]} 
          />
        ))}
        {avatars.length === 0 && totalParticipants > 0 && (
          // Fallback if we couldn't fetch avatars in time but know there are participants
          <View style={[styles.avatarPlaceholder, { borderColor: isDark ? '#1C1C1E' : '#FFFFFF' }]} />
        )}
      </View>
      <Text style={[styles.text, { color: textSecondary, transform: [{ translateX: -(avatars.length > 0 ? (avatars.length - 1) * 12 : 0) }] }]}>
        <Text style={{ fontWeight: 'bold' }}>{totalParticipants}</Text> {totalParticipants === 1 ? 'pessoa vai' : 'pessoas vão'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  avatarsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#888',
  },
  text: {
    fontSize: ms(12),
    marginLeft: 6,
  }
});
