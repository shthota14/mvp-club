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
  is_admin?: boolean;
  email_notifications?: boolean;
  linkedin_id?: string | null;
  linkedin_url?: string | null;
  linkedin_name?: string | null;
  linkedin_picture?: string | null;
  linkedin_connected_at?: string | null;
}

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export type IdeaStatus = 'active' | 'done' | 'archived';

export interface Idea {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  stage: Stage;
  idea_status: IdeaStatus;
  moderation_status?: ModerationStatus;
  business_domain?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValidationContact {
  id: string;
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
  author_name: string;
  author_initials: string;
  encourage_count: number;
  ask_count: number;
  comment_count: number;
  user_reacted: ReactionType | null;
}

export const STAGE_LABELS: Record<Stage, string> = {
  idea: '💡 Idea',
  hone: '🎯 Hone',
  validate: '🧪 Validate',
  shape: '🔨 Shape',
  done: '🚀 Ship',
};

export interface Advisor {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  avatar_initials: string;
  stages: Stage[];
  expertise: string[];
  linkedin_url: string | null;
  email: string | null;
}

export interface NetworkContact {
  id: string;
  user_id: string;
  name: string;
  contact_type: 'linkedin' | 'email';
  contact_value: string;
  notes: string | null;
  created_at: string;
}

export interface HelpRequest {
  id: string;
  user_id: string;
  advisor_id: string | null;
  network_contact_id: string | null;
  stage: Stage;
  problem: string;
  specific_ask: string;
  channel: 'linkedin' | 'email';
  status: 'sent' | 'replied' | 'done';
  created_at: string;
  advisor_name?: string;
  contact_name?: string;
}

export const STAGE_COLORS: Record<Stage, string> = {
  idea: '#5856d6',
  hone: '#0066cc',
  validate: '#34c759',
  shape: '#ff9500',
  done: '#ff3b30',
};
