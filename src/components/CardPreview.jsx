import { useState } from 'react'
import { detectCardBrand } from '../lib/cardUtils'

// Preview visual do cartão de crédito que atualiza enquanto o user digita.
// Vira (flip) pra mostrar o CVV quando o user foca nele.
export default function CardPreview({ number, holderName, expiry, cvv, focused }) {
  const brand = detectCardBrand(number)
  const showCvv = focused === 'cvv'

  // Display formatado do número
  const numberDisplay = number || '•••• •••• •••• ••••'
  const nameDisplay = (holderName || 'NOME NO CARTÃO').toUpperCase()
  const expiryDisplay = expiry || 'MM/AA'

  // Gradiente por bandeira (sutil — não polui)
  const gradients = {
    visa: 'linear-gradient(135deg, #1a1f71 0%, #0f1340 100%)',
    mastercard: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    amex: 'linear-gradient(135deg, #006fcf 0%, #00427a 100%)',
    elo: 'linear-gradient(135deg, #2a2a2a 0%, #0a0a0a 100%)',
    hipercard: 'linear-gradient(135deg, #8b0000 0%, #4a0000 100%)',
    unknown: 'linear-gradient(135deg, #2a2f4a 0%, #0f1525 100%)',
  }
  const bg = gradients[brand] || gradients.unknown

  return (
    <div
      style={{
        perspective: '1000px',
        width: '100%',
        maxWidth: 360,
        margin: '0 auto',
        aspectRatio: '1.586',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: showCvv ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRENTE do cartão */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: 16,
            padding: '20px 24px',
            background: bg,
            color: 'white',
            boxShadow: '0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Topo: chip + bandeira */}
          <div className="flex items-start justify-between">
            <div
              style={{
                width: 36,
                height: 28,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #d4b86a, #a89045)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.85 }}>
              {brand && brand !== 'unknown' ? brand : 'Cartão'}
            </div>
          </div>

          {/* Número */}
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 18,
              letterSpacing: '0.12em',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              fontWeight: 500,
            }}
          >
            {numberDisplay}
          </div>

          {/* Base: nome + validade */}
          <div className="flex items-end justify-between">
            <div>
              <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 2 }}>TITULAR</div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nameDisplay}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 2 }}>VALIDADE</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 500 }}>
                {expiryDisplay}
              </div>
            </div>
          </div>
        </div>

        {/* VERSO do cartão (mostra CVV) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 16,
            background: bg,
            color: 'white',
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Tarja magnética */}
          <div style={{ height: 44, background: '#000', marginTop: 20 }} />

          {/* CVV */}
          <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: '0.1em', marginBottom: 4 }}>CÓDIGO DE SEGURANÇA (CVV)</div>
            <div
              style={{
                background: 'white',
                color: '#000',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '0.2em',
                padding: '6px 12px',
                borderRadius: 4,
                width: 70,
                textAlign: 'center',
              }}
            >
              {cvv || '•••'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
