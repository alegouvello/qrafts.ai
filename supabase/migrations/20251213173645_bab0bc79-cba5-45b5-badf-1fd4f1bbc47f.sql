-- Add DELETE policy for user_profiles table to allow users to delete their own profile data
CREATE POLICY "Users can delete their own profile" 
ON public.user_profiles 
FOR DELETE 
USING (auth.uid() = user_id);