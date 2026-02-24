CREATE POLICY "Users can update their own resumes"
ON public.resumes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);