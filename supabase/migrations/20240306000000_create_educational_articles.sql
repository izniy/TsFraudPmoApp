-- Create the educational_articles table
create table public.educational_articles (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    content text not null,
    image_url text,
    source_url text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index on the title for faster duplicate checking
create index educational_articles_title_idx on public.educational_articles (title);

-- Enable Row Level Security (RLS)
alter table public.educational_articles enable row level security;

-- Create a policy that allows all users to read educational articles
create policy "Educational articles are viewable by everyone"
    on public.educational_articles
    for select
    using (true);

-- Create a policy that only allows service role to insert articles
create policy "Only service role can insert educational articles"
    on public.educational_articles
    for insert
    with check (auth.role() = 'service_role');

-- Create updated_at trigger
create trigger set_updated_at
    before update on public.educational_articles
    for each row
    execute function public.set_updated_at(); 