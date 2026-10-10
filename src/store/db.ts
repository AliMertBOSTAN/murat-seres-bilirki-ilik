import Dexie, { type EntityTable } from 'dexie'
import type { CaseData } from '@/model/case'

export interface CaseRow { id: string; title: string; updatedAt: string; data: CaseData }
export interface BlobRow { id: string; caseId: string; name: string; type: string; size: number; blob: Blob }

export const db = new Dexie('seres-bilirkisilik') as Dexie & { cases: EntityTable<CaseRow, 'id'>; blobs: EntityTable<BlobRow, 'id'> }
db.version(1).stores({ cases: 'id, updatedAt', blobs: 'id, caseId' })

export async function saveCase(c: CaseData): Promise<void> {
  try { await db.cases.put({ id: c.id, title: c.title, updatedAt: c.updatedAt ?? new Date().toISOString(), data: c }) } catch { /* IndexedDB kullanılamıyor */ }
}
export async function listCases(): Promise<CaseRow[]> {
  try { return await db.cases.orderBy('updatedAt').reverse().toArray() } catch { return [] }
}
export async function loadCaseById(id: string): Promise<CaseData | undefined> {
  try { return (await db.cases.get(id))?.data } catch { return undefined }
}
export async function deleteCase(id: string): Promise<void> {
  try { await db.cases.delete(id); await db.blobs.where('caseId').equals(id).delete() } catch { /* yok say */ }
}
