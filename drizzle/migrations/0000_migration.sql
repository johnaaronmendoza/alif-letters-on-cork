CREATE TABLE public.letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_name text NOT NULL DEFAULT 'anonymous',
  open_when_label text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  paper_style text NOT NULL DEFAULT 'cream',
  font text NOT NULL DEFAULT 'caveat',
  ink_color text NOT NULL DEFAULT '#2B2B2B',
  stickers jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_url text,
  signature_url text,
  seal_color text NOT NULL DEFAULT '#D7263D',
  seal_symbol text NOT NULL DEFAULT '♡',
  pin_color text NOT NULL DEFAULT '#D7263D',
  unlock_at timestamptz,
  board_x real NOT NULL DEFAULT 50,
  board_y real NOT NULL DEFAULT 50,
  rotation real NOT NULL DEFAULT 0,
  browser_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.letters TO anon, authenticated;
GRANT ALL ON public.letters TO service_role;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read letters" ON public.letters FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can pin letters" ON public.letters FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(body) <= 2000 AND char_length(from_name) <= 60 AND char_length(open_when_label) <= 80 AND browser_id IS NOT NULL);

CREATE OR REPLACE FUNCTION public.letters_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.letters WHERE browser_id = NEW.browser_id AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'rate_limited: max 5 letters per hour';
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER letters_rate_limit BEFORE INSERT ON public.letters FOR EACH ROW EXECUTE FUNCTION public.letters_rate_limit();

ALTER PUBLICATION supabase_realtime ADD TABLE public.letters;

INSERT INTO public.letters (from_name, open_when_label, body, paper_style, font, ink_color, stickers, seal_color, seal_symbol, pin_color, board_x, board_y, rotation, browser_id, created_at) VALUES
('mira', 'you need a laugh', 'remember when we got lost looking for that tiny ramen place and ended up eating gas station onigiri on the curb? best dinner ever. you make every wrong turn fun. ♡', 'lined', 'caveat', '#2B2B2B', '[{"type":"🍒","x":78,"y":12,"rotation":12,"scale":1.2},{"type":"⭐","x":10,"y":80,"rotation":-10,"scale":1}]', '#D7263D', '♡', '#D7263D', 14, 22, -5, 'seed', now() - interval '3 days'),
('jun', 'you''re stressed', 'breathe. you have handled every hard thing so far, 100% success rate. drink some water, put on that playlist, and text me. i''m proud of you.', 'airmail', 'patrick', '#1F4E79', '[{"type":"🌼","x":82,"y":78,"rotation":8,"scale":1.3}]', '#9CC9E8', '★', '#9CC9E8', 48, 60, 4, 'seed', now() - interval '2 days'),
('anonymous', 'you can''t sleep', 'count the stars instead of sheep. or count the reasons people love you — you''ll run out of night first.', 'polaroid', 'typewriter', '#2B2B2B', '[{"type":"🌙","x":15,"y":15,"rotation":-12,"scale":1.2}]', '#F6E27A', '☾', '#F6E27A', 78, 30, -7, 'seed', now() - interval '1 day');