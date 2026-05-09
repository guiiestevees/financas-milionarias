import { supabase } from './supabase'
import { STORAGE_KEY } from './constants'

// ----------------------------------------------------------------
// Modo local (sem Supabase): lê/escreve no localStorage
// Modo Supabase: usa user_months + user_profiles com RLS
//
// A interface storage.load() / storage.save(data) é idêntica
// em ambos os modos — o AppShell não sabe a diferença.
// ----------------------------------------------------------------

const localLoad = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
}
const localSave = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

async function supabaseLoad() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return localLoad()

  const [monthsRes, profileRes] = await Promise.all([
    supabase
      .from('user_months')
      .select('year_month, data')
      .eq('user_id', user.id),
    supabase
      .from('user_profiles')
      .select('brand, cofres')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (monthsRes.error) console.error('storage.load months:', monthsRes.error)
  if (profileRes.error) console.error('storage.load profile:', profileRes.error)

  const months = {}
  for (const row of monthsRes.data || []) {
    months[row.year_month] = row.data
  }

  return {
    months,
    brand: profileRes.data?.brand ?? { name: '', subtitle: 'Finanças Milionárias' },
    cofres: Array.isArray(profileRes.data?.cofres) ? profileRes.data.cofres : [],
  }
}

async function supabaseSave(appData) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { localSave(appData); return }

  const now = new Date().toISOString()

  const monthRows = Object.entries(appData.months || {}).map(([year_month, data]) => ({
    user_id: user.id,
    year_month,
    data,
    updated_at: now,
  }))

  const ops = []

  if (monthRows.length > 0) {
    ops.push(
      supabase
        .from('user_months')
        .upsert(monthRows, { onConflict: 'user_id,year_month' })
        .then(({ error }) => { if (error) console.error('storage.save months:', error) })
    )
  }

  ops.push(
    supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: user.id,
          brand: appData.brand ?? { name: '', subtitle: 'Finanças Milionárias' },
          cofres: Array.isArray(appData.cofres) ? appData.cofres : [],
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )
      .then(({ error }) => { if (error) console.error('storage.save profile:', error) })
  )

  await Promise.all(ops)
}

export const storage = {
  load: () => (supabase ? supabaseLoad() : Promise.resolve(localLoad())),
  save: (data) => (supabase ? supabaseSave(data) : Promise.resolve(localSave(data))),
}
