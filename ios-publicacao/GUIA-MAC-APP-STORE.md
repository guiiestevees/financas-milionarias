# 🍎 Guia: publicar o Domus na App Store (passo a passo no Mac)

Guia pensado pra quem está **começando do zero num Mac novo**.
Siga na ordem. Tempo total estimado: 1 dia (a maior parte é download do Xcode e espera da Apple).

---

## ETAPA 0 — Conta Apple Developer (pode fazer em paralelo)

1. Acesse https://developer.apple.com/programs/enroll/
2. Entre com seu Apple ID (o mesmo do Mac)
3. Escolha **Individual** (pessoa física — NÃO precisa de DUNS, diferente da conta organização)
4. Pague a anuidade: **US$ 99/ano** (~R$ 550)
5. A aprovação leva de algumas horas a 2 dias

> ⚠️ Sem essa conta não dá pra publicar. Faça isso PRIMEIRO porque tem espera.

---

## ETAPA 1 — Instalar as ferramentas no Mac

### 1.1 Xcode (o maior download — comece já)
1. Abra a **App Store** do Mac
2. Busque **Xcode** e instale (são ~12 GB, demora)
3. Depois de instalado, abra o Xcode uma vez e aceite os termos
4. No Terminal (Cmd+Espaço → digite "Terminal"):
   ```bash
   xcode-select --install
   sudo xcodebuild -license accept
   ```

### 1.2 Homebrew (gerenciador de pacotes do Mac)
No Terminal:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Siga as instruções que aparecem no final (ele pede pra rodar 2 comandos `eval`).

### 1.3 Node.js, Git e CocoaPods
```bash
brew install node git cocoapods
```
Confirme que funcionou:
```bash
node -v    # deve mostrar v20+ ou v22+
git --version
pod --version
```

---

## ETAPA 2 — Clonar o projeto

### 2.1 Login no GitHub
```bash
brew install gh
gh auth login
```
Escolha: GitHub.com → HTTPS → Login with a web browser → siga o link.
(Conta: **guiiestevees**)

### 2.2 Clonar
```bash
cd ~/Documents
gh repo clone guiiestevees/financas-milionarias domus
cd domus
```

### 2.3 Criar o arquivo de variáveis de ambiente
O arquivo `.env.local` não vai no Git (é ignorado). Crie ele:
```bash
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://rtiehvkvbjblaulyupkv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_G1SLmoXJjz0sXhcRSFYCTA_hY3I00Fj
EOF
```
> Essas chaves são as "públicas" do Supabase (vão no bundle do app de qualquer forma). As chaves SECRETAS ficam só na Vercel — nunca copie elas pro Mac.

### 2.4 Instalar dependências e buildar
```bash
npm install
npm run build
npx cap sync ios
```
O `cap sync ios` copia o app web pra dentro do projeto iOS e instala os Pods.
Se der erro de pods, rode: `cd ios/App && pod install && cd ../..`

---

## ETAPA 3 — Abrir no Xcode e configurar assinatura

```bash
npx cap open ios
```

No Xcode:
1. No painel esquerdo, clique no projeto **App** (ícone azul no topo)
2. Aba **Signing & Capabilities**
3. Marque ✅ **Automatically manage signing**
4. Em **Team**, selecione sua conta (aparece depois que a Apple aprovar sua conta developer — adicione o Apple ID em Xcode → Settings → Accounts se não aparecer)
5. **Bundle Identifier** já está certo: `com.alquimiadigital.domus`

### 3.1 Testar no simulador
1. No topo do Xcode, escolha um simulador (ex: iPhone 16)
2. Aperte **▶ (Cmd+R)**
3. O app deve abrir no iPhone virtual — faça login e teste

### 3.2 Testar no SEU iPhone (recomendado antes de publicar)
1. Conecte o iPhone no Mac via cabo
2. No iPhone: Ajustes → Privacidade e Segurança → Modo Desenvolvedor → ativar
3. No Xcode, selecione seu iPhone como destino e aperte ▶
4. Na primeira vez: iPhone → Ajustes → Geral → VPN e Gerenciamento → confiar no desenvolvedor

---

## ETAPA 4 — Criar o app no App Store Connect

1. Acesse https://appstoreconnect.apple.com
2. **Meus apps → ➕ → Novo app**
3. Preencha:
   - **Plataforma**: iOS
   - **Nome**: Domus — Mordomo Financeiro
   - **Idioma principal**: Português (Brasil)
   - **ID do pacote**: `com.alquimiadigital.domus`
   - **SKU**: `domus-ios-001`
4. Na ficha do app, preencha:
   - **Descrição**: use a mesma da Play Store (arquivo `play-store/LISTING-PLAYSTORE.md`)
   - **Capturas de tela**: tire no simulador (Cmd+S salva no Desktop) — precisa de 6.7" (iPhone 15 Pro Max) e 5.5"
   - **URL de suporte**: https://meudomus.com
   - **Política de privacidade**: https://meudomus.com/privacidade
   - **Categoria**: Finanças

### 4.1 ⚠️ IMPORTANTE — Reader App (já preparado no código)
O app **não tem checkout interno** quando roda como nativo (guideline 3.1.3a da Apple).
Na revisão:
- Em "App Review Information", escreva em inglês:
  > "This is a reader-type app. Subscriptions are managed externally on our website. The app does not sell digital content or link to external purchase flows."
- **Conta demo pra revisão**: a Apple EXIGE um login de teste. Crie uma conta no app com assinatura ativa (use o botão admin "simular pagamento") e informe email/senha no campo "Sign-in required".

---

## ETAPA 5 — Enviar o build

No Xcode:
1. No seletor de dispositivo (topo), escolha **Any iOS Device (arm64)**
2. Menu **Product → Archive** (demora alguns minutos)
3. Na janela que abre: **Distribute App → App Store Connect → Upload**
4. Aceite os defaults e finalize
5. Aguarde ~15 min — o build aparece no App Store Connect em **TestFlight**

De volta ao App Store Connect:
1. Na ficha do app, seção **Build**, selecione o build que subiu
2. Responda o questionário de criptografia: o app usa só HTTPS padrão → **"None of the algorithms mentioned"** / exempt
3. **Salvar → Enviar para revisão**

A revisão da Apple leva de **1 a 3 dias** normalmente.

---

## Resumo dos comandos (depois que tudo estiver instalado)

Sempre que fizer mudanças no app e quiser atualizar o iOS:
```bash
cd ~/Documents/domus
git pull
npm install
npm run build
npx cap sync ios
npx cap open ios
# No Xcode: sobe o número de versão → Product → Archive → Distribute
```

---

## Problemas comuns

| Erro | Solução |
|---|---|
| "No account for team" | Xcode → Settings → Accounts → ➕ → adicionar Apple ID |
| "Failed to install pods" | `cd ios/App && pod repo update && pod install` |
| "Command PhaseScriptExecution failed" | Feche o Xcode, rode `npx cap sync ios` de novo, reabra |
| Build não aparece no App Store Connect | Espere 15-30 min e veja o email (pode ter erro de processamento) |
| "Missing compliance" | Responda o questionário de criptografia no TestFlight |
