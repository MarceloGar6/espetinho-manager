# Espetinho Manager — MVP

Sistema web mobile-first para pedidos presenciais, produtos, status e pagamentos.

## Requisitos

Node.js 20+ e conta Supabase.

## Configuração

1. Crie um projeto em [Supabase](https://supabase.com/).
2. No SQL Editor, execute `supabase/migrations/001_initial_schema.sql`.
3. Copie `.env.example` para `.env` e preencha a URL e a chave publicável do Supabase.
4. No Supabase, abra Authentication > Users > Add user e crie o primeiro usuário.
5. Copie o UUID do usuário e execute no SQL Editor:

   `update public.perfis set papel='administrador' where id='UUID_DO_USUARIO';`

6. Instale as dependências:

   `npm install`

7. Execute a configuração automatizada do Supabase 
   **URL do sistema (APP_URL):**
   - **Desenvolvimento local:** execute `npm run dev` e utilize a URL exibida pelo Vite no terminal. Normalmente é `http://localhost:5173`.
   - **Sistema publicado:** utilize a URL fornecida pela hospedagem, por exemplo, `https://espetinho-manager.pages.dev`.
   Essa URL é utilizada pela Edge Function `gerenciar-usuarios` para redirecionar os funcionários durante o primeiro acesso por convite. Não adicione uma barra (`/`) no final do endereço.
   Execute no terminal:

   `npm run configurar:supabase`

   O script verifica a autenticação, solicita o Project ID e a URL do sistema, vincula o projeto, configura o Secret `APP_URL` e publica a Edge Function `gerenciar-usuarios`.

   Caso ainda não esteja autenticado, execute uma única vez `npx supabase login` em um terminal normal e depois rode novamente o script.

8. Inicie o sistema:

   `npm run dev`

## Gerenciamento de usuários

O sistema possui uma área para gerenciamento de usuários, permitindo listar funcionários, enviar convites por e-mail e ativar ou desativar contas.

Essa funcionalidade utiliza a Edge Function `gerenciar-usuarios`, localizada em `supabase/functions/gerenciar-usuarios/index.ts`.

A configuração e publicação da função são realizadas automaticamente pelo script `configurar-supabase.ps1`, por meio do comando:

`npm run configurar:supabase`

A função utiliza a variável `APP_URL` para definir o endereço de redirecionamento dos convites por e-mail. Durante o desenvolvimento, utilize `http://localhost:5173`. Na publicação, utilize o endereço do sistema hospedado.

## Build

`npm run build` gera a pasta `dist`, que pode ser publicada no Cloudflare Pages. Configure as variáveis de ambiente também na hospedagem e habilite fallback SPA para `index.html`.

## Segurança

Nunca coloque a chave `service_role` no frontend. O sistema usa RLS e funções RPC para criação de pedido, alteração de status e pagamento. A Edge Function de gerenciamento de usuários utiliza permissões administrativas e permite operações apenas para administradores ativos. Crie funcionários pelo próprio sistema; o trigger cria perfil padrão de funcionário.

## Escopo do MVP

Login, dashboard, produtos/categorias, pedidos presenciais, acompanhamento, pagamentos manuais, gerenciamento de usuários e relatórios básicos. Exige internet; não inclui WhatsApp automático, delivery, estoque de ingredientes, emissão fiscal ou integração com maquininhas.
