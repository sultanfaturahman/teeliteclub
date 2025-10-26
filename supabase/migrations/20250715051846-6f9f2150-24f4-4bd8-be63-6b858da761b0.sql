-- Fix the profiles table RLS policy for INSERT
-- The current policy requires auth.uid() = id, but during signup the user isn't authenticated yet
-- We need to allow users to create their own profile during the signup process

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create a new INSERT policy that allows authenticated users to create profiles
-- This will work because Supabase auth will be authenticated even during signup process
CREATE POLICY "Users can create own profile during signup"
ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);