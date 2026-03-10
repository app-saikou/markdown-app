-- notes に user_id を追加
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- RLS ポリシーを「自分のデータのみ」に変更
DROP POLICY IF EXISTS "allow all" ON notes;
CREATE POLICY "users can manage own notes" ON notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
