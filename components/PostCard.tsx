import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Heart, MessageCircle as MessageIcon, Calendar } from 'lucide-react-native';

interface PostCardProps {
  post: any;
  onLike: (postId: string, isLiked: boolean) => void;
}

export default function PostCard({ post, onLike }: PostCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {post.profiles?.avatar_url ? (
          <Image
            source={{ uri: post.profiles.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {post.profiles?.username?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.username}>{post.profiles?.full_name}</Text>
          <Text style={styles.handle}>@{post.profiles?.username}</Text>
        </View>
      </View>

      <Text style={styles.content}>{post.content}</Text>

      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {post.events && (
        <View style={styles.eventCard}>
          <Calendar size={16} color="#007AFF" />
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{post.events.title}</Text>
            <Text style={styles.eventDetails}>
              {new Date(post.events.event_date).toLocaleDateString('pt-BR')} às {post.events.event_time}
            </Text>
            <Text style={styles.eventLocation}>{post.events.location_name}</Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onLike(post.id, post.is_liked || false)}
        >
          <Heart
            size={20}
            color={post.is_liked ? '#FF3B30' : '#8E8E93'}
            fill={post.is_liked ? '#FF3B30' : 'none'}
          />
          <Text style={[styles.actionText, post.is_liked && styles.likedText]}>
            {post.likes_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <MessageIcon size={20} color="#8E8E93" />
          <Text style={styles.actionText}>Comentar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  handle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  content: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  eventInfo: {
    marginLeft: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 6,
  },
  likedText: {
    color: '#FF3B30',
  },
});
