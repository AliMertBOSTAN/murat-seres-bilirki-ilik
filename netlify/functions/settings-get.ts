import { getStore } from '@netlify/blobs'
import { json } from './_auth'

export default async () => {
  try {
    const store = getStore('settings')
    const current = await store.get('current', { type: 'json' })
    return json({ settings: current ?? null })
  } catch (e) { return json({ settings: null, error: String(e) }, 200) }
}
