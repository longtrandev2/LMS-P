package vn.lmsp.worker;

/** Job chạy thử API → worker trên `q.runs` — docs/message-contracts.md §4. */
public record RunJobMessage(int schema_version, String run_id, String kind) { }
