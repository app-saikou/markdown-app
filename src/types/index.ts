export type SourceType = 'voice' | 'text';
export type NoteStatus = 'draft' | 'structured' | 'exported';
export type ColorScheme = 'light' | 'dark' | 'system';

export type Note = {
  id: string;
  content: string;        // メインの編集フィールド
  rawText: string;        // AI構造化前の退避バックアップ
  title: string | null;
  tags: string[];
  status: NoteStatus;
  isFavorite: boolean;
  emoji: string;
  sourceType: SourceType;
  createdAt: string;
  updatedAt: string;
};
