export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'PAY';

export interface AuditEvent {
  id?: string;
  entity: 'wine' | 'store' | 'user' | 'reservation' | 'payment';
  action: AuditAction;
  userId?: string | null;
  userEmail?: string | null;
  timestamp?: string;
  data: Record<string, unknown>;
}
