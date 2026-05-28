import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { maskCep } from '../lib/cardUtils'

// Componente de endereço com autocomplete via ViaCEP.
// Usado no checkout pra cadastrar endereço completo no Asaas (Customer)
// e permitir emissão de nota fiscal.
//
// Props:
//   value: { cep, street, number, complement, neighborhood, city, state }
//   onChange: (newValue) => void
//   disabled?: boolean
//
// Quando o usuário digita um CEP válido (8 dígitos), a gente consulta a
// API gratuita do ViaCEP e preenche rua/bairro/cidade/UF automaticamente.
// Campos auto-preenchidos ficam editáveis (o usuário pode corrigir).
export default function AddressFields({ value, onChange, disabled = false }) {
  const v = value || {}
  const [loading, setLoading] = useState(false)
  const [cepError, setCepError] = useState(null)
  const lastFetchedCep = useRef('')

  const update = (patch) => onChange({ ...v, ...patch })

  // Quando o CEP fica completo (8 dígitos), busca no ViaCEP
  useEffect(() => {
    const digits = (v.cep || '').replace(/\D/g, '')
    if (digits.length !== 8) return
    if (lastFetchedCep.current === digits) return  // evita re-fetch
    lastFetchedCep.current = digits

    let aborted = false
    setLoading(true)
    setCepError(null)

    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then((r) => r.json())
      .then((data) => {
        if (aborted) return
        if (data.erro) {
          setCepError('CEP não encontrado')
          return
        }
        update({
          street: data.logradouro || v.street || '',
          neighborhood: data.bairro || v.neighborhood || '',
          city: data.localidade || v.city || '',
          state: data.uf || v.state || '',
        })
      })
      .catch(() => {
        if (!aborted) setCepError('Erro ao buscar CEP. Preencha manualmente.')
      })
      .finally(() => { if (!aborted) setLoading(false) })

    return () => { aborted = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.cep])

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    width: '100%',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    outline: 'none',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-white/55 mb-1">
        <MapPin size={12} />
        <span>Endereço (para a nota fiscal)</span>
      </div>

      {/* CEP — busca automática */}
      <div className="grid sm:grid-cols-[180px_1fr] gap-3">
        <div>
          <label className="text-xs text-white/55 mb-1 block">CEP</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={v.cep || ''}
              onChange={(e) => update({ cep: maskCep(e.target.value) })}
              disabled={disabled}
              placeholder="00000-000"
              maxLength={9}
              style={{
                ...inputStyle,
                border: `1px solid ${cepError ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                fontFamily: 'JetBrains Mono, monospace',
              }}
              className="placeholder:text-white/30 focus:border-amber-400"
            />
            {loading && (
              <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-white/45" />
            )}
          </div>
          {cepError && <div className="text-[11px] text-rose-300/85 mt-1">{cepError}</div>}
        </div>

        <div>
          <label className="text-xs text-white/55 mb-1 block">Rua / Logradouro</label>
          <input
            type="text"
            value={v.street || ''}
            onChange={(e) => update({ street: e.target.value })}
            disabled={disabled}
            placeholder="Av. Paulista"
            style={inputStyle}
            className="placeholder:text-white/30 focus:border-amber-400"
          />
        </div>
      </div>

      {/* Número + Complemento */}
      <div className="grid sm:grid-cols-[160px_1fr] gap-3">
        <div>
          <label className="text-xs text-white/55 mb-1 block">Número</label>
          <input
            type="text"
            value={v.number || ''}
            onChange={(e) => update({ number: e.target.value.replace(/[^\dA-Za-z]/g, '').slice(0, 6) })}
            disabled={disabled}
            placeholder="123"
            style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
            className="placeholder:text-white/30 focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-xs text-white/55 mb-1 block">
            Complemento <span className="text-white/35">(opcional)</span>
          </label>
          <input
            type="text"
            value={v.complement || ''}
            onChange={(e) => update({ complement: e.target.value.slice(0, 80) })}
            disabled={disabled}
            placeholder="Apto 42, bloco B..."
            style={inputStyle}
            className="placeholder:text-white/30 focus:border-amber-400"
          />
        </div>
      </div>

      {/* Bairro / Cidade / UF (preenchidos pelo ViaCEP, editáveis) */}
      <div className="grid sm:grid-cols-[1fr_1fr_80px] gap-3">
        <div>
          <label className="text-xs text-white/55 mb-1 block">Bairro</label>
          <input
            type="text"
            value={v.neighborhood || ''}
            onChange={(e) => update({ neighborhood: e.target.value })}
            disabled={disabled}
            placeholder="Centro"
            style={inputStyle}
            className="placeholder:text-white/30 focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-xs text-white/55 mb-1 block">Cidade</label>
          <input
            type="text"
            value={v.city || ''}
            onChange={(e) => update({ city: e.target.value })}
            disabled={disabled}
            placeholder="São Paulo"
            style={inputStyle}
            className="placeholder:text-white/30 focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-xs text-white/55 mb-1 block">UF</label>
          <input
            type="text"
            value={v.state || ''}
            onChange={(e) => update({ state: e.target.value.toUpperCase().slice(0, 2) })}
            disabled={disabled}
            placeholder="SP"
            maxLength={2}
            style={{ ...inputStyle, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}
            className="placeholder:text-white/30 focus:border-amber-400"
          />
        </div>
      </div>
    </div>
  )
}

// Helper: valida se o endereço está suficientemente preenchido pra NF
export function isAddressValid(addr) {
  if (!addr) return false
  const cep = (addr.cep || '').replace(/\D/g, '')
  return (
    cep.length === 8 &&
    (addr.street || '').trim().length >= 3 &&
    (addr.number || '').trim().length >= 1 &&
    (addr.neighborhood || '').trim().length >= 2 &&
    (addr.city || '').trim().length >= 2 &&
    (addr.state || '').trim().length === 2
  )
}
