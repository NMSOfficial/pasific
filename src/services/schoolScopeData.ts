import { supabase } from './supabaseClient';

export interface SchoolScopeOption {
  id: string;
  name: string;
}

export async function fetchSchoolScopeOptions(schoolIds: string[]): Promise<SchoolScopeOption[]> {
  const uniqueIds = [...new Set(schoolIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const { data, error } = await supabase
    .from('schools')
    .select('id, name')
    .in('id', uniqueIds);
  if (error) throw error;

  const byId = new Map((data ?? []).map((row) => [row.id as string, row.name as string]));
  return uniqueIds.map((id, index) => ({
    id,
    name: byId.get(id) || `Okul ${index + 1}`,
  }));
}
