
-- ============================================================
-- FIX 1: Convert ALL RESTRICTIVE policies to PERMISSIVE
-- PostgreSQL doesn't support ALTER POLICY to change type,
-- so we drop and recreate each one.
-- ============================================================

-- === answer_templates ===
DROP POLICY IF EXISTS "Users can create their own templates" ON public.answer_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.answer_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.answer_templates;
DROP POLICY IF EXISTS "Users can view their own templates" ON public.answer_templates;

CREATE POLICY "Users can create their own templates" ON public.answer_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own templates" ON public.answer_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own templates" ON public.answer_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own templates" ON public.answer_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === answers ===
DROP POLICY IF EXISTS "Users can create their own answers" ON public.answers;
DROP POLICY IF EXISTS "Users can delete their own answers" ON public.answers;
DROP POLICY IF EXISTS "Users can update their own answers" ON public.answers;
DROP POLICY IF EXISTS "Users can view their own answers" ON public.answers;

CREATE POLICY "Users can create their own answers" ON public.answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own answers" ON public.answers FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own answers" ON public.answers FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own answers" ON public.answers FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === application_status_history ===
DROP POLICY IF EXISTS "Users can create status history for their applications" ON public.application_status_history;
DROP POLICY IF EXISTS "Users can view status history for their applications" ON public.application_status_history;

CREATE POLICY "Users can create status history for their applications" ON public.application_status_history FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) AND (EXISTS (SELECT 1 FROM applications WHERE applications.id = application_status_history.application_id AND applications.user_id = auth.uid())));
CREATE POLICY "Users can view status history for their applications" ON public.application_status_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = application_status_history.application_id AND applications.user_id = auth.uid()));

-- === applications ===
DROP POLICY IF EXISTS "Users can create their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can delete their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;

CREATE POLICY "Users can create their own applications" ON public.applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own applications" ON public.applications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own applications" ON public.applications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own applications" ON public.applications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === company_experiences ===
DROP POLICY IF EXISTS "Users can create their own experiences" ON public.company_experiences;
DROP POLICY IF EXISTS "Users can delete their own experiences" ON public.company_experiences;
DROP POLICY IF EXISTS "Users can update their own experiences" ON public.company_experiences;
DROP POLICY IF EXISTS "Users can view their own experiences" ON public.company_experiences;

CREATE POLICY "Users can create their own experiences" ON public.company_experiences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own experiences" ON public.company_experiences FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own experiences" ON public.company_experiences FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own experiences" ON public.company_experiences FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === company_notes ===
DROP POLICY IF EXISTS "Users can create their own company notes" ON public.company_notes;
DROP POLICY IF EXISTS "Users can delete their own company notes" ON public.company_notes;
DROP POLICY IF EXISTS "Users can update their own company notes" ON public.company_notes;
DROP POLICY IF EXISTS "Users can view their own company notes" ON public.company_notes;

CREATE POLICY "Users can create their own company notes" ON public.company_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own company notes" ON public.company_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own company notes" ON public.company_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own company notes" ON public.company_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === company_profiles ===
DROP POLICY IF EXISTS "Authenticated users can view company profiles" ON public.company_profiles;
DROP POLICY IF EXISTS "Only admins can insert company profiles" ON public.company_profiles;
DROP POLICY IF EXISTS "Only admins can update company profiles" ON public.company_profiles;

CREATE POLICY "Authenticated users can view company profiles" ON public.company_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert company profiles" ON public.company_profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update company profiles" ON public.company_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- === company_watchlist ===
DROP POLICY IF EXISTS "Users can add to their watchlist" ON public.company_watchlist;
DROP POLICY IF EXISTS "Users can remove from their watchlist" ON public.company_watchlist;
DROP POLICY IF EXISTS "Users can view their own watchlist" ON public.company_watchlist;

CREATE POLICY "Users can add to their watchlist" ON public.company_watchlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from their watchlist" ON public.company_watchlist FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own watchlist" ON public.company_watchlist FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === feedback ===
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;

CREATE POLICY "Admins can update feedback" ON public.feedback FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all feedback" ON public.feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users can view their own feedback" ON public.feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === interviewers ===
DROP POLICY IF EXISTS "Users can create interviewers for their applications" ON public.interviewers;
DROP POLICY IF EXISTS "Users can delete interviewers for their applications" ON public.interviewers;
DROP POLICY IF EXISTS "Users can update interviewers for their applications" ON public.interviewers;
DROP POLICY IF EXISTS "Users can view interviewers for their applications" ON public.interviewers;

CREATE POLICY "Users can create interviewers for their applications" ON public.interviewers FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) AND (EXISTS (SELECT 1 FROM applications WHERE applications.id = interviewers.application_id AND applications.user_id = auth.uid())));
CREATE POLICY "Users can delete interviewers for their applications" ON public.interviewers FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = interviewers.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Users can update interviewers for their applications" ON public.interviewers FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = interviewers.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Users can view interviewers for their applications" ON public.interviewers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = interviewers.application_id AND applications.user_id = auth.uid()));

-- === job_match_scores ===
DROP POLICY IF EXISTS "Users can view their own match scores" ON public.job_match_scores;

CREATE POLICY "Users can view their own match scores" ON public.job_match_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === job_openings ===
DROP POLICY IF EXISTS "Authenticated users can view job openings" ON public.job_openings;

CREATE POLICY "Authenticated users can view job openings" ON public.job_openings FOR SELECT TO authenticated USING (true);

-- === master_answers ===
DROP POLICY IF EXISTS "Users can create their own master answers" ON public.master_answers;
DROP POLICY IF EXISTS "Users can delete their own master answers" ON public.master_answers;
DROP POLICY IF EXISTS "Users can update their own master answers" ON public.master_answers;
DROP POLICY IF EXISTS "Users can view their own master answers" ON public.master_answers;

CREATE POLICY "Users can create their own master answers" ON public.master_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own master answers" ON public.master_answers FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own master answers" ON public.master_answers FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own master answers" ON public.master_answers FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === questions ===
DROP POLICY IF EXISTS "Users can create questions for their applications" ON public.questions;
DROP POLICY IF EXISTS "Users can delete questions for their applications" ON public.questions;
DROP POLICY IF EXISTS "Users can update questions for their applications" ON public.questions;
DROP POLICY IF EXISTS "Users can view questions for their applications" ON public.questions;

CREATE POLICY "Users can create questions for their applications" ON public.questions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM applications WHERE applications.id = questions.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Users can delete questions for their applications" ON public.questions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = questions.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Users can update questions for their applications" ON public.questions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = questions.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Users can view questions for their applications" ON public.questions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = questions.application_id AND applications.user_id = auth.uid()));

-- === resumes ===
DROP POLICY IF EXISTS "Users can create their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can update their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can view their own resumes" ON public.resumes;

CREATE POLICY "Users can create their own resumes" ON public.resumes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own resumes" ON public.resumes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own resumes" ON public.resumes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own resumes" ON public.resumes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === shared_questions ===
DROP POLICY IF EXISTS "Authenticated users can view shared questions" ON public.shared_questions;
DROP POLICY IF EXISTS "Users can contribute shared questions" ON public.shared_questions;
DROP POLICY IF EXISTS "Users can delete their own shared questions" ON public.shared_questions;

CREATE POLICY "Authenticated users can view shared questions" ON public.shared_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can contribute shared questions" ON public.shared_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = contributed_by);
CREATE POLICY "Users can delete their own shared questions" ON public.shared_questions FOR DELETE TO authenticated USING (auth.uid() = contributed_by);

-- === tailored_resumes ===
DROP POLICY IF EXISTS "Users can create their own tailored resumes" ON public.tailored_resumes;
DROP POLICY IF EXISTS "Users can delete their own tailored resumes" ON public.tailored_resumes;
DROP POLICY IF EXISTS "Users can update their own tailored resumes" ON public.tailored_resumes;
DROP POLICY IF EXISTS "Users can view their own tailored resumes" ON public.tailored_resumes;

CREATE POLICY "Users can create their own tailored resumes" ON public.tailored_resumes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tailored resumes" ON public.tailored_resumes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own tailored resumes" ON public.tailored_resumes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own tailored resumes" ON public.tailored_resumes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === timeline_events ===
DROP POLICY IF EXISTS "Users can create events for their applications" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can delete events for their applications" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can update events for their applications" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can view events for their applications" ON public.timeline_events;

CREATE POLICY "Users can create events for their applications" ON public.timeline_events FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) AND (EXISTS (SELECT 1 FROM applications WHERE applications.id = timeline_events.application_id AND applications.user_id = auth.uid())));
CREATE POLICY "Users can delete events for their applications" ON public.timeline_events FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = timeline_events.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Users can update events for their applications" ON public.timeline_events FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = timeline_events.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Users can view events for their applications" ON public.timeline_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = timeline_events.application_id AND applications.user_id = auth.uid()));

-- === user_profiles ===
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;

CREATE POLICY "Users can delete their own profile" ON public.user_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- === user_roles ===
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
