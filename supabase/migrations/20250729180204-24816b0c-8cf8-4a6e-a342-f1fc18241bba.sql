-- Update existing admin users with correct emails
UPDATE public.profiles 
SET role = 'admin' 
WHERE email IN ('mo@creme.digital', 'nairns27@gmail.com');

-- Update the auto-promotion function with correct emails
CREATE OR REPLACE FUNCTION public.auto_promote_admins()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-promote specific emails to admin
  IF NEW.email IN ('mo@creme.digital', 'nairns27@gmail.com') THEN
    NEW.role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;