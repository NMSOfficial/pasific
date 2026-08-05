import { supabase } from './supabaseClient';

export interface ReferenceVideo {
  title: string;
  youtubeUrl: string;
  channelName?: string;
}

function mapVideo(row: Record<string, unknown>): ReferenceVideo {
  return {
    title: row.title as string,
    youtubeUrl: row.youtube_url as string,
    channelName: (row.channel_name as string | null) ?? undefined,
  };
}

export async function fetchVideoForWritingType(writingTypeId: string): Promise<ReferenceVideo | null> {
  const { data } = await supabase
    .from('reference_videos')
    .select('*')
    .eq('subject_type', 'writing_type')
    .eq('subject_id', writingTypeId)
    .maybeSingle();
  return data ? mapVideo(data) : null;
}

export async function fetchVideoForErrorCategory(categoryId: string, group: string): Promise<ReferenceVideo | null> {
  const { data: byCategory } = await supabase
    .from('reference_videos')
    .select('*')
    .eq('subject_type', 'error_category')
    .eq('subject_id', categoryId)
    .maybeSingle();
  if (byCategory) return mapVideo(byCategory);

  const { data: byGroup } = await supabase
    .from('reference_videos')
    .select('*')
    .eq('subject_type', 'error_group')
    .eq('subject_id', group)
    .maybeSingle();
  return byGroup ? mapVideo(byGroup) : null;
}
