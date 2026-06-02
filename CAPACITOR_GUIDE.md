# 📱 Domus Mobile — Guia Capacitor

Como rodar, testar e submeter o app Domus nas lojas (App Store + Google Play).

---

## 🏗 Arquitetura

O Domus mobile é um **app híbrido** baseado em Capacitor.js: a UI é o mesmo React/Vite do web, empacotado dentro de uma WebView nativa.

- `appId`: `com.alquimiadigital.domus`
- `appName`: `Domus`
- Cor de fundo: `#0a0e1a` (dark)
- Plugins instalados: App, StatusBar, SplashScreen, Keyboard, Haptics

**Reader App:** o app não tem checkout. Pagamento/assinatura só no site `meudomus.com`. Veja `src/lib/platform.js` + `src/components/NativeReaderNotice.jsx`.

---

## 🖥 Pré-requisitos

### Pra Android
- **Android Studio** instalado ([baixar](https://developer.android.com/studio))
- **Java 17+** (geralmente vem com Android Studio)
- Funciona em **Windows, macOS e Linux**

### Pra iOS
- **macOS** (obrigatório — Apple não permite build iOS fora do macOS)
- **Xcode 15+** (Mac App Store)
- **CocoaPods** instalado: `sudo gem install cocoapods`

---

## 🚀 Comandos rápidos

```bash
# Sincroniza mudanças do React → projetos nativos (Android + iOS)
npm run cap:sync

# Abre projeto Android no Android Studio
npm run cap:android

# Abre projeto iOS no Xcode (só macOS)
npm run cap:ios

# Roda direto no emulador/dispositivo conectado
npm run cap:android:run
npm run cap:ios:run
```

---

## 🤖 Rodando no Android (passo a passo)

1. Instala Android Studio e abre uma vez pra ele baixar SDK + emulador
2. Cria um emulador (AVD Manager) — recomendo Pixel 7 com Android 14
3. Roda no terminal:
   ```bash
   npm run cap:android
   ```
4. Android Studio abre. Aperta o **botão verde ▶ Play** no topo
5. Seleciona o emulador → app abre

Pra **testar num celular real**:
- Ativa "Opções de desenvolvedor" no celular (toca 7x na build number)
- Liga "USB debugging"
- Conecta no USB → na lista do Android Studio aparece teu device

---

## 🍎 Rodando no iOS (só macOS)

1. Instala Xcode pela Mac App Store
2. Roda no terminal:
   ```bash
   npm run cap:ios
   ```
3. Xcode abre. No topo seleciona um simulador (iPhone 15, iPad, etc)
4. Aperta **▶** ou Cmd+R
5. App roda no simulador

Pra **testar num iPhone real**:
- Conecta no Mac via USB
- Faz login com seu Apple ID no Xcode (Settings → Accounts)
- Seleciona seu device no topo
- Cria provisioning profile (Xcode faz auto pra dev)

---

## 🎨 Customizando ícone e splash screen

### Ícone do app
Substitua os arquivos em:
- **Android:** `android/app/src/main/res/mipmap-*/ic_launcher.png`
- **iOS:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

Ou use o gerador automático (recomendado):
```bash
npm install -D @capacitor/assets
# Coloca uma imagem 1024x1024 em resources/icon.png
# Coloca uma imagem 2732x2732 em resources/splash.png
npx capacitor-assets generate
```

### Splash screen
Configurado em `capacitor.config.json` na seção `SplashScreen`. Duração default: 1.5s.

---

## 🔄 Fluxo de atualização

### Mudou só o React (95% dos casos)
```bash
git push  # Deploy normal no Vercel pro site
# App nativo NÃO precisa de update (carrega do bundle local)
# Mas se quiser refletir no app instalado:
npm run cap:sync  # depois precisa rebuild + republicar nas lojas
```

**Pra atualização instantânea sem republicar**, vamos adicionar [Capacitor Live Updates](https://capacitorjs.com/docs/live-updates) depois da primeira submissão.

### Mudou algo nativo (ícone, plugin novo, permissão)
Aí precisa rebuild + nova submissão pras lojas.

---

## 📤 Submissão pras lojas

### Google Play
1. Cria conta de developer em [play.google.com/console](https://play.google.com/console) (US$ 25 único)
2. No Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**
3. Cria uma keystore (guarde a senha em local seguro!)
4. Upload do `.aab` no Play Console
5. Preenche descrição, screenshots, classificação etária, política de privacidade
6. Review: algumas horas a 1 dia

### Apple App Store
1. Cria conta Apple Developer em [developer.apple.com](https://developer.apple.com) (US$ 99/ano)
2. No Xcode: **Product → Archive**
3. Window → Organizer → Distribute App → App Store Connect
4. Em [App Store Connect](https://appstoreconnect.apple.com), preenche:
   - Descrição, screenshots, palavras-chave
   - **Importante:** na review notes, escreva claramente:
     ```
     This is a "Reader App" as defined in App Store Review Guideline 3.1.3(a).
     Subscriptions are managed externally at meudomus.com. The app provides
     access to previously-acquired content. There are no in-app purchase
     paths within the app — all subscription management happens on our website.
     ```
5. Submete pra review
6. Review: 1-3 dias úteis (primeira submissão pode demorar mais)

---

## ⚠️ Pontos críticos da submissão (Reader App)

A Apple olha com lupa apps que evitam IAP. Pra passar na primeira:

✅ **Já está cumprido no código atual:**
- Sem botão "Assinar" no app
- Sem mostrar preços
- Sem link clicável pra checkout
- Mensagens neutras "gerencie em meudomus.com"
- Botão "copiar endereço" (não navega externamente)

🚨 **NÃO faça:**
- Adicionar botão que abre browser externo direto na página de pagamento (anti-steering — mesmo pós-Epic v Apple, complica)
- Mencionar valores específicos ("R$ 19", "R$ 167") dentro do app
- Direcionar explicitamente: "vá comprar lá"

---

## 🧪 Debug

### App nativo logs (web inspector)
**iOS:** Safari → Develop → [seu device] → [Domus]
**Android:** chrome://inspect → seu device

### Logs do Capacitor no console
```js
// Em qualquer componente
import { Capacitor } from '@capacitor/core'
console.log('platform:', Capacitor.getPlatform())  // 'web' | 'ios' | 'android'
console.log('native:', Capacitor.isNativePlatform())
```

### Limpar e rebuild
```bash
# Limpa caches e força rebuild completo
rm -rf node_modules dist android/app/build ios/App/build
npm install
npm run cap:sync
```

---

## 📞 Suporte / referências

- **Capacitor docs:** https://capacitorjs.com/docs
- **Apple Reader App guideline:** https://developer.apple.com/app-store/review/guidelines/#3.1.3
- **Google Play subscription policies:** https://support.google.com/googleplay/android-developer/answer/10281818
