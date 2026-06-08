# Supabase-First Prelaunch Sync

This project writes prelaunch survey rows and audio objects into Supabase before
attempting the SharePoint write when these Vite environment variables are set:

```bash
VITE_SUPABASE_MIRROR_ENABLED=true
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_SUPABASE_AUDIO_BUCKET=survey-audio
```

Run `supabase/migrations/202606050001_sharepoint_mirror.sql` in the Supabase SQL
editor or through the Supabase CLI before enabling the flag.

The v1 sync is insert-only from the browser. If SharePoint fails after Supabase
succeeds, the offline queue keeps retrying; duplicate Supabase rows and audio
objects are treated as successful retries. SharePoint remains the current read
source for dashboards/admin/export screens until Supabase Auth or another secure
token bridge is added.
