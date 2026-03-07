CREATE TABLE public.season_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bed_id UUID REFERENCES public.beds(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  went_well TEXT,
  didnt_work TEXT,
  grow_again TEXT CHECK (grow_again IN ('yes', 'no', 'partly')),
  learnings TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, bed_id, year)
);

ALTER TABLE public.season_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own season summaries"
  ON public.season_summaries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own season summaries"
  ON public.season_summaries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own season summaries"
  ON public.season_summaries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());