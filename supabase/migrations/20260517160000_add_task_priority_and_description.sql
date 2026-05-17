-- Add a short description and a priority level to tasks.

ALTER TABLE public.tasks ADD COLUMN description TEXT;

ALTER TABLE public.tasks
  ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('low', 'medium', 'high'));

CREATE INDEX idx_tasks_priority ON public.tasks(priority);
