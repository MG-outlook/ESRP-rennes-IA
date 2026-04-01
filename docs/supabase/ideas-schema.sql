-- Block 1: Tables
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  problem text,
  beneficiaries text,
  resources text,
  status text not null default 'en_discussion'
    check (status in ('en_discussion', 'validee', 'en_projet', 'archivee')),
  campus text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

alter table public.ideas add constraint ideas_title_length check (length(title) between 5 and 200);
alter table public.ideas add constraint ideas_description_length check (length(description) between 10 and 5000);

create table public.idea_reactions (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '🎉', '💡', '🚀')),
  created_at timestamptz not null default now(),
  unique (idea_id, user_id, emoji)
);

create table public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Block 2: Indexes
create index idx_ideas_status on public.ideas (status);
create index idx_ideas_campus on public.ideas (campus);
create index idx_ideas_created_at on public.ideas (created_at desc);
create index idx_ideas_last_activity_at on public.ideas (last_activity_at desc);
create index idx_ideas_author_id on public.ideas (author_id);
create index idx_ideas_tags on public.ideas using gin (tags);
create index idx_idea_reactions_idea_id on public.idea_reactions (idea_id);
create index idx_idea_reactions_user_idea on public.idea_reactions (idea_id, user_id, emoji);
create index idx_idea_comments_idea_id on public.idea_comments (idea_id);

-- Block 3: Triggers
create or replace function public.update_idea_last_activity()
returns trigger
language plpgsql
security definer set search_path = public
as 58318
begin
  update public.ideas
  set last_activity_at = now(), updated_at = now()
  where id = coalesce(new.idea_id, new.id);
  return new;
end;
58318;

create trigger on_idea_reaction_created
  after insert on public.idea_reactions
  for each row execute procedure public.update_idea_last_activity();

create trigger on_idea_comment_created
  after insert on public.idea_comments
  for each row execute procedure public.update_idea_last_activity();

create or replace function public.prevent_nonadmin_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as 58318
declare
  is_admin boolean;
begin
  if old.status is distinct from new.status then
    select (role = 'admin') into is_admin from public.profiles where id = auth.uid();
    if not is_admin then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
58318;

create trigger enforce_status_change_permissions
  before update on public.ideas
  for each row execute procedure public.prevent_nonadmin_status_change();

create trigger handle_updated_at
  before update on public.ideas
  for each row execute procedure extensions.moddatetime('updated_at');

-- Block 4: RLS
alter table public.ideas enable row level security;
alter table public.idea_reactions enable row level security;
alter table public.idea_comments enable row level security;

create policy "Lecture idées" on public.ideas for select using (true);
create policy "Création idée" on public.ideas for insert with check (auth.uid() = author_id);
create policy "MAJ idée admin" on public.ideas for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "MAJ idée auteur contenu" on public.ideas
  for update using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Lecture réactions" on public.idea_reactions for select using (true);
create policy "Ajout réaction" on public.idea_reactions for insert with check (auth.uid() = user_id);
create policy "Suppression réaction" on public.idea_reactions for delete using (auth.uid() = user_id);

create policy "Lecture commentaires" on public.idea_comments for select using (true);
create policy "Ajout commentaire" on public.idea_comments for insert with check (auth.uid() = author_id);
create policy "Suppression commentaire" on public.idea_comments for delete using (auth.uid() = author_id);
create policy "MAJ commentaire" on public.idea_comments for update using (auth.uid() = author_id);

create policy "Lecture profil publique" on public.profiles for select using (true);

-- Block 5: RPC functions
create or replace function public.archive_stale_ideas()
returns void
language plpgsql
security definer set search_path = public
as 58318
begin
  update public.ideas
  set status = 'archivee', updated_at = now()
  where status = 'en_discussion'
    and last_activity_at < now() - interval '30 days';
end;
58318;

create or replace function public.toggle_idea_reaction(
  p_idea_id uuid,
  p_user_id uuid,
  p_emoji text
)
returns boolean
language plpgsql
security definer set search_path = public
as 58318
declare
  reaction_exists boolean;
begin
  select exists(
    select 1 from idea_reactions
    where idea_id = p_idea_id and user_id = p_user_id and emoji = p_emoji
  ) into reaction_exists;
  if reaction_exists then
    delete from idea_reactions
    where idea_id = p_idea_id and user_id = p_user_id and emoji = p_emoji;
    return false;
  else
    insert into idea_reactions (idea_id, user_id, emoji)
    values (p_idea_id, p_user_id, p_emoji);
    return true;
  end if;
end;
58318;

-- Block 6: View ideas_with_counts
create or replace view public.ideas_with_counts as
select
  i.*,
  p.full_name as author_name,
  p.avatar_url as author_avatar_url,
  coalesce(r.counts, '{}'::jsonb) as reaction_counts,
  coalesce(c.comment_count, 0) as comment_count
from public.ideas i
left join public.profiles p on p.id = i.author_id
left join lateral (
  select jsonb_object_agg(emoji, cnt) as counts
  from (
    select emoji, count(*)::int as cnt
    from idea_reactions where idea_id = i.id group by emoji
  ) sub
) r on true
left join lateral (
  select count(*)::int as comment_count
  from idea_comments where idea_id = i.id
) c on true;
