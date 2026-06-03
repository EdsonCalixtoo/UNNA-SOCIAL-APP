# 🏗️ O "Chassi" do UNИA: Mudanças Estruturais Necessárias

Você teve uma visão excelente! Para transformar um "App que mostra eventos" em um "Ecossistema Social de Eventos", nós precisaríamos dar um 'upgrade' no chassi do seu carro (Banco de dados e Telas base).

Aqui está o mapa exato do que teríamos que alterar na fundação do UNИA hoje:

---

## 1. O Banco de Dados (Supabase) 🗄️
Hoje o seu banco tem usuários, eventos e mensagens. Precisaríamos criar as seguintes tabelas novas (ou expandir as atuais):

- **Tabela `event_attendees` (RSVP):** A tabela mais importante. Ela liga o Usuário ao Evento. Sem ela, não existe "Efeito FOMO", nem "Stories do Evento", nem "Match de Eventos".
- **Tabela `user_connections`:** Para saber quem é amigo de quem (seguir/seguidores).
- **Update na tabela `profiles`:** Precisaríamos adicionar colunas como: `spotify_id`, `relationship_status` (solteiro/casado), `unna_coins` (saldo), e `favorite_vibes` (array de gostos musicais).
- **Tabelas Financeiras:** `transactions` e `wallets` para suportar a fila do bar digital, ingressos e rachar conta.

---

## 2. O Fluxo de Criar Perfil (Onboarding) 📱
Sim, o seu cadastro atual precisaria evoluir, mas **ATENÇÃO:** Nós NÃO podemos colocar 10 telas de cadastro logo de cara, senão as pessoas desistem de baixar o app. Usaríamos a técnica de **Onboarding Progressivo**:

- **No Cadastro Inicial:** Pede só o básico (Foto, Nome, Senha, Idade).
- **Onboarding Interativo (Tela Nova):** Uma tela estilo Tinder onde a pessoa seleciona umas "bolhas" flutuantes com o que ela gosta ("Samba", "Rock", "Eletrônica") pra IA já começar a trabalhar.
- **Ao tentar dar um Match pela 1ª vez:** O app abre um pop-up pedindo: *"Para usar isso, ative o Modo Solteiro no perfil!"*.
- **Ao tentar ouvir música pela 1ª vez:** O app pede: *"Conecte seu Spotify para acharmos sua vibe!"*.

Ou seja, as telas do perfil terão mais configurações, mas o usuário só preenche quando for usar aquela função específica.

---

## 3. Código do Aplicativo (React Native / Expo) ⚙️
No código fonte que temos hoje, precisaríamos instalar e configurar os seguintes "motores" pesados:

- **GPS em Segundo Plano (Background Location):** Para a "Bússola de Amigos" e o "Modo Balada" saberem que você chegou na festa sem você precisar abrir o app. Isso exige pedir permissão pesada de Localização pro usuário.
- **Motor de Câmera Nativa (`react-native-vision-camera`):** Para o usuário gravar os "Stories do Evento" dentro do app com alta qualidade, sem sair pro app de câmera do celular.
- **Gateway de Pagamento (Stripe ou Mercado Pago):** Para processar dinheiro de verdade (Ingressos, Rachar Conta, Bebidas). Exige muito cuidado com segurança.
- **Sockets (Realtime) Avançado:** O Supabase Realtime já faz o chat hoje, mas teríamos que usá-lo no talo para a Bússola atualizar a posição do amigo a cada 1 segundo sem travar o celular.

---

### 🚦 Conclusão: É viável fazer tudo de uma vez?
**NÃO!** Se tentarmos mudar toda a fundação de uma vez, vamos demorar 1 ano para lançar o app. 

A estratégia de ouro do Vale do Silício é o **M.V.P.** (Produto Mínimo Viável). 
O que eu faria no seu lugar: **Escolher apenas a Tabela `event_attendees` (Eu vou) e o "Efeito FOMO" para programar esta semana.** 
Isso exige zero mexidas no cadastro e quase nenhuma mudança estrutural, mas já dobra o valor do app para o usuário!
