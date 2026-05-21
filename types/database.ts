export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  is_private?: boolean;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  preferred_categories?: string[];
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
  level?: number;
  total_points?: number;
  flaker_count?: number;
  presence_score?: number;
  is_verified?: boolean;
  role?: string;
  birth_date?: string;
  instagram_url?: string;
  website_url?: string;
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
  image_urls?: string[];
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
  media_type?: 'image' | 'video';
  media_types?: ('image' | 'video')[];
  min_age?: number;
  type?: 'event' | 'publication';
  status?: string;
  is_recurring?: boolean;
  recurrence_type?: string;
  recurrence_end_date?: string;
  recurrence_days?: number[];
  created_at: string;
  updated_at: string;
  likes_count?: number;
  is_liked?: boolean;
  participants_count?: number;
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
  thumbnail_url?: string;
  created_at: string;
  expires_at: string;
  profiles?: Profile;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  image_urls?: string[];
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

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
  unreadCount?: number;
}

