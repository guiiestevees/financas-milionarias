# Templates de Email para Supabase Auth

Configure no painel do Supabase: **Authentication → Email Templates**.

Existem 5 templates pra customizar. Cole o HTML de cada seção no template correspondente.

---

## 1. Confirm signup (cadastro)

**Subject:** 🎩 Confirme seu acesso — Domus

**Message body (HTML):**

```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f6f1;color:#1a1a1a;line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:32px 28px;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
    <div style="text-align:center;border-bottom:1px solid #eee;padding-bottom:20px;margin-bottom:24px;">
      <div style="font-family:Georgia,serif;font-size:24px;color:#1a1a1a;">🎩 <strong>Alfred</strong></div>
      <div style="font-size:12px;color:#888;letter-spacing:0.05em;text-transform:uppercase;margin-top:4px;">Domus</div>
    </div>
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#1a1a1a;margin:0 0 16px;">Ao seu dispor.</h1>
    <p style="color:#444;font-size:15px;">Permita-me confirmar: você acaba de criar sua conta no <strong>Domus</strong>. Bem-vindo.</p>
    <p style="color:#444;font-size:15px;">Para ativar o acesso, basta clicar no botão abaixo:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 28px;background:linear-gradient(180deg,#c9a961,#a88a4a);color:#0a0d18;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Confirmar e acessar</a>
    </div>
    <p style="color:#888;font-size:13px;text-align:center;">Você ganhou <strong>7 dias gratuitos</strong> para conhecer tudo — sem cartão, sem pegadinha.</p>
    <div style="border-top:1px solid #eee;margin-top:28px;padding-top:20px;font-size:12px;color:#999;text-align:center;">
      Ao seu dispor,<br><strong style="color:#666;">Alfred · Domus</strong>
    </div>
  </div>
</body></html>
```

---

## 2. Magic Link (login sem senha)

**Subject:** 🎩 Acesso direto — Domus

**Message body:**

```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f6f1;color:#1a1a1a;line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:32px 28px;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
    <div style="text-align:center;border-bottom:1px solid #eee;padding-bottom:20px;margin-bottom:24px;">
      <div style="font-family:Georgia,serif;font-size:24px;color:#1a1a1a;">🎩 <strong>Alfred</strong></div>
      <div style="font-size:12px;color:#888;letter-spacing:0.05em;text-transform:uppercase;margin-top:4px;">Domus</div>
    </div>
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#1a1a1a;margin:0 0 16px;">Seu acesso, pronto.</h1>
    <p style="color:#444;font-size:15px;">Você solicitou um link para acessar sua conta. Basta clicar abaixo — o login é automático.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 28px;background:linear-gradient(180deg,#c9a961,#a88a4a);color:#0a0d18;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Acessar minha conta</a>
    </div>
    <p style="color:#888;font-size:13px;text-align:center;">Por segurança, este link funciona apenas uma vez e expira em 1 hora.</p>
    <p style="color:#888;font-size:13px;text-align:center;">Não foi você? Pode ignorar este email — sua conta permanece segura.</p>
    <div style="border-top:1px solid #eee;margin-top:28px;padding-top:20px;font-size:12px;color:#999;text-align:center;">
      Ao seu dispor,<br><strong style="color:#666;">Alfred · Domus</strong>
    </div>
  </div>
</body></html>
```

---

## 3. Reset Password (recuperar senha)

**Subject:** 🎩 Redefinir sua senha — Domus

**Message body:**

```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f6f1;color:#1a1a1a;line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:32px 28px;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
    <div style="text-align:center;border-bottom:1px solid #eee;padding-bottom:20px;margin-bottom:24px;">
      <div style="font-family:Georgia,serif;font-size:24px;color:#1a1a1a;">🎩 <strong>Alfred</strong></div>
      <div style="font-size:12px;color:#888;letter-spacing:0.05em;text-transform:uppercase;margin-top:4px;">Domus</div>
    </div>
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#1a1a1a;margin:0 0 16px;">Redefinir senha</h1>
    <p style="color:#444;font-size:15px;">Recebi seu pedido para redefinir a senha. Clique abaixo para escolher uma nova:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 28px;background:linear-gradient(180deg,#c9a961,#a88a4a);color:#0a0d18;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Redefinir senha</a>
    </div>
    <div style="background:#fef9ed;border-left:3px solid #c9a961;padding:12px 16px;border-radius:6px;font-size:13px;color:#555;margin:16px 0;">
      <strong>⚠ Não foi você?</strong> Pode ignorar este email com tranquilidade. Sua senha atual permanece intacta enquanto não clicar no link.
    </div>
    <p style="color:#888;font-size:13px;text-align:center;">Este link expira em 1 hora por segurança.</p>
    <div style="border-top:1px solid #eee;margin-top:28px;padding-top:20px;font-size:12px;color:#999;text-align:center;">
      Ao seu dispor,<br><strong style="color:#666;">Alfred · Domus</strong>
    </div>
  </div>
</body></html>
```

---

## 4. Change Email Address (trocar email)

**Subject:** 🎩 Confirmar troca de email — Domus

**Message body:**

```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f6f1;color:#1a1a1a;line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:32px 28px;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
    <div style="text-align:center;border-bottom:1px solid #eee;padding-bottom:20px;margin-bottom:24px;">
      <div style="font-family:Georgia,serif;font-size:24px;color:#1a1a1a;">🎩 <strong>Alfred</strong></div>
      <div style="font-size:12px;color:#888;letter-spacing:0.05em;text-transform:uppercase;margin-top:4px;">Domus</div>
    </div>
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#1a1a1a;margin:0 0 16px;">Confirmar novo email</h1>
    <p style="color:#444;font-size:15px;">Você pediu para trocar o email de acesso da sua conta para <strong>{{ .NewEmail }}</strong>.</p>
    <p style="color:#444;font-size:15px;">Para confirmar e ativar o novo endereço, basta clicar abaixo:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 28px;background:linear-gradient(180deg,#c9a961,#a88a4a);color:#0a0d18;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Confirmar troca de email</a>
    </div>
    <div style="background:#fef0f0;border-left:3px solid #ef4444;padding:12px 16px;border-radius:6px;font-size:13px;color:#555;margin:16px 0;">
      <strong>⚠ Não solicitou esta troca?</strong> Acesse imediatamente sua conta, altere a senha e ignore este email.
    </div>
    <div style="border-top:1px solid #eee;margin-top:28px;padding-top:20px;font-size:12px;color:#999;text-align:center;">
      Ao seu dispor,<br><strong style="color:#666;">Alfred · Domus</strong>
    </div>
  </div>
</body></html>
```

---

## 5. Invite User (convidar usuário — opcional, pra futuro)

**Subject:** 🎩 Você foi convidado — Domus

**Message body:**

```html
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f6f1;color:#1a1a1a;line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:32px 28px;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
    <div style="text-align:center;border-bottom:1px solid #eee;padding-bottom:20px;margin-bottom:24px;">
      <div style="font-family:Georgia,serif;font-size:24px;color:#1a1a1a;">🎩 <strong>Alfred</strong></div>
      <div style="font-size:12px;color:#888;letter-spacing:0.05em;text-transform:uppercase;margin-top:4px;">Domus</div>
    </div>
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#1a1a1a;margin:0 0 16px;">Você foi convidado.</h1>
    <p style="color:#444;font-size:15px;">Permita-me dar as boas-vindas. Você foi convidado a fazer parte do <strong>Domus</strong> — onde cuidaremos das suas finanças com a discrição e o zelo que merecem.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 28px;background:linear-gradient(180deg,#c9a961,#a88a4a);color:#0a0d18;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Aceitar convite</a>
    </div>
    <div style="border-top:1px solid #eee;margin-top:28px;padding-top:20px;font-size:12px;color:#999;text-align:center;">
      Ao seu dispor,<br><strong style="color:#666;">Alfred · Domus</strong>
    </div>
  </div>
</body></html>
```

---

# 🔌 Configurar SMTP do Resend no Supabase

Pra os emails saírem com seu domínio (e não com o `noreply@supabase.co`):

1. **Pega a Resend API Key** (você já criou)
2. No Supabase: **Authentication → SMTP Settings**
3. Liga o toggle **"Enable Custom SMTP"**
4. Preenche:

| Campo | Valor |
|---|---|
| **Sender email** | `onboarding@resend.dev` (ou seu domínio se já verificou) |
| **Sender name** | `Alfred — Domus` |
| **Host** | `smtp.resend.com` |
| **Port** | `465` |
| **Username** | `resend` |
| **Password** | (cola sua RESEND_API_KEY, a `re_xxx...`) |
| **Minimum interval** | `60` segundos (rate limit, padrão tá bom) |

5. Salva. Pronto — todos os emails do Supabase passam pelo Resend.

---

# ✅ Checklist final

```
[ ] Configurar SMTP do Resend no Supabase
[ ] Colar Template 1 (Confirm signup)
[ ] Colar Template 2 (Magic Link)
[ ] Colar Template 3 (Reset Password)
[ ] Colar Template 4 (Change Email)
[ ] (Opcional) Template 5 (Invite User)
[ ] Mandar email de teste pra você mesmo (Auth → Users → "..." → Send magic link)
```
