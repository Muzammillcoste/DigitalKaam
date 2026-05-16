-- 1. Create user_profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    home_area TEXT,
    loyalty_points INTEGER DEFAULT 0,
    preferred_providers UUID[] DEFAULT '{}',
    blacklisted_providers UUID[] DEFAULT '{}',
    past_service_types TEXT[] DEFAULT '{}',
    expo_push_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create providers table
CREATE TABLE IF NOT EXISTS public.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    service_type TEXT NOT NULL,
    specialization TEXT,
    experience_years INTEGER,
    rating NUMERIC(3,1) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    review_recency_score NUMERIC(3,2) DEFAULT 0.5,
    on_time_score INTEGER DEFAULT 100,
    reliability_score INTEGER DEFAULT 100,
    cancellation_rate NUMERIC(3,2) DEFAULT 0.0,
    hourly_rate INTEGER NOT NULL,
    capacity INTEGER DEFAULT 4,
    skills TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    travel_radius INTEGER DEFAULT 10,
    lat NUMERIC,
    lng NUMERIC,
    area TEXT,
    status TEXT DEFAULT 'pending_review',
    expo_push_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create availability table
CREATE TABLE IF NOT EXISTS public.availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    travel_buffer INTEGER DEFAULT 30
);

-- 4. Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.providers(id),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    user_request TEXT,
    status TEXT DEFAULT 'confirmed',
    scheduled_time TIMESTAMP WITH TIME ZONE,
    price NUMERIC,
    price_breakdown JSONB,
    service_complexity TEXT,
    receipt_url TEXT,
    completion_photo_url TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create reputation table
CREATE TABLE IF NOT EXISTS public.reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    positive_reviews INTEGER DEFAULT 0,
    negative_reviews INTEGER DEFAULT 0,
    complaints INTEGER DEFAULT 0,
    disputes INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create traces table (for Antigravity logs)
CREATE TABLE IF NOT EXISTS public.traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    agent TEXT NOT NULL,
    input JSONB,
    output JSONB,
    reasoning TEXT,
    tool_calls JSONB,
    confidence_score NUMERIC(3,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    provider_id UUID NOT NULL REFERENCES public.providers(id),
    type TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    description TEXT,
    resolution TEXT,
    refund_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    provider_id UUID NOT NULL REFERENCES public.providers(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable Row Level Security (RLS) for testing via backend API using Service Role
-- In a production environment, RLS should be enabled and policies defined.
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.traces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback DISABLE ROW LEVEL SECURITY;
