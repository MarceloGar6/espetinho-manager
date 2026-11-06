# Espetinho Manager — MVP

Sistema web mobile-first para pedidos presenciais, produtos, status e pagamentos.

## Requisitos
Node.js 20+ e conta Supabase.

## Configuração
1. Crie um projeto em https://supabase.com/.
2. No SQL Editor, execute `supabase/migrations/001_initial_schema.sql`.
3. Copie `.env.example` para `.env` e preencha a URL e a chave publicável do Supabase.
4. No Supabase, abra Authentication > Users > Add user e crie o primeiro usuário.
5. Copie o UUID do usuário e execute no SQL Editor:
   `update public.perfis set papel='administrador' where id='UUID_DO_USUARIO';`
6. Instale e execute:
   `npm install`
   `npm run dev`

## Build
`npm run build` gera a pasta `dist`, que pode ser publicada no Cloudflare Pages. Configure as variáveis de ambiente também na hospedagem e habilite fallback SPA para `index.html`.

## Segurança
Nunca coloque a chave `service_role` no frontend. O sistema usa RLS e funções RPC para criação de pedido, alteração de status e pagamento. Crie funcionários em Authentication > Users; o trigger cria perfil padrão de funcionário.

## Escopo do MVP
Login, dashboard, produtos/categorias, pedidos presenciais, acompanhamento, pagamentos manuais e relatórios básicos. Exige internet; não inclui WhatsApp automático, delivery, estoque de ingredientes, emissão fiscal ou integração com maquininhas.
