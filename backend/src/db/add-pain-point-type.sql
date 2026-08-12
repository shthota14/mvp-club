-- Migration: add pain_point to community_posts post_type check constraint
ALTER TABLE community_posts
  DROP CONSTRAINT community_posts_post_type_check;

ALTER TABLE community_posts
  ADD CONSTRAINT community_posts_post_type_check
  CHECK (post_type IN ('win', 'question', 'validation_request', 'update', 'pain_point'));
