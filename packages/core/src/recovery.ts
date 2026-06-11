import type { DocumentId } from '@writer/shared'

export interface RecoveryPoint {
  id: string
  documentId: DocumentId
  label: string
  createdAt: string
}

export interface RecoveryPolicy {
  shouldCreateRecoveryPoint(input: {
    documentId: DocumentId
    lastRecoveryPointAt: string | null
    now: string
    unsyncedUpdateCount: number
  }): boolean
}
