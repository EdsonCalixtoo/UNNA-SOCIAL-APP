-- Adiciona suporte a notificações automáticas de aniversário para seguidores no banco de dados.

CREATE OR REPLACE FUNCTION public.send_birthday_notifications()
RETURNS void AS $$
DECLARE
    r RECORD;
    f RECORD;
    today_month INT;
    today_day INT;
BEGIN
    -- Obter o dia e mês atuais (na timezone de Brasília)
    today_month := EXTRACT(MONTH FROM timezone('America/Sao_Paulo', now()));
    today_day := EXTRACT(DAY FROM timezone('America/Sao_Paulo', now()));

    -- 1. Buscar todos os usuários que fazem aniversário hoje (dia e mês batem)
    FOR r IN 
        SELECT id, username, full_name 
        FROM public.profiles 
        WHERE birth_date IS NOT NULL 
          AND EXTRACT(MONTH FROM birth_date) = today_month
          AND EXTRACT(DAY FROM birth_date) = today_day
    LOOP
        -- 2. Buscar todos os seguidores daquele aniversariante
        FOR f IN 
            SELECT follower_id 
            FROM public.follows 
            WHERE following_id = r.id
        LOOP
            -- 3. Inserir a notificação na tabela 'notifications' para o seguidor (evitando duplicados no mesmo dia)
            INSERT INTO public.notifications (user_id, type, title, message, data, read)
            SELECT 
                f.follower_id, 
                'achievement', -- Tipo compatível com ícone legal no app
                'Aniversário de hoje! 🎂', 
                'Seu amigo @' || r.username || ' (' || COALESCE(r.full_name, r.username) || ') está fazendo aniversário hoje! Envie uma mensagem desejando os parabéns! 🎉',
                json_build_object('user_id', r.id, 'action', 'birthday'),
                false
            WHERE NOT EXISTS (
                SELECT 1 
                FROM public.notifications 
                WHERE user_id = f.follower_id 
                  AND title = 'Aniversário de hoje! 🎂'
                  AND data->>'user_id' = r.id::text
                  AND created_at >= date_trunc('day', now())
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
