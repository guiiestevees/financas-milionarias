# 🚀 Guia de publicação do Domus na Google Play Store

Passo a passo prático pra subir o app. Tempo estimado: ~2 horas pro primeiro envio.

---

## ✅ Pré-requisitos (checklist)

- [x] App Bundle (.aab) assinado em `android/app/build/outputs/bundle/release/app-release.aab`
- [x] Ícone 512x512 em `play-store/icon-512.png`
- [x] Feature graphic 1024x500 em `play-store/feature-graphic.png`
- [x] Texto da descrição em `play-store/LISTING-PLAYSTORE.md`
- [ ] **Conta Google** (Gmail) pra criar a conta de developer
- [ ] **US$ 25** pagáveis no cartão de crédito internacional ou débito
- [ ] **Documento de identificação** (RG ou CNH) pra verificação de identidade
- [ ] **Empresa Alquimia Digital LTDA** pra criar conta business (recomendado)
- [ ] **Screenshots** do app rodando (mínimo 2, máximo 8)

---

## 📝 Parte 1 — Criar conta no Google Play Console

1. Acesse: **https://play.google.com/console/signup**

2. Faça login com a conta Gmail (recomendo usar o **alquimiadigital08@gmail.com**)

3. Tipo de conta:
   - **Conta de organização (recomendado)** — usa CNPJ da Alquimia Digital
   - OU "Conta de pessoa física"

4. Preencha os dados:
   - Nome da empresa: **Alquimia Digital LTDA**
   - CNPJ: **58.491.823/0001-47**
   - Tipo de empresa: **LTDA**
   - Endereço completo da empresa
   - Telefone e email pra contato

5. **Pagar US$ 25** (taxa única, não recorrente)
   - Cartão de crédito internacional
   - Pode usar débito Visa/Mastercard
   - Confirma o pagamento

6. **Verificação de identidade:**
   - Foto de documento (RG ou CNH) frente e verso
   - Pode levar 1-5 dias úteis pra ser aprovada
   - **Você pode começar a configurar o app antes da aprovação completa**

---

## 📦 Parte 2 — Criar o app no Play Console

1. Depois de logado, clique em **"Criar app"**

2. Preencha:
   - **Nome do app:** `Domus — Finanças e Agenda`
   - **Idioma padrão:** Português (Brasil)
   - **Tipo:** App
   - **Pago/Gratuito:** Gratuito (porque assinatura é externa)

3. Marque as declarações:
   - ☑️ "Declaro que estou em conformidade com as Diretrizes para Desenvolvedores"
   - ☑️ "Declaro que estou em conformidade com as leis de exportação dos EUA"

4. Clique em **"Criar app"**

---

## 🎨 Parte 3 — Configurar a ficha da loja

No menu lateral: **Crescer → Presença na loja → Listagem na Play Store principal**

### Detalhes do app
- **Nome do app:** `Domus — Finanças e Agenda`
- **Descrição curta:** copia de `LISTING-PLAYSTORE.md`
- **Descrição completa:** copia de `LISTING-PLAYSTORE.md`

### Recursos gráficos
- **Ícone do app:** upload `play-store/icon-512.png`
- **Gráfico do recurso:** upload `play-store/feature-graphic.png`
- **Telefone Screenshots:** upload de 2 a 8 screenshots (mínimo 2)

### Contato
- **Email:** `alquimiadigital08@gmail.com`
- **Site:** `https://meudomus.com`
- **Política de privacidade:** `https://meudomus.com/privacidade`

### Categoria
- **Categoria:** Finanças
- **Tags:** copia de `LISTING-PLAYSTORE.md`

---

## 🔒 Parte 4 — Segurança e privacidade

Menu: **Política → Segurança de dados**

Responda o questionário. Pontos importantes:

1. **Você coleta ou compartilha dados do usuário?** Sim
2. **Tipos de dados:**
   - Nome (necessário)
   - Email (necessário)
   - Endereço (necessário pra nota fiscal)
   - Telefone (opcional)
   - Documento (CPF, pra nota fiscal)
3. **Criptografia em trânsito?** Sim
4. **Usuário pode pedir exclusão?** Sim (em Configurações do app)
5. **Coleta de dados é necessária pra usar o app?** Sim (precisa de conta)

---

## 📱 Parte 5 — Classificação de conteúdo

Menu: **Política → Classificação de conteúdo**

Responde o questionário. Pra app de finanças:
- ❌ Sem violência
- ❌ Sem conteúdo sexual
- ❌ Sem drogas, álcool, tabaco
- ❌ Sem jogos de azar
- ❌ Sem palavrões
- ✅ Coleta dados de localização: NÃO
- ✅ Permite que usuários interajam: NÃO

Resultado esperado: **Tudo (Livre / 3+)**

---

## 📂 Parte 6 — Subir o App Bundle

Menu: **Versão → Produção → Criar nova versão**

1. Em "Bundles do app", clique em **"Fazer upload"**

2. Arraste o arquivo:
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```
   (tamanho ~4 MB)

3. **Notas da versão (português):**
   ```
   🎩 Primeira versão do Domus!

   • Controle financeiro completo
   • Agenda inteligente com lembretes
   • Alfred no WhatsApp (texto e áudio)
   • Cofres de objetivos
   • Visão diária, semanal e mensal
   ```

4. Clique em **"Avançar"** → **"Salvar"**

---

## 🌍 Parte 7 — Países e distribuição

Menu: **Versão → Países / Regiões**

- ✅ Brasil (principal)
- ✅ Portugal (recomendado, mesma língua)
- ✅ Países com brasileiros: EUA, Canadá, Reino Unido, Espanha, França, Alemanha, Japão, Austrália

---

## 🚀 Parte 8 — Enviar pra análise

1. Volta em **Versão → Produção**

2. Verifica que tudo tá ✅:
   - Listagem principal preenchida ✅
   - Segurança de dados preenchida ✅
   - Classificação de conteúdo preenchida ✅
   - Bundle enviado ✅
   - Países selecionados ✅

3. Clica em **"Revisar versão"**

4. Confirma e clica em **"Iniciar lançamento"**

5. **Tempo de análise:** 1-7 dias (média 24-48h)

---

## ⚠️ Atenção sobre "Reader App" no Google

Diferente da Apple, o Google **NÃO exige IAP** com a mesma rigidez. Você
pode até ter botão pra checkout externo na Play Store sem maiores problemas
(post-Epic v Google de 2024).

**MAS** — como nosso app já está configurado como Reader App (sem checkout
interno), a aprovação no Google é praticamente garantida. Não tem o que
revisar — não vendemos nada digital pelo app.

---

## 📊 Após a publicação

- App estará visível em **play.google.com/store/apps/details?id=com.alquimiadigital.domus**
- Updates futuros: build o novo .aab, sobe no console, marca como "Lançamento de produção" — review costuma ser <12h

---

## 🆘 Problemas comuns

### "Bundle não tem mapeamento ProGuard"
Não é obrigatório, pode ignorar pra primeira versão.

### "Política de privacidade não acessível"
Garanta que https://meudomus.com/privacidade está respondendo 200 OK.

### "Faltam declarações de permissão"
O app não pede permissões nativas (só internet). Sem problema.

### "Conta ainda não verificada"
Pode levar até 5 dias úteis pra Google verificar. Você pode preencher tudo
e enviar — fica em "Pending Approval" até a verificação sair.
