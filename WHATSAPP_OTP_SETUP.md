# Verificação por WhatsApp — Setup

A feature de verificar conta por código no WhatsApp depende de um **template HSM aprovado pela Meta**. Sem template aprovado, o WhatsApp retorna erro e o app cai automaticamente pro fallback de email — então a feature funciona desde já, só não usa WhatsApp.

## Passo 1: Rodar a migration

No **Supabase → SQL Editor**, rode o conteúdo de `supabase-migration-phone-verification.sql`. Isso:
- Adiciona `account_verified_at` em `user_profiles`
- Marca usuários antigos (com email confirmado) como já verificados
- Cria tabela `phone_verifications`

## Passo 2: Desligar Email Confirmation no Supabase

Vá em **Supabase → Authentication → Providers → Email** e:
- **Confirm email**: OFF

Isso faz o `signUp` já retornar sessão (sem precisar do email). Aí o app redireciona direto pra `/verify`, que oferece WhatsApp OU email.

> Se mantiver ON, o fluxo antigo de email continua valendo — o app cai pra `/confirm` e a verificação por WhatsApp não aparece.

## Passo 3: Criar template HSM no Business Manager

1. Acesse [business.facebook.com/wa/manage/message-templates](https://business.facebook.com/wa/manage/message-templates) — escolha sua conta WhatsApp Business.
2. **Criar template** → **Categoria: Authentication** (importante: não pode ser Utility/Marketing).
3. Preencha:
   - **Nome do template**: `domus_auth_code`
   - **Idioma**: Portuguese (BR) — `pt_BR`
4. **Conteúdo do template**:
   - **Corpo (Body)**: marque "Adicionar código de segurança" / "Add security recommendation" (a Meta gera o texto padrão automaticamente; algo como:
     ```
     {{1}} é o seu código de verificação. Por segurança, não compartilhe esse código.
     ```
     )
   - **Tipo de OTP**: "Copy code button" (botão de copiar)
   - **Validade do código**: 10 minutos (opcional, mas recomendado)
5. **Submeter para aprovação**. Tipicamente leva 1-72h; templates de Authentication são aprovados muito rápido se você seguir o formato sugerido pela Meta.

> **Importante**: A categoria *Authentication* tem um limite mensal generoso (~250 conversas grátis no plano de baixo volume), e o custo por conversa autenticada é mais baixo que Utility/Marketing.

## Passo 4: Variáveis de ambiente no Vercel

Já existem (do Alfred):
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`

Opcionalmente, sobrescreva:
- `WHATSAPP_OTP_TEMPLATE` — default: `domus_auth_code`
- `WHATSAPP_OTP_LANG` — default: `pt_BR`

Se você usar outro nome de template (porque a Meta exige variação), só setar `WHATSAPP_OTP_TEMPLATE`.

## Passo 5: Testar

1. Crie uma conta nova
2. Em `/verify`, clique em "Receber código no WhatsApp"
3. Você deve receber a mensagem do template em segundos
4. Digite o código → libera acesso

Se aparecer "WhatsApp ainda não disponível. Use a opção de email":
- Template ainda em aprovação
- OU nome do template no Business Manager ≠ `WHATSAPP_OTP_TEMPLATE` env var
- OU número não confere

Logs detalhados aparecem em **Vercel → Logs** filtrando por `/api/verify-send`.

## Custo

- WhatsApp Auth no Brasil: ~R$ 0,03–0,05 por conversa (template aprovado)
- Cada cadastro novo = 1 conversa de auth (a menos que você reenvie muito)
- Comparativo: SMS no Brasil ~R$ 0,20–0,30

## Como funciona o fallback

`/api/verify-send` recebe `{ method: 'whatsapp' | 'email' }`:
- `whatsapp` → tenta mandar template. Se Meta retorna erro de template (132000/132001) ou número inválido (131026/131047), backend retorna 502 com `fallback: 'email'` no body.
- `email` → backend chama `supabase.auth.admin.generateLink({ type: 'signup' })` que reenvia o email padrão de confirmação do Supabase.

O UI mostra os dois botões desde o início — o usuário sempre pode escolher.
