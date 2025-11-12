-- Migration: Add driver mobility limitations field
-- Description: Adds a field to staff_profiles to track which mobility devices drivers cannot handle.
-- This field is used as a hard filter in ride matching - drivers with a client's mobility device 
-- in this array will be excluded from matches.

-- Create enum type for mobility assistance devices if it doesn't exist
DO $$ BEGIN
    CREATE TYPE mobility_assistance_enum AS ENUM ('cane', 'light walker', 'roll-leader');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add column to staff_profiles for mobility devices drivers cannot handle
-- This is an array of mobility_assistance_enum values
ALTER TABLE staff_profiles 
ADD COLUMN IF NOT EXISTS cannot_handle_mobility_devices mobility_assistance_enum[] DEFAULT ARRAY[]::mobility_assistance_enum[];

-- Add comment to explain the field
COMMENT ON COLUMN staff_profiles.cannot_handle_mobility_devices IS 
'Array of mobility assistance devices that this driver cannot handle. Used as a hard filter in ride matching - drivers with a client''s mobility device in this array will be excluded from matches.';
