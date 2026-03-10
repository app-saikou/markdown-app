-- notes テーブル: メモと構造化文書を統合
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text text NOT NULL DEFAULT '',
  markdown_content text NOT NULL DEFAULT '',
  title text,
  tags text[] DEFAULT '{}',
  status text CHECK (status IN ('draft', 'structured', 'exported')) DEFAULT 'draft',
  is_favorite boolean DEFAULT false,
  emoji text DEFAULT '',
  source_type text CHECK (source_type IN ('voice', 'text')) DEFAULT 'text',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can manage own notes" ON notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- アプリ設定テーブル（ダークモードなど）
CREATE TABLE IF NOT EXISTS app_settings (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key     text NOT NULL,
  value   text NOT NULL,
  UNIQUE (user_id, key)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can manage own settings" ON app_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
