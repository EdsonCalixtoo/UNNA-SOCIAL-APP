import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/utils/responsive';
import { Users } from 'lucide-react-native';

interface Participant {
  id: string;
  user_id: string;
  profiles: {
    avatar_url: string;
    username: string;
    full_name: string;
  };
  checked_in_at: string;
}

export const EventPresenceList = ({ eventId }: { eventId: string }) => {
  const [presentUsers, setPresentUsers] = useState<Participant[]>([]);
  const { textPrimary, textSecondary, accent, backgroundSecondary } = useTheme();

  useEffect(() => {
    loadPresentUsers();

    // Inscrição Realtime para novos check-ins
    const channel = supabase
      .channel(`presence:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_participants',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.new.checked_in_at) {
            loadPresentUsers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const loadPresentUsers = async () => {
    const { data } = await supabase
      .from('event_participants')
      .select(`
        id,
        user_id,
        checked_in_at,
        profiles:user_id (avatar_url, username, full_name)
      `)
      .eq('event_id', eventId)
      .not('checked_in_at', 'is', null)
      .order('checked_in_at', { ascending: false });

    if (data) setPresentUsers(data as any);
  };

  if (presentUsers.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Users size={16} color={accent} />
        <Text style={[styles.title, { color: textPrimary }]}>
          Já chegaram ({presentUsers.length})
        </Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {presentUsers.map((item) => (
          <TouchableOpacity key={item.id} style={styles.userItem}>
            <View style={[styles.avatarContainer, { borderColor: accent }]}>
              {item.profiles.avatar_url ? (
                <Image 
                  source={{ uri: item.profiles.avatar_url }} 
                  style={styles.avatar} 
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: accent }]}>
                  <Text style={styles.avatarText}>
                    {item.profiles.username?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View style={[styles.onlineBadge, { backgroundColor: '#34C759', borderColor: backgroundSecondary || '#fff' }]} />
            </View>
            <Text style={[styles.username, { color: textSecondary }]} numberOfLines={1}>
              {item.profiles.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: vs(16),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(12),
    paddingHorizontal: s(4),
  },
  title: {
    fontSize: ms(15),
    fontWeight: '800',
  },
  list: {
    paddingLeft: s(4),
    gap: s(15),
  },
  userItem: {
    alignItems: 'center',
    width: s(60),
  },
  avatarContainer: {
    width: s(50),
    height: s(50),
    borderRadius: ms(25),
    borderWidth: 2,
    padding: 2,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: ms(22),
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: ms(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: 'bold',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  username: {
    fontSize: ms(11),
    fontWeight: '600',
    marginTop: vs(4),
    textAlign: 'center',
  },
});
