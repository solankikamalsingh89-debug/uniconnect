-- Post Likes Table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id) -- one like per user per post
);

-- Post Comments Table  
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for engagement
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
