-- Classrooms: an instructor makes a class, learners join it with a code, and
-- the instructor can see how far each learner has got.
--
-- Apply with:  supabase db push
-- or paste into the SQL editor at
--   https://supabase.com/dashboard/project/rvfdeckdhmhifsaahgpe/sql
--
-- Additive only. It creates two new tables and adds one SELECT policy to
-- learner_progress; it alters no existing column and drops no existing policy.
-- To undo it entirely:
--   drop policy "instructor reads member progress" on public.learner_progress;
--   drop function public.join_class(text, text);
--   drop function public.new_join_code();
--   drop table public.class_members;
--   drop table public.classes;

create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 80),
  join_code  text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id     uuid not null references public.classes on delete cascade,
  learner_id   uuid not null references auth.users on delete cascade,
  -- What the learner chooses to be called in the roster. Never their email:
  -- an instructor has no business reading a learner's address.
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  joined_at    timestamptz not null default now(),
  primary key (class_id, learner_id)
);

create index if not exists class_members_learner_idx on public.class_members (learner_id);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;

-- Classes belong to the instructor who made them.
drop policy if exists "owner reads own classes" on public.classes;
create policy "owner reads own classes" on public.classes
  for select using (owner_id = (select auth.uid()));

drop policy if exists "owner makes classes" on public.classes;
create policy "owner makes classes" on public.classes
  for insert with check (owner_id = (select auth.uid()));

drop policy if exists "owner renames own classes" on public.classes;
create policy "owner renames own classes" on public.classes
  for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "owner deletes own classes" on public.classes;
create policy "owner deletes own classes" on public.classes
  for delete using (owner_id = (select auth.uid()));

-- Membership is visible to the class owner and to the learner themselves.
drop policy if exists "owner reads roster" on public.class_members;
create policy "owner reads roster" on public.class_members
  for select using (
    exists (select 1 from public.classes c where c.id = class_id and c.owner_id = (select auth.uid()))
  );

drop policy if exists "learner reads own membership" on public.class_members;
create policy "learner reads own membership" on public.class_members
  for select using (learner_id = (select auth.uid()));

drop policy if exists "learner leaves class" on public.class_members;
create policy "learner leaves class" on public.class_members
  for delete using (learner_id = (select auth.uid()));

drop policy if exists "owner removes member" on public.class_members;
create policy "owner removes member" on public.class_members
  for delete using (
    exists (select 1 from public.classes c where c.id = class_id and c.owner_id = (select auth.uid()))
  );

-- An instructor may read the progress of learners who joined their class, and
-- nothing else. This sits beside the existing "read own progress" policy;
-- policies are OR'd, so a learner's own access is unchanged.
drop policy if exists "instructor reads member progress" on public.learner_progress;
create policy "instructor reads member progress" on public.learner_progress
  for select using (
    exists (
      select 1 from public.class_members m
      join public.classes c on c.id = m.class_id
      where m.learner_id = learner_progress.user_id
        and c.owner_id = (select auth.uid())
    )
  );

-- Codes get read aloud in a room, so no O/0, I/1 or S/5 to mishear.
create or replace function public.new_join_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRTUVWXY2346789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.classes where join_code = code);
  end loop;
  return code;
end $$;

alter table public.classes alter column join_code set default public.new_join_code();

-- Joining is a function, not a table read: a learner must never be able to
-- list other people's classes just because they can type a code.
create or replace function public.join_class(code text, learner_name text)
returns table (id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare found_class public.classes%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'You need to be signed in to join a class.';
  end if;

  select * into found_class from public.classes
   where join_code = upper(regexp_replace(coalesce(code, ''), '\s', '', 'g'));

  if not found then
    raise exception 'No class has that code. Check it with whoever gave it to you.';
  end if;

  insert into public.class_members (class_id, learner_id, display_name)
  values (found_class.id, (select auth.uid()), left(trim(coalesce(learner_name, '')), 60))
  on conflict (class_id, learner_id) do update set display_name = excluded.display_name;

  return query select found_class.id, found_class.name;
end $$;

revoke all on function public.join_class(text, text) from public;
grant execute on function public.join_class(text, text) to authenticated;
