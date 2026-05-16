-- Enable RLS (Best Practice)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Grant ANON full access for prototype testing
CREATE POLICY "Allow anon all on user_profiles" ON public.user_profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on providers" ON public.providers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on availability" ON public.availability FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on bookings" ON public.bookings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on reputation" ON public.reputation FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on traces" ON public.traces FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on disputes" ON public.disputes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on feedback" ON public.feedback FOR ALL TO anon USING (true) WITH CHECK (true);
