import { supabase } from './supabaseClient';
import type { Note, NoteStatus } from '../types';

// ─── Note ────────────────────────────────────────────────────────────────────

export async function createNote(rawText: string = '', sourceType: 'voice' | 'text' = 'text'): Promise<Note> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('notes')
    .insert({ raw_text: rawText, source_type: sourceType, user_id: user?.id })
    .select()
    .single();
  if (error) throw error;
  return rowToNote(data);
}

export async function updateNote(
  id: string,
  fields: Partial<{
    content: string;
    rawText: string;
    title: string | null;
    tags: string[];
    status: NoteStatus;
    isFavorite: boolean;
    emoji: string;
  }>
): Promise<Note> {
  const update: Record<string, unknown> = {};
  if (fields.content !== undefined) update.markdown_content = fields.content;
  if (fields.rawText !== undefined) update.raw_text = fields.rawText;
  if (fields.title !== undefined) update.title = fields.title;
  if (fields.tags !== undefined) update.tags = fields.tags;
  if (fields.status !== undefined) update.status = fields.status;
  if (fields.isFavorite !== undefined) update.is_favorite = fields.isFavorite;
  if (fields.emoji !== undefined) update.emoji = fields.emoji;

  const { data, error } = await supabase
    .from('notes')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToNote(data);
}

export async function fetchNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select()
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToNote);
}

export async function fetchNoteById(id: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .select()
    .eq('id', id)
    .single();
  if (error) throw error;
  return rowToNote(data);
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

// ─── Row mapper ──────────────────────────────────────────────────────────────

function rowToNote(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    content: (row.markdown_content as string) ?? '',
    rawText: (row.raw_text as string) ?? '',
    title: row.title as string | null,
    tags: (row.tags as string[]) ?? [],
    status: (row.status as NoteStatus) ?? 'draft',
    isFavorite: (row.is_favorite as boolean) ?? false,
    emoji: (row.emoji as string) ?? '',
    sourceType: (row.source_type as 'voice' | 'text') ?? 'text',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', key)
    .single();
  if (error) return null;
  return (data?.value as string) ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('app_settings')
    .upsert({ user_id: user.id, key, value }, { onConflict: 'user_id,key' });
  if (error) throw error;
}
