-- Permite que usuários com role 'admin', 'super_admin' ou o oficial atualizem qualquer perfil
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin') 
    OR 
    (SELECT username FROM profiles WHERE id = auth.uid()) = 'unnasocialappoficial'
    OR
    auth.uid() = id -- Mantém a regra original para a pessoa editar o próprio perfil
  );
