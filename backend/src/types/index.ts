export type Stage = 'idea' | 'hone' | 'validate' | 'shape' | 'done';
export type ValidationSource = 'community' | 'linkedin' | 'email';
export type ContactStatus = 'Not sent' | 'Sent' | 'Replied' | 'Call booked' | 'Done';
export type PostType = 'win' | 'question' | 'validation_request' | 'update';
export type ReactionType = 'encourage' | 'ask';

export interface User {
  id: string;
  email: string;
  name: string;
  current_stage: Stage;
  community_opt: boolean;
  help_types: string[];
  avatar_initials: string;
  created_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  stage: Stage;
  created_at: string;
  updated_at: string;
}

export interface StageEntry {
  id: string;
  user_id: string;
  idea_id: string;
  stage: Stage;
  field_key: string;
  content: string | null;
  completed_at: string | null;
}

export interface ValidationContact {
  id: string;
  user_id: string;
  idea_id: string;
  source: ValidationSource;
  name: string;
  contact: string | null;
  status: ContactStatus;
  notes: string | null;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  idea_id: string | null;
  stage: Stage;
  content: string;
  post_type: PostType;
  created_at: string;
  // joined
  author_name?: string;
  author_initials?: string;
  encourage_count?: number;
  ask_count?: number;
  comment_count?: number;
  user_reacted?: ReactionType | null;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_initials?: string;
}

// Request extensions
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: User;
      impersonatedBy?: string;
    }
  }
}
