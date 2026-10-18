alter table public.settings add column applause_url text;
update storage.buckets set file_size_limit = 2097152,
  allowed_mime_types = array['image/webp','image/png','image/jpeg','audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/x-wav','audio/ogg','audio/webm']
where id = 'assets';
