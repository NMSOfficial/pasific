import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface GradingSubmissionRow {
  id: string;
  assignment_id: string | null;
  student_id: string;
  school_id: string;
  writing_type_id: string;
  level: string;
  text: string;
  status: string;
  submitted_at: string | null;
  score_visible_to_student: boolean;
}

interface LookupDeps {
  supabaseUrl: string;
  anonKey: string;
}

export function createRequesterClient(token: string, deps: LookupDeps): SupabaseClient {
  return createClient(deps.supabaseUrl, deps.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export async function loadSubmissionForRequester(
  submissionId: string,
  token: string,
  deps: LookupDeps,
): Promise<{ submission: GradingSubmissionRow | null; error: string | null }> {
  const requester = createRequesterClient(token, deps);

  const { data, error } = await requester
    .from('submissions')
    .select('id, assignment_id, student_id, school_id, writing_type_id, level, text, status, submitted_at, score_visible_to_student')
    .eq('id', submissionId)
    .maybeSingle<GradingSubmissionRow>();

  return {
    submission: data ?? null,
    error: error ? `${error.code ?? 'unknown'}: ${error.message}` : null,
  };
}
