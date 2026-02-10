create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student', 'admin')),
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);


-- Helpers
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles where id = user_id and role = 'admin'
  );
$$;

-- Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')) default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_branding (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  brand_name text,
  logo_path text,
  brand_primary_color text,
  brand_secondary_color text,
  theme_mode text check (theme_mode in ('light', 'dark', 'auto')) default 'light',
  custom_domain text,
  slug text,
  updated_at timestamptz not null default now()
);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('workspace', 'teacher_personal')),
  owner_id uuid not null,
  plan text not null,
  seat_limit integer,
  status text not null,
  provider text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- Teacher/Student relationships and groups
create table if not exists public.teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (teacher_id, student_id)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, student_id)
);

-- Methodics and lessons
create table if not exists public.methodics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  methodic_id uuid not null references public.methodics(id) on delete cascade,
  slug text not null,
  title text not null,
  order_index integer not null default 1,
  teacher_content_md text,
  created_at timestamptz not null default now(),
  unique (methodic_id, slug)
);

create table if not exists public.lesson_assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  asset_type text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_homework_templates (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  video_repeats integer not null default 0,
  audio_repeats integer not null default 0,
  requires_presentation boolean not null default false,
  text_prompt text,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_overrides (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  content_md text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, teacher_id)
);

-- Assignments and tracking
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  status text not null default 'assigned',
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.assignment_student_overrides (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  video_repeats integer,
  audio_repeats integer,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.assignment_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assignment_text_answers (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answer text not null,
  created_at timestamptz not null default now()
);

-- Schedule / sessions
create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  starts_at timestamptz not null,
  duration_min integer not null default 60,
  target_type text not null check (target_type in ('student', 'group')),
  target_id uuid not null,
  meeting_provider text not null default 'jitsi',
  meeting_room_key text not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

-- Words / dictionary
create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  translation text,
  audio_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_words (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  primary key (lesson_id, word_id)
);

create table if not exists public.student_word_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'learning', 'learned')),
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  last_seen_at timestamptz,
  primary key (student_id, word_id)
);

-- Messaging
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Invites
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  invite_type text not null check (invite_type in ('student', 'teacher', 'workspace_teacher')),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete cascade,
  student_email text,
  student_phone text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- RLS
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_branding enable row level security;
alter table public.subscriptions enable row level security;
alter table public.teacher_students enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.methodics enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_assets enable row level security;
alter table public.lesson_homework_templates enable row level security;
alter table public.lesson_overrides enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_student_overrides enable row level security;
alter table public.assignment_events enable row level security;
alter table public.assignment_text_answers enable row level security;
alter table public.class_sessions enable row level security;
alter table public.words enable row level security;
alter table public.lesson_words enable row level security;
alter table public.student_word_progress enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.invites enable row level security;

-- Profiles policies
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin(auth.uid()));
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_admin(auth.uid()));

-- Workspace policies
create policy "workspaces_select_members" on public.workspaces
  for select using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = id and wm.user_id = auth.uid()
    )
  );
create policy "workspaces_insert_owner" on public.workspaces
  for insert with check (auth.uid() = owner_user_id);
create policy "workspaces_update_owner" on public.workspaces
  for update using (
    auth.uid() = owner_user_id or public.is_admin(auth.uid())
  );

create policy "workspace_members_select" on public.workspace_members
  for select using (
    public.is_admin(auth.uid()) or user_id = auth.uid() or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
    )
  );
create policy "workspace_members_insert" on public.workspace_members
  for insert with check (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.workspaces w
      where w.id = workspace_members.workspace_id and w.owner_user_id = auth.uid()
    )
  );

create policy "workspace_branding_select" on public.workspace_branding
  for select using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_branding.workspace_id
        and wm.user_id = auth.uid()
    )
  );
create policy "workspace_branding_update" on public.workspace_branding
  for update using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.workspaces w
      where w.id = workspace_branding.workspace_id and w.owner_user_id = auth.uid()
    )
  );

-- Subscriptions
create policy "subscriptions_select" on public.subscriptions
  for select using (
    public.is_admin(auth.uid())
  );

-- Teacher/student relationships
create policy "teacher_students_select" on public.teacher_students
  for select using (
    public.is_admin(auth.uid()) or teacher_id = auth.uid() or student_id = auth.uid()
  );
create policy "teacher_students_insert" on public.teacher_students
  for insert with check (teacher_id = auth.uid() or public.is_admin(auth.uid()));

create policy "groups_select" on public.groups
  for select using (
    public.is_admin(auth.uid()) or teacher_id = auth.uid() or exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.student_id = auth.uid()
    )
  );
create policy "groups_insert" on public.groups
  for insert with check (teacher_id = auth.uid());

create policy "group_members_select" on public.group_members
  for select using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.teacher_id = auth.uid()
    ) or student_id = auth.uid()
  );
create policy "group_members_insert" on public.group_members
  for insert with check (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.teacher_id = auth.uid()
    )
  );

-- Methodics/lessons (teacher only)
create policy "methodics_select_teacher" on public.methodics
  for select using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  );
create policy "lessons_select_teacher" on public.lessons
  for select using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  );

-- Lesson assets/templates/overrides
create policy "lesson_assets_select_teacher" on public.lesson_assets
  for select using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  );
create policy "lesson_homework_templates_select_teacher" on public.lesson_homework_templates
  for select using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  );
create policy "lesson_overrides_select" on public.lesson_overrides
  for select using (
    public.is_admin(auth.uid()) or teacher_id = auth.uid()
  );
create policy "lesson_overrides_upsert" on public.lesson_overrides
  for insert with check (teacher_id = auth.uid());
create policy "lesson_overrides_update" on public.lesson_overrides
  for update using (teacher_id = auth.uid());

-- Assignments
create policy "assignments_select" on public.assignments
  for select using (
    public.is_admin(auth.uid()) or teacher_id = auth.uid() or student_id = auth.uid() or exists (
      select 1 from public.group_members gm
      where gm.group_id = assignments.group_id and gm.student_id = auth.uid()
    )
  );
create policy "assignments_insert" on public.assignments
  for insert with check (teacher_id = auth.uid());

create policy "assignment_student_overrides_select" on public.assignment_student_overrides
  for select using (
    public.is_admin(auth.uid()) or student_id = auth.uid() or exists (
      select 1 from public.assignments a
      where a.id = assignment_student_overrides.assignment_id and a.teacher_id = auth.uid()
    )
  );
create policy "assignment_student_overrides_insert" on public.assignment_student_overrides
  for insert with check (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.assignments a
      where a.id = assignment_student_overrides.assignment_id and a.teacher_id = auth.uid()
    )
  );

create policy "assignment_events_select" on public.assignment_events
  for select using (
    public.is_admin(auth.uid()) or student_id = auth.uid() or exists (
      select 1 from public.assignments a
      where a.id = assignment_events.assignment_id and a.teacher_id = auth.uid()
    )
  );
create policy "assignment_events_insert" on public.assignment_events
  for insert with check (
    student_id = auth.uid()
  );

create policy "assignment_text_answers_select" on public.assignment_text_answers
  for select using (
    public.is_admin(auth.uid()) or student_id = auth.uid() or exists (
      select 1 from public.assignments a
      where a.id = assignment_text_answers.assignment_id and a.teacher_id = auth.uid()
    )
  );
create policy "assignment_text_answers_insert" on public.assignment_text_answers
  for insert with check (student_id = auth.uid());

-- Sessions
create policy "class_sessions_select" on public.class_sessions
  for select using (
    public.is_admin(auth.uid()) or teacher_id = auth.uid() or exists (
      select 1 from public.teacher_students ts
      where ts.student_id = auth.uid() and ts.teacher_id = class_sessions.teacher_id
    ) or exists (
      select 1 from public.group_members gm
      where gm.group_id = class_sessions.target_id and gm.student_id = auth.uid()
    )
  );
create policy "class_sessions_insert" on public.class_sessions
  for insert with check (teacher_id = auth.uid());

-- Words
create policy "words_select" on public.words
  for select using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.profiles p where p.id = auth.uid()
    )
  );
create policy "lesson_words_select" on public.lesson_words
  for select using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.profiles p where p.id = auth.uid()
    )
  );
create policy "student_word_progress_select" on public.student_word_progress
  for select using (
    public.is_admin(auth.uid()) or student_id = auth.uid()
  );
create policy "student_word_progress_upsert" on public.student_word_progress
  for insert with check (student_id = auth.uid());
create policy "student_word_progress_update" on public.student_word_progress
  for update using (student_id = auth.uid());

-- Conversations/messages
create policy "conversations_select" on public.conversations
  for select using (
    public.is_admin(auth.uid()) or teacher_id = auth.uid() or student_id = auth.uid()
  );
create policy "conversations_insert" on public.conversations
  for insert with check (teacher_id = auth.uid() or student_id = auth.uid());

create policy "messages_select" on public.messages
  for select using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and (c.teacher_id = auth.uid() or c.student_id = auth.uid())
    )
  );
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
  );

-- Invites
create policy "invites_select" on public.invites
  for select using (
    public.is_admin(auth.uid()) or teacher_id = auth.uid()
  );
create policy "invites_insert" on public.invites
  for insert with check (
    public.is_admin(auth.uid()) or teacher_id = auth.uid()
  );

-- Storage buckets
insert into storage.buckets (id, name, public)
values
  ('cinara-content', 'cinara-content', false),
  ('branding-assets', 'branding-assets', false)
on conflict (id) do nothing;
