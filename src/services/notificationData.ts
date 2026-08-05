import { supabase } from './supabaseClient';

export interface AppNotification {
  id: string;
  type: 'grade_ready' | 'new_assignment' | 'teacher_review_needed';
  title: string;
  body?: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

function mapNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    type: row.type as AppNotification['type'],
    title: row.title as string,
    body: (row.body as string | null) ?? undefined,
    link: (row.link as string | null) ?? undefined,
    readAt: (row.read_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export async function fetchNotifications(limit = 20): Promise<AppNotification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapNotification);
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
}

export async function markAllNotificationsRead(): Promise<void> {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
}
