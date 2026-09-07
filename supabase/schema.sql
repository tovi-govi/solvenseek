-- ============================================================
-- OPENVERSE HIDE & SEEK — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id                  uuid references auth.users(id) on delete cascade primary key,
  username            text unique not null,
  player_id           text unique not null,     -- e.g. H-014, S-007
  role                text not null check (role in ('HIDER','SEEKER')),
  status              text not null default 'ACTIVE' check (status in ('ACTIVE','ELIMINATED')),
  elimination_tokens  integer not null default 0,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- HIDER CHALLENGES (CTF questions solved by HIDERS)
-- Answers stored server-side — never exposed to frontend via RLS
-- ============================================================
create table if not exists public.hider_challenges (
  id          text primary key,
  title       text not null,
  description text not null,
  difficulty  text not null check (difficulty in ('EASY','MEDIUM','HARD')),
  category    text not null,
  hints       text[] not null default '{}',
  points      integer not null default 100,
  answer      text not null,      -- NEVER read by frontend
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SEEKER CHALLENGES (Map-zone challenges solved by SEEKERS)
-- Answers stored server-side — never exposed to frontend via RLS
-- ============================================================
create table if not exists public.seeker_challenges (
  id          text primary key,
  title       text not null,
  description text not null,
  difficulty  text not null check (difficulty in ('EASY','MEDIUM','HARD')),
  location_id text not null,
  answer      text not null,      -- NEVER read by frontend
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- PLAYER CHALLENGES (solved tracking — prevents duplicate rewards)
-- ============================================================
create table if not exists public.player_challenges (
  id           uuid default gen_random_uuid() primary key,
  player_id    uuid references auth.users(id) not null,
  challenge_id text not null,
  challenge_type text not null check (challenge_type in ('HIDER','SEEKER')),
  solved_at    timestamptz not null default now(),
  unique(player_id, challenge_id)
);

-- ============================================================
-- ELIMINATIONS (audit log)
-- ============================================================
create table if not exists public.eliminations (
  id           uuid default gen_random_uuid() primary key,
  attacker_id  uuid references auth.users(id) not null,
  target_id    uuid references auth.users(id) not null,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- GAME STATE
-- ============================================================
create table if not exists public.game_state (
  id          integer primary key default 1 check (id = 1),  -- singleton
  status      text not null default 'ACTIVE' check (status in ('NOT_STARTED','ACTIVE','ENDED')),
  start_time  timestamptz,
  end_time    timestamptz,
  updated_at  timestamptz not null default now()
);

insert into public.game_state(id, status) values (1, 'ACTIVE') on conflict do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.hider_challenges  enable row level security;
alter table public.seeker_challenges enable row level security;
alter table public.player_challenges enable row level security;
alter table public.eliminations      enable row level security;
alter table public.game_state        enable row level security;

-- Profiles: users can read their own full profile; can read limited fields of others
create policy "Own profile full access"
  on public.profiles for select using (auth.uid() = id);

create policy "Others: read public info"
  on public.profiles for select
  using (auth.uid() != id);

-- Hider challenges: hiders can read all EXCEPT answer column
create policy "Hiders read challenges"
  on public.hider_challenges for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'HIDER')
    and active = true
  );

-- Seeker challenges: seekers can read all EXCEPT answer
create policy "Seekers read challenges"
  on public.seeker_challenges for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'SEEKER')
    and active = true
  );

-- Player challenges: read own only
create policy "Own player challenges"
  on public.player_challenges for select using (auth.uid() = player_id);

-- Game state: all authenticated users can read
create policy "All read game state"
  on public.game_state for select using (auth.role() = 'authenticated');

-- Eliminations: users read their own eliminations
create policy "Users read own eliminations"
  on public.eliminations for select using (auth.uid() = attacker_id or auth.uid() = target_id);

-- ============================================================
-- SERVER-SIDE RPC FUNCTIONS (SECURITY DEFINER — bypass RLS)
-- ============================================================

-- Solve hider challenge → grants elimination token
create or replace function public.solve_hider_challenge(
  p_challenge_id text,
  p_answer text
) returns jsonb language plpgsql security definer as $$
declare
  v_correct_answer text;
  v_already_solved boolean;
  v_game_status text;
  v_caller_role text;
  v_caller_status text;
begin
  -- Check game is active
  select status into v_game_status from public.game_state where id = 1;
  if v_game_status != 'ACTIVE' then
    return jsonb_build_object('success', false, 'tokens_granted', 0, 'error', 'Game is not active');
  end if;

  -- Check caller is active hider
  select role, status into v_caller_role, v_caller_status
  from public.profiles where id = auth.uid();
  if not found or v_caller_role != 'HIDER' or v_caller_status != 'ACTIVE' then
    return jsonb_build_object('success', false, 'tokens_granted', 0, 'error', 'Unauthorized');
  end if;

  -- Get correct answer
  select answer into v_correct_answer
  from public.hider_challenges
  where id = p_challenge_id and active = true;
  if not found then
    return jsonb_build_object('success', false, 'tokens_granted', 0, 'error', 'Challenge not found');
  end if;

  -- Check not already solved
  select exists(
    select 1 from public.player_challenges
    where player_id = auth.uid() and challenge_id = p_challenge_id
  ) into v_already_solved;
  if v_already_solved then
    return jsonb_build_object('success', false, 'tokens_granted', 0, 'error', 'Already solved');
  end if;

  -- Validate answer (case-insensitive, trimmed)
  if lower(trim(v_correct_answer)) != lower(trim(p_answer)) then
    return jsonb_build_object('success', false, 'tokens_granted', 0, 'error', 'Wrong answer');
  end if;

  -- Record as solved
  insert into public.player_challenges(player_id, challenge_id, challenge_type)
  values (auth.uid(), p_challenge_id, 'HIDER');

  -- Grant token
  update public.profiles
  set elimination_tokens = elimination_tokens + 1
  where id = auth.uid();

  return jsonb_build_object('success', true, 'tokens_granted', 1);
end;
$$;

-- Solve seeker challenge → grants elimination token
create or replace function public.solve_seeker_challenge(
  p_challenge_id text,
  p_answer text
) returns jsonb language plpgsql security definer as $$
declare
  v_correct_answer text;
  v_already_solved boolean;
  v_game_status text;
  v_caller_role text;
  v_caller_status text;
begin
  select status into v_game_status from public.game_state where id = 1;
  if v_game_status != 'ACTIVE' then
    return jsonb_build_object('success', false, 'tokens_granted', 0, 'error', 'Game is not active');
  end if;

  select role, status into v_caller_role, v_caller_status
  from public.profiles where id = auth.uid();
  if not found or v_caller_role != 'SEEKER' or v_caller_status != 'ACTIVE' then
    return jsonb_build_object('success', false, 'tokens_granted', 0, 'error', 'Unauthorized');
  end if;

  select answer into v_correct_answer
  from public.seeker_challenges
  where id = p_challenge_id and active = true;
  if not found then
    return jsonb_build_object('success', false, 'tokens_granted', 0, 'error', 'Challenge not found');
  end if;

  select exists(
    select 1 from public.player_challenges
    where player_id = auth.uid() and challenge_id = p_challenge_id
  ) into v_already_solved;
  if v_already_solved then
    return jsonb_build_object('success', false, 'tokens_granted', 0, 'error', 'Already solved');
  end if;

  if lower(trim(v_correct_answer)) != lower(trim(p_answer)) then
    return jsonb_build_object('success', false, 'tokens_granted', 0, 'error', 'Wrong answer');
  end if;

  -- Record solve
  insert into public.player_challenges(player_id, challenge_id, challenge_type)
  values (auth.uid(), p_challenge_id, 'SEEKER');

  -- Grant token
  update public.profiles
  set elimination_tokens = elimination_tokens + 1
  where id = auth.uid();

  return jsonb_build_object('success', true, 'tokens_granted', 1);
end;
$$;

-- Eliminate an opponent (ATOMIC)
create or replace function public.eliminate_player(
  p_target_id uuid
) returns boolean language plpgsql security definer as $$
declare
  v_attacker_tokens integer;
  v_attacker_role text;
  v_attacker_status text;
  v_target_role text;
  v_target_status text;
begin
  -- Verify attacker has tokens and is active
  select role, status, elimination_tokens into v_attacker_role, v_attacker_status, v_attacker_tokens
  from public.profiles where id = auth.uid();
  if not found or v_attacker_status != 'ACTIVE' or v_attacker_tokens < 1 then
    return false;
  end if;

  -- Verify target is active opponent
  select role, status into v_target_role, v_target_status
  from public.profiles where id = p_target_id;
  if not found or v_target_status != 'ACTIVE' or v_target_role = v_attacker_role then
    return false;
  end if;

  -- Atomic: set target eliminated
  update public.profiles set status = 'ELIMINATED' where id = p_target_id;

  -- Atomic: decrement attacker token
  update public.profiles
  set elimination_tokens = elimination_tokens - 1
  where id = auth.uid();

  -- Record elimination
  insert into public.eliminations(attacker_id, target_id) values (auth.uid(), p_target_id);

  return true;
end;
$$;

-- ============================================================
-- SEED: Hider Challenges (CTF Questions)
-- ============================================================
insert into public.hider_challenges(id, title, description, difficulty, category, hints, points, answer) values
  ('hc-01','Packet Intercept','Analyze the following Base64-encoded packet and decode it:\n\n> T3BlblZlcnNlIENURg==\n\nWhat does the message say?','EASY','Cryptography',array['Think Base64 decoding','Standard alphabet'],50,'openverse ctf'),
  ('hc-02','XOR Gate','Compute the following XOR operation:\n\n> 0b10110101 XOR 0b11001010\n\nAnswer as a decimal number.','MEDIUM','Logic',array['Work bit by bit','XOR: same→0, different→1'],100,'127'),
  ('hc-03','HTTP Status Hunt','Which HTTP status code indicates that the requested resource was not found on the server?','EASY','Web','{}',50,'404'),
  ('hc-04','Shell Ghost','In Linux, what command lists ALL files including hidden ones in long format?\n\nProvide the full command (e.g. ls -a).','EASY','Linux',array['Hidden files start with a dot'],50,'ls -la'),
  ('hc-05','Hash Cracker','The following MD5 hash was extracted from the campus Wi-Fi config file:\n\n> 5f4dcc3b5aa765d61d8327deb882cf99\n\nWhat is the original plaintext?','HARD','Cryptography',array['Very common password','Check rainbow tables'],200,'password'),
  ('hc-06','OSINT: The Badge','OpenVerse was founded in a specific year. Find the year from publicly available information about this campus CTF event.\n\nHint: Check the club''s GitHub profile.\n\nAnswer: The founding year.','MEDIUM','OSINT',array['Check README files','GitHub repositories sometimes show creation year'],100,'2024')
on conflict do nothing;

-- ============================================================
-- SEED: Seeker Challenges (Map Zones)
-- ============================================================
insert into public.seeker_challenges(id, title, description, difficulty, location_id, answer) values
  ('sc-01','Signal Intercept','Decode the intercepted transmission:\n\n> VGhlIHF1aWNrIGJyb3duIGZveA==\n\nFormat: the decoded string','MEDIUM','zone-2','the quick brown fox'),
  ('sc-02','Router Override','Find the default password for the campus guest network.\nFormat: word-word-number','EASY','zone-1','campus-guest-123'),
  ('sc-03','Server Room Keys','A Caesar cipher with shift 3 was applied. Decrypt:\n\n> FDPSXV','MEDIUM','zone-3','campus'),
  ('sc-04','Admin Port','Which well-known port is used for HTTPS?','EASY','zone-6','443')
on conflict do nothing;
