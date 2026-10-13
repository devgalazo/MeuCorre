CREATE TABLE public.settings (
  user_id uuid PRIMARY KEY,
  week_start int NOT NULL DEFAULT 1,
  oil_last_km numeric,
  oil_interval_km numeric NOT NULL DEFAULT 1000,
  odometer_km numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'corrida',
  active boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  km numeric NOT NULL DEFAULT 0,
  maintenance numeric NOT NULL DEFAULT 0,
  equipment numeric NOT NULL DEFAULT 0,
  pass numeric NOT NULL DEFAULT 0,
  food numeric NOT NULL DEFAULT 0,
  other numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
CREATE TABLE public.day_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_id uuid NOT NULL REFERENCES public.days(id) ON DELETE CASCADE,
  platform_id uuid NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  total numeric NOT NULL DEFAULT 0,
  cash numeric NOT NULL DEFAULT 0,
  card numeric NOT NULL DEFAULT 0,
  tips numeric NOT NULL DEFAULT 0,
  trips int NOT NULL DEFAULT 0,
  hours numeric NOT NULL DEFAULT 0
);
CREATE TABLE public.fuelings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_id uuid NOT NULL REFERENCES public.days(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  liters numeric
);
CREATE TABLE public.monthly_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month date NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['settings','platforms','days','day_platforms','fuelings','monthly_expenses'] LOOP
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('CREATE POLICY own_all ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
END LOOP; END $$;

CREATE INDEX ON public.days(user_id, date);
CREATE INDEX ON public.day_platforms(day_id);
CREATE INDEX ON public.fuelings(day_id);

CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.settings(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.platforms(user_id,name,kind,sort) VALUES
    (NEW.id,'Uber Moto','corrida',1),(NEW.id,'99 Moto','corrida',2),
    (NEW.id,'99Food','entrega',3),(NEW.id,'iFood','entrega',4),
    (NEW.id,'Delmatch','entrega',5),(NEW.id,'Shopee','entrega',6),
    (NEW.id,'Mercado Livre','entrega',7);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_setup() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created_setup AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();