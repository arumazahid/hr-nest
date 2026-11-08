import { sb } from './supabase'

let actor: { id: string; name: string; role: string } | null = null
export const setActor = (a: { id: string; name: string; role: string } | null) => { actor = a }

// Fire-and-forget. Only the company admin can ever read these rows.
export function logActivity(companyId: string, action: string, detail = '') {
  if (!actor || !companyId) return
  sb.from('activity_log').insert({ company_id: companyId, actor_id: actor.id, actor_name: actor.name, actor_role: actor.role, action, detail }).then(() => {})
}
