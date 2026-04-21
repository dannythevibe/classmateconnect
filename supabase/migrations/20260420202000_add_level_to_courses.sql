ALTER TABLE public.courses ADD COLUMN level text;
COMMENT ON COLUMN public.courses.level IS 'Academic level (e.g., 100, 200, 300, 400, 500)';
