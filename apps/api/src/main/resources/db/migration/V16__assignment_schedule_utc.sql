-- Previous web clients sent datetime-local values as Vietnam wall time without an offset.
-- Normalize existing assignment windows to UTC so the API and browser compare the same instant.
UPDATE assignments
SET available_from = DATE_SUB(available_from, INTERVAL 7 HOUR)
WHERE available_from IS NOT NULL;

UPDATE assignments
SET due_at = DATE_SUB(due_at, INTERVAL 7 HOUR);

UPDATE assignments
SET late_due_at = DATE_SUB(late_due_at, INTERVAL 7 HOUR)
WHERE late_due_at IS NOT NULL;
