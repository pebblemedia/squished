CREATE TABLE public.saved_recipes (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND pg_column_size(data) < 16384),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.business_profiles (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '' CHECK (char_length(name) <= 120),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND pg_column_size(data) < 8192),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_recipes, public.business_profiles TO authenticated;
GRANT ALL ON public.saved_recipes, public.business_profiles TO service_role;
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own recipes" ON public.saved_recipes FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Save own recipes" ON public.saved_recipes FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Edit own recipes" ON public.saved_recipes FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Remove own recipes" ON public.saved_recipes FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Read own businesses" ON public.business_profiles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Save own businesses" ON public.business_profiles FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Edit own businesses" ON public.business_profiles FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Remove own businesses" ON public.business_profiles FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE INDEX saved_recipes_user_updated_idx ON public.saved_recipes (user_id, updated_at DESC);
CREATE INDEX business_profiles_user_updated_idx ON public.business_profiles (user_id, updated_at DESC);
CREATE FUNCTION public.owned_row_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;
CREATE TRIGGER saved_recipes_touch BEFORE UPDATE ON public.saved_recipes FOR EACH ROW EXECUTE FUNCTION public.owned_row_touch();
CREATE TRIGGER business_profiles_touch BEFORE UPDATE ON public.business_profiles FOR EACH ROW EXECUTE FUNCTION public.owned_row_touch();