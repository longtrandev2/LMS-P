export interface AuditLog {
  id: number;
  actor_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}
