// Gera os assets de origem (icon + splash) pra @capacitor/assets consumir.
// Lê public/domus-logo-512.png e produz:
//  - resources/icon.png         1024x1024 (a logo cheia)
//  - resources/icon-foreground.png  1024x1024 (logo centralizada com safe area 60%)
//  - resources/icon-background.png  1024x1024 (fundo dark sólido)
//  - resources/splash.png       2732x2732 (logo centralizada em fundo dark)
//  - resources/splash-dark.png  idem (Android dark mode)

import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

const BG = '#0a0e1a'  // bg-app dark (mesmo do app)
const LOGO_PATH = 'public/domus-logo-512.png'
const OUT_DIR = 'resources'

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function main() {
  await ensureDir(OUT_DIR)
  const logo = await sharp(LOGO_PATH).resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()

  // 1) icon.png — logo cheia 1024x1024 (fundo transparente)
  await sharp(logo).png().toFile(path.join(OUT_DIR, 'icon.png'))
  console.log('✓ resources/icon.png')

  // 2) icon-foreground.png — Android adaptive icon (logo com 60% de safe area no centro)
  // Android crops a foreground em 67% antes de aplicar máscara, então a logo dentro fica menor
  const fgSize = 1024
  const innerSize = Math.round(fgSize * 0.60)  // logo ocupa 60% (safe area)
  const innerLogo = await sharp(LOGO_PATH).resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
  await sharp({
    create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: innerLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, 'icon-foreground.png'))
  console.log('✓ resources/icon-foreground.png')

  // 3) icon-background.png — fundo sólido dark
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: BG },
  })
    .png()
    .toFile(path.join(OUT_DIR, 'icon-background.png'))
  console.log('✓ resources/icon-background.png')

  // 4) splash.png — 2732x2732 fundo dark + logo centralizado a 30% do tamanho
  const splashSize = 2732
  const splashLogoSize = Math.round(splashSize * 0.30)  // logo a 30% da tela
  const splashLogo = await sharp(LOGO_PATH).resize(splashLogoSize, splashLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
  await sharp({
    create: { width: splashSize, height: splashSize, channels: 4, background: BG },
  })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, 'splash.png'))
  console.log('✓ resources/splash.png')

  // 5) splash-dark.png — Capacitor pede pra ter versão dark também (mesma do nosso caso)
  await fs.copyFile(path.join(OUT_DIR, 'splash.png'), path.join(OUT_DIR, 'splash-dark.png'))
  console.log('✓ resources/splash-dark.png')

  console.log('\n🎉 Assets gerados em resources/')
  console.log('   Rode: npx capacitor-assets generate')
}

main().catch((err) => {
  console.error('❌ Erro:', err)
  process.exit(1)
})
