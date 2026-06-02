// Gera assets pra ficha da Play Store:
//  - play-store/icon-512.png         (ícone alta resolução, 512x512)
//  - play-store/feature-graphic.png  (banner topo da loja, 1024x500)
//
// Roda: node scripts/generate-play-store-assets.mjs

import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

const BG = '#0a0e1a'
const GOLD = '#c9a961'
const LOGO = 'public/domus-logo-512.png'
const OUT = 'play-store'

async function main() {
  await fs.mkdir(OUT, { recursive: true })

  // 1) Ícone 512x512 — só o logo do Domus, sem fundo (Play Store aplica corner radius)
  await sharp(LOGO)
    .resize(512, 512, { fit: 'contain', background: BG })
    .flatten({ background: BG })
    .png()
    .toFile(path.join(OUT, 'icon-512.png'))
  console.log('✓ play-store/icon-512.png')

  // 2) Feature graphic 1024x500 — banner do topo da listing
  // Fundo dark + logo centrado-esquerda + texto "Domus" e tagline à direita
  const logoSize = 280
  const logoX = 60
  const logoY = (500 - logoSize) / 2
  const logoBuf = await sharp(LOGO).resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()

  // SVG do texto (Fraunces fica próximo da identidade do app)
  const textSvg = `
    <svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f4e4a8"/>
          <stop offset="50%" stop-color="${GOLD}"/>
          <stop offset="100%" stop-color="#8b6f2f"/>
        </linearGradient>
      </defs>
      <text x="400" y="200"
        font-family="Georgia, serif"
        font-size="92"
        fill="url(#gold)"
        font-style="italic"
        font-weight="500">Domus</text>
      <text x="400" y="265"
        font-family="Arial, sans-serif"
        font-size="32"
        fill="white"
        opacity="0.95">Suas finanças. Sua agenda.</text>
      <text x="400" y="310"
        font-family="Arial, sans-serif"
        font-size="32"
        fill="white"
        opacity="0.95">Seu mordomo no WhatsApp.</text>
      <text x="400" y="380"
        font-family="Arial, sans-serif"
        font-size="22"
        fill="${GOLD}"
        opacity="0.85">🎩 Alfred aguarda suas ordens.</text>
    </svg>
  `

  await sharp({
    create: { width: 1024, height: 500, channels: 4, background: BG },
  })
    .composite([
      { input: logoBuf, left: logoX, top: logoY },
      { input: Buffer.from(textSvg), top: 0, left: 0 },
    ])
    .png()
    .toFile(path.join(OUT, 'feature-graphic.png'))
  console.log('✓ play-store/feature-graphic.png')

  console.log('\n🎩 Assets pra Play Store gerados em play-store/')
  console.log('   Você ainda precisa preparar:')
  console.log('   - 2 a 8 screenshots do app rodando (1080x1920 ou similar)')
}

main().catch((err) => {
  console.error('❌ Erro:', err)
  process.exit(1)
})
