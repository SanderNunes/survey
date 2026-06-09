-- Allow the browser mirror to attach/update the final SharePoint receipt after
-- the existing insert-only Supabase-first write.

grant update (
  sharepoint_item_id,
  sharepoint_list_name,
  has_audio,
  audio_question_ids,
  status,
  is_duplicate,
  duplicate_phone,
  metadata,
  sharepoint_fields,
  sharepoint_receipt
) on public.survey_submissions to anon, authenticated;

grant select (survey_id, source) on public.survey_submissions to anon, authenticated;

drop policy if exists "browser update survey submission receipts" on public.survey_submissions;
create policy "browser update survey submission receipts"
on public.survey_submissions
for update
to anon, authenticated
using (source = 'prelaunch' and survey_id <> '')
with check (source = 'prelaunch' and survey_id <> '');
