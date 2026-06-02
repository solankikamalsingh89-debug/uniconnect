export type BranchCode = 100 | 101 | 102;

export interface User {
  id: string; // UUID from Supabase Auth
  email: string;
  handle: string;
  batch_year: number;
  branch_code: BranchCode; 
  role: 'student' | 'faculty' | 'admin';
  is_mentor: boolean;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null; // For hierarchical nesting
  is_direct_message: boolean; // True if it's a 1-on-1 chat
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  content: string | null;
  video_url: string | null; // For TikTok style reels
  is_recommended: boolean;
  created_at: string;
}

export interface Notice {
  id: string;
  title: string;
  content_summary: string;
  original_link: string | null;
  posted_by: string | null; // e.g., 'n8n_bot'
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  organizer_id: string;
  created_at: string;
}
