// Helpers pra validação e formatação de cartão de crédito.
// Não é PCI compliant — pra validação básica antes de mandar pro Asaas.

// Máscara: 0000 0000 0000 0000 (16 dígitos com espaço a cada 4)
export function maskCardNumber(input) {
  const d = String(input || '').replace(/\D/g, '').slice(0, 19)
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

// MM/AA
export function maskCardExpiry(input) {
  const d = String(input || '').replace(/\D/g, '').slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}/${d.slice(2)}`
}

// CVV — só dígitos, até 4 (Amex tem 4)
export function maskCardCvv(input) {
  return String(input || '').replace(/\D/g, '').slice(0, 4)
}

// CEP — 00000-000
export function maskCep(input) {
  const d = String(input || '').replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

// Detecta bandeira (visa, mastercard, amex, elo, hipercard)
export function detectCardBrand(number) {
  const n = String(number || '').replace(/\D/g, '')
  if (!n) return null
  if (/^4/.test(n)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n)) return 'amex'
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(n)) return 'elo'
  if (/^(606282|3841)/.test(n)) return 'hipercard'
  return 'unknown'
}

// Valida cartão via algoritmo Luhn
export function validateCardNumber(number) {
  const n = String(number || '').replace(/\D/g, '')
  if (n.length < 13 || n.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = n.length - 1; i >= 0; i--) {
    let d = parseInt(n.charAt(i), 10)
    if (alt) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

// Valida validade (MM/AA não pode ser passado)
export function validateCardExpiry(mmyy) {
  const m = mmyy.match(/^(\d{2})\/(\d{2})$/)
  if (!m) return false
  const month = parseInt(m[1], 10)
  const year = 2000 + parseInt(m[2], 10)
  if (month < 1 || month > 12) return false
  const now = new Date()
  const exp = new Date(year, month, 0, 23, 59, 59)  // último dia do mês
  return exp >= now
}

export function parseExpiry(mmyy) {
  const m = mmyy.match(/^(\d{2})\/(\d{2})$/)
  if (!m) return null
  return {
    month: m[1],
    year: '20' + m[2],
  }
}
