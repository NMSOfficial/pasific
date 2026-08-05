import { supabase } from './supabaseClient';

export interface WritingTypeGuide {
  title: string;
  summary: string;
  content: string;
  keyPhrases: string[];
}

function mapGuide(row: Record<string, unknown>): WritingTypeGuide {
  return {
    title: row.title as string,
    summary: row.summary as string,
    content: row.content as string,
    keyPhrases: (row.key_phrases as string[] | null) ?? [],
  };
}

export async function fetchGuideForWritingType(writingTypeId: string): Promise<WritingTypeGuide | null> {
  const { data } = await supabase
    .from('writing_type_guides')
    .select('*')
    .eq('writing_type_id', writingTypeId)
    .maybeSingle();
  return data ? mapGuide(data) : null;
}
