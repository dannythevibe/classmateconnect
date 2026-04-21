-- 📍 Upgrade Attendance Integrity
-- 1. Add location columns to sessions (the classroom center)
ALTER TABLE public.attendance_sessions 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION,
ADD COLUMN late_cutoff_mins INT DEFAULT 15;

-- 2. Add location and metadata to records (student check-ins)
ALTER TABLE public.attendance_records
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION,
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Update comments for clarity
COMMENT ON COLUMN public.attendance_sessions.late_cutoff_mins IS 'Minutes after started_at after which status is "late"';
COMMENT ON COLUMN public.attendance_records.metadata IS 'Stores anomaly flags, device info, or travel distance';
