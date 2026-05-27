import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('./public/icon-512.svg')
await sharp(svg).png().toFile('./public/apple-touch-icon.png')
console.log('apple-touch-icon.png gerado com sucesso!')
