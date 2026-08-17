-- Feed schema: posts, media, comments, likes, follows + storage bucket.

-- Random alphanumeric post ids (per spec: "randomly generated numbers and letters").
create function public.generate_post_id()
returns text
language sql
volatile
set search_path = ''
as $$
  select replace(gen_random_uuid()::text, '-', '');
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.posts (
  post_id text primary key default public.generate_post_id()
    check (post_id ~ '^[A-Za-z0-9]{8,64}$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 500),
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  created_at timestamptz not null default now()
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_user_id_idx on public.posts (user_id);

-- A post can hold several photos/gifs; files live in the "posts" storage bucket.
create table public.post_media (
  id bigint generated always as identity primary key,
  post_id text not null references public.posts (post_id) on delete cascade,
  position integer not null default 0,
  storage_path text not null
    check (storage_path ~* '\.(png|jpe?g|gif)$'),
  unique (post_id, position)
);

create index post_media_post_id_idx on public.post_media (post_id);

create table public.comments (
  id bigint generated always as identity primary key,
  post_id text not null references public.posts (post_id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 50-word limit is enforced app-side; the char cap is a DB backstop.
  comment text not null check (char_length(comment) between 1 and 600),
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now()
);

create index comments_post_id_idx on public.comments (post_id, like_count desc);

-- One row per (user, post) so likes toggle and can't double-count.
create table public.post_likes (
  post_id text not null references public.posts (post_id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comment_likes (
  comment_id bigint not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_follower_idx on public.follows (follower_id);

-- ---------------------------------------------------------------------------
-- Count maintenance (security definer so RLS on the parent rows can stay
-- owner-only; users never update like_count/comment_count directly).
-- ---------------------------------------------------------------------------

create function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1
      where post_id = new.post_id;
    return new;
  else
    update public.posts set like_count = greatest(like_count - 1, 0)
      where post_id = old.post_id;
    return old;
  end if;
end;
$$;

create trigger on_post_like_change
  after insert or delete on public.post_likes
  for each row execute procedure public.sync_post_like_count();

create function public.sync_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set like_count = like_count + 1
      where id = new.comment_id;
    return new;
  else
    update public.comments set like_count = greatest(like_count - 1, 0)
      where id = old.comment_id;
    return old;
  end if;
end;
$$;

create trigger on_comment_like_change
  after insert or delete on public.comment_likes
  for each row execute procedure public.sync_comment_like_count();

create function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1
      where post_id = new.post_id;
    return new;
  else
    update public.posts set comment_count = greatest(comment_count - 1, 0)
      where post_id = old.post_id;
    return old;
  end if;
end;
$$;

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute procedure public.sync_post_comment_count();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.comment_likes enable row level security;
alter table public.follows enable row level security;

create policy "Posts are viewable by signed-in users"
  on public.posts for select to authenticated using (true);
create policy "Users can create their own posts"
  on public.posts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own posts"
  on public.posts for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Post media is viewable by signed-in users"
  on public.post_media for select to authenticated using (true);
create policy "Users can attach media to their own posts"
  on public.post_media for insert to authenticated
  with check (exists (
    select 1 from public.posts p
    where p.post_id = post_media.post_id and p.user_id = (select auth.uid())
  ));

create policy "Comments are viewable by signed-in users"
  on public.comments for select to authenticated using (true);
create policy "Users can comment as themselves"
  on public.comments for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own comments"
  on public.comments for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Post likes are viewable by signed-in users"
  on public.post_likes for select to authenticated using (true);
create policy "Users can like posts as themselves"
  on public.post_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can unlike posts"
  on public.post_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Comment likes are viewable by signed-in users"
  on public.comment_likes for select to authenticated using (true);
create policy "Users can like comments as themselves"
  on public.comment_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can unlike comments"
  on public.comment_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Follows are viewable by signed-in users"
  on public.follows for select to authenticated using (true);
create policy "Users can follow as themselves"
  on public.follows for insert to authenticated
  with check ((select auth.uid()) = follower_id);
create policy "Users can unfollow"
  on public.follows for delete to authenticated
  using ((select auth.uid()) = follower_id);

-- ---------------------------------------------------------------------------
-- Grants (this project lacks default API-role privileges; default privileges
-- were altered in 20260816000002 but keep new tables explicit for safety).
-- ---------------------------------------------------------------------------

grant select, insert, delete on table public.posts to authenticated, service_role;
grant update on table public.posts to service_role;
-- Users may edit only their caption; counters belong to the triggers.
grant update (caption) on table public.posts to authenticated;

grant select, insert, delete on table public.post_media to authenticated, service_role;
grant select, insert, delete on table public.comments to authenticated, service_role;
grant select, insert, delete on table public.post_likes to authenticated, service_role;
grant select, insert, delete on table public.comment_likes to authenticated, service_role;
grant select, insert, delete on table public.follows to authenticated, service_role;
grant update on table public.comments to service_role;

grant execute on function public.generate_post_id() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage: public bucket for post photos (png/jpg/gif only, per spec).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 10485760, array['image/png', 'image/jpeg', 'image/gif'])
on conflict (id) do nothing;

create policy "Users can upload post media to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Post media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'posts');
