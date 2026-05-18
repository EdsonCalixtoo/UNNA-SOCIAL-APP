-- Corrige as políticas de RLS da tabela public.follows para permitir que o usuário seguido (dono do perfil privado) possa aceitar a solicitação e inserir a linha.

-- 1. Tenta remover políticas de inserção antigas e redundantes para evitar conflitos
DROP POLICY IF EXISTS "Permitir seguidor criar follow" ON public.follows;
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Allow insert for followers" ON public.follows;
DROP POLICY IF EXISTS "Permitir inserção pelo seguidor ou seguido" ON public.follows;

-- 2. Cria a nova política unificada de inserção (INSERT) que permite tanto o seguidor criar (perfil público) quanto o seguido aceitar (perfil privado)
CREATE POLICY "Permitir inserção pelo seguidor ou seguido" 
    ON public.follows 
    FOR INSERT 
    WITH CHECK (auth.uid() = follower_id OR auth.uid() = following_id);

-- 3. Garante que tanto o seguidor quanto o seguido possam remover um follow (remover seguidor ou deixar de seguir)
DROP POLICY IF EXISTS "Permitir remover follow" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;
DROP POLICY IF EXISTS "Allow delete for followers" ON public.follows;
DROP POLICY IF EXISTS "Permitir exclusão pelo seguidor ou seguido" ON public.follows;

CREATE POLICY "Permitir exclusão pelo seguidor ou seguido" 
    ON public.follows 
    FOR DELETE 
    USING (auth.uid() = follower_id OR auth.uid() = following_id);
