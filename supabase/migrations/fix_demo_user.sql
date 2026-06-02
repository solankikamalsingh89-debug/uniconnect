-- Run this in Supabase → SQL Editor to fix the demo user profile
UPDATE public.users
SET handle = 'demo25100', branch_code = 100
WHERE email = 'demo25102@iiitnr.edu.in';

-- Verify the fix
SELECT id, email, handle, branch_code FROM public.users WHERE email = 'demo25102@iiitnr.edu.in';
