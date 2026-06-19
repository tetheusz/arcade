begin;

-- O app usa Prisma para acessar o Postgres e Supabase apenas para Storage.
-- Então podemos fechar o acesso via API aos dados do schema public sem
-- impactar o runtime da aplicação.

alter table if exists public.users enable row level security;
alter table if exists public.sessions enable row level security;
alter table if exists public.accounts enable row level security;
alter table if exists public.verifications enable row level security;
alter table if exists public.posts enable row level security;
alter table if exists public.user_profiles enable row level security;
alter table if exists public.daily_challenges enable row level security;
alter table if exists public.challenge_attempts enable row level security;
alter table if exists public.activity_events enable row level security;

revoke all privileges on table public.users from anon, authenticated;
revoke all privileges on table public.sessions from anon, authenticated;
revoke all privileges on table public.accounts from anon, authenticated;
revoke all privileges on table public.verifications from anon, authenticated;
revoke all privileges on table public.posts from anon, authenticated;
revoke all privileges on table public.user_profiles from anon, authenticated;
revoke all privileges on table public.daily_challenges from anon, authenticated;
revoke all privileges on table public.challenge_attempts from anon, authenticated;
revoke all privileges on table public.activity_events from anon, authenticated;

commit;
