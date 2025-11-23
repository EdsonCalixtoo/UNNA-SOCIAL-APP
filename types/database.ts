export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  is_private?: boolean;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  preferred_categories?: string[];
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  created_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  created_at: string;
}

export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  image_url?: string;
  event_date: string;
  event_time: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  max_participants: number;
  is_paid: boolean;
  price: number;
  category_id?: string;
  subcategory_id?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  categories?: Category;
  subcategories?: Subcategory;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
  profiles?: Profile;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  event_id?: string;
  created_at: string;
  profiles?: Profile;
  events?: Event;
  likes_count?: number;
  is_liked?: boolean;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  profiles?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  profiles?: Profile;
}
