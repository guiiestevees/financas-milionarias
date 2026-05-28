import { X } from 'lucide-react'
import DespesaForm from './DespesaForm'

export default function EditDespesaModal({ despesa, config, cofres = [], onSave, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ background: 'rgba(7,9,18,0.7)', backdropFilter: 'blur(8px)' }}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-app-soft)', border: '1px solid var(--border-medium)', borderRadius: 18, maxWidth: 800, width: '100%', color: 'var(--text-primary)' }}
        className="p-6 sm:p-8"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl">Editar lançamento</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5"><X size={18} /></button>
        </div>
        <DespesaForm config={config} cofres={cofres} initial={despesa} onSubmit={onSave} onCancel={onClose} isEditing />
      </div>
    </div>
  )
}
