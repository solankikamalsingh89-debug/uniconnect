-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (Extends Supabase Auth profiles)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  handle TEXT NOT NULL,
  batch_year INT NOT NULL,
  branch_code INT NOT NULL, -- 100=CSE, 101=ECE, 102=DSAI
  role TEXT NOT NULL DEFAULT 'student',
  is_mentor BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Groups Table (Hierarchical support)
CREATE TABLE groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  is_direct_message BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Group Members (Many-to-Many)
CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Messages Table
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Posts / Reels Table
CREATE TABLE posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  video_url TEXT,
  is_recommended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notices Table
CREATE TABLE notices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content_summary TEXT NOT NULL,
  original_link TEXT,
  posted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Events Table
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notices;
