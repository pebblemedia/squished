CREATE TABLE public.photo_seo (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  original_name text NOT NULL,
  custom_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT photo_seo_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_seo TO authenticated;
GRANT ALL ON public.photo_seo TO service_role;
ALTER TABLE public.photo_seo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own photo SEO" ON public.photo_seo FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Save own photo SEO" ON public.photo_seo FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Edit own photo SEO" ON public.photo_seo FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Remove own photo SEO" ON public.photo_seo FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE INDEX photo_seo_user_updated_idx ON public.photo_seo (user_id, updated_at DESC, id);
CREATE FUNCTION public.photo_seo_revision() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.revision := OLD.revision + 1;
  NEW.updated_at := now();
  NEW.original_name := OLD.original_name;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER photo_seo_revision_before_update BEFORE UPDATE ON public.photo_seo FOR EACH ROW EXECUTE FUNCTION public.photo_seo_revision();