-- ===================================================
-- ADD MESSAGE FEATURES: Read receipts, typing indicator, online status
-- ===================================================

-- 1. Atualizar tabela messages para adicionar read_at
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- 2. Criar tabela de user presence (status online)
CREATE TABLE IF NOT EXISTS user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_online boolean DEFAULT true,
  last_seen timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- 3. Criar tabela de typing indicator
CREATE TABLE IF NOT EXISTS typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- POLICIES (RLS) - User Presence
-- ===================================================

DROP POLICY IF EXISTS "Users can view all presence" ON user_presence;
CREATE POLICY "Users can view all presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;
CREATE POLICY "Users can update own presence"
  ON user_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own presence" ON user_presence;
CREATE POLICY "Users can insert own presence"
  ON user_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ===================================================
-- POLICIES (RLS) - Typing Indicators
-- ===================================================

DROP POLICY IF EXISTS "Users can view typing in conversation" ON typing_indicators;
CREATE POLICY "Users can view typing in conversation"
  ON typing_indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = typing_indicators.conversation_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert typing in conversation" ON typing_indicators;
CREATE POLICY "Users can insert typing in conversation"
  ON typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = typing_indicators.conversation_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own typing" ON typing_indicators;
CREATE POLICY "Users can delete own typing"
  ON typing_indicators FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ===================================================
-- Enable Realtime for new tables
-- ===================================================

-- Note: These tables are already added to realtime publication
-- If you get an error, it means they're already configured

-- Update messages for read receipts
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own message read" ON messages;
CREATE POLICY "Users can update own message read"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- ===================================================
-- STORY EDITING FEATURES (Crop, Legenda, Áudio, Tags)
-- ===================================================

-- 4. Criar tabela de CROP (dimensões e proporções)
CREATE TABLE IF NOT EXISTS story_crop (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL UNIQUE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  crop_width integer,
  crop_height integer,
  crop_top integer DEFAULT 0,
  crop_left integer DEFAULT 0,
  rotation integer DEFAULT 0,
  aspect_ratio varchar(50), -- '1:1', '4:5', '16:9', 'free'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE story_crop ENABLE ROW LEVEL SECURITY;

-- 5. Criar tabela de LEGENDA (texto, cores, efeitos)
CREATE TABLE IF NOT EXISTS story_captions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  text varchar(500),
  text_color varchar(9) DEFAULT '#FFFFFF', -- Hex color
  background_color varchar(9), -- Hex color (opcional)
  font_style varchar(50) DEFAULT 'normal', -- 'normal', 'bold', 'italic'
  text_effect varchar(50), -- 'none', 'deco', 'squeeze', 'typewriter'
  font_size integer DEFAULT 24,
  position_x float DEFAULT 0.5, -- 0 to 1 (left to right)
  position_y float DEFAULT 0.5, -- 0 to 1 (top to bottom)
  rotation integer DEFAULT 0,
  opacity integer DEFAULT 100, -- 0 to 100
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE story_captions ENABLE ROW LEVEL SECURITY;

-- 6. Criar tabela de ÁUDIO/MÚSICA
CREATE TABLE IF NOT EXISTS story_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL UNIQUE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  audio_url varchar(500),
  audio_title varchar(255),
  audio_artist varchar(255),
  audio_source varchar(50), -- 'spotify', 'local', 'youtube'
  audio_duration integer, -- em segundos
  start_time integer DEFAULT 0, -- offset em ms
  volume integer DEFAULT 100, -- 0 to 100
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE story_audio ENABLE ROW LEVEL SECURITY;

-- 7. Criar tabela de TAGS (pessoas e locais)
CREATE TABLE IF NOT EXISTS story_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tag_type varchar(50), -- 'person', 'location', 'hashtag', 'link'
  tag_value varchar(255), -- nome da pessoa, local, hashtag, ou URL
  tagged_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL, -- se for pessoa
  position_x float DEFAULT 0.5, -- 0 to 1
  position_y float DEFAULT 0.5, -- 0 to 1
  created_at timestamptz DEFAULT now()
);

ALTER TABLE story_tags ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- POLICIES (RLS) - Story Crop
-- ===================================================

DROP POLICY IF EXISTS "Users can view own story crop" ON story_crop;
CREATE POLICY "Users can view own story crop"
  ON story_crop FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own story crop" ON story_crop;
CREATE POLICY "Users can insert own story crop"
  ON story_crop FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own story crop" ON story_crop;
CREATE POLICY "Users can update own story crop"
  ON story_crop FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own story crop" ON story_crop;
CREATE POLICY "Users can delete own story crop"
  ON story_crop FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ===================================================
-- POLICIES (RLS) - Story Captions
-- ===================================================

DROP POLICY IF EXISTS "Users can view own story captions" ON story_captions;
CREATE POLICY "Users can view own story captions"
  ON story_captions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own story captions" ON story_captions;
CREATE POLICY "Users can insert own story captions"
  ON story_captions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own story captions" ON story_captions;
CREATE POLICY "Users can update own story captions"
  ON story_captions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own story captions" ON story_captions;
CREATE POLICY "Users can delete own story captions"
  ON story_captions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ===================================================
-- POLICIES (RLS) - Story Audio
-- ===================================================

DROP POLICY IF EXISTS "Users can view own story audio" ON story_audio;
CREATE POLICY "Users can view own story audio"
  ON story_audio FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own story audio" ON story_audio;
CREATE POLICY "Users can insert own story audio"
  ON story_audio FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own story audio" ON story_audio;
CREATE POLICY "Users can update own story audio"
  ON story_audio FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own story audio" ON story_audio;
CREATE POLICY "Users can delete own story audio"
  ON story_audio FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ===================================================
-- POLICIES (RLS) - Story Tags
-- ===================================================

DROP POLICY IF EXISTS "Users can view own story tags" ON story_tags;
CREATE POLICY "Users can view own story tags"
  ON story_tags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own story tags" ON story_tags;
CREATE POLICY "Users can insert own story tags"
  ON story_tags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own story tags" ON story_tags;
CREATE POLICY "Users can update own story tags"
  ON story_tags FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own story tags" ON story_tags;
CREATE POLICY "Users can delete own story tags"
  ON story_tags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
