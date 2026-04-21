-- Add missing columns to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS level text DEFAULT '',
  ADD COLUMN IF NOT EXISTS department text DEFAULT '';
