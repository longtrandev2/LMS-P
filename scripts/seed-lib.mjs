/** Helper dùng chung cho các script seed — chỉ gọi REST API, không ghi thẳng DB. */
export const BASE = process.env.LMS_API_URL ?? "http://localhost:8000/api/v1";
export const DEMO_PASSWORD = "Demo@12345";

export async function api(path, { method = "GET", token, body, form, idempotencyKey } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await fetch(`${BASE}${path}`, {
    method, headers, body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status}: ${text.slice(0, 400)}`);
  return data;
}

export const items = (data) => Array.isArray(data) ? data : (data?.items ?? []);
export const login = async (email) =>
  (await api("/auth/login", { method: "POST", body: { email, password: DEMO_PASSWORD } })).access_token;
export const days = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 19);
export const log = (msg) => console.log(`  ${msg}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function findOrCreate(listFn, match, create, label) {
  const existing = (await listFn()).find(match);
  if (existing) { log(`${label}: đã có (id ${existing.id})`); return existing; }
  const raw = await create();
  const created = raw.user ?? raw; // POST /users trả {user, temporary_password}
  log(`${label}: tạo mới (id ${created.id})`);
  return created;
}

/** Tạo câu hỏi nếu chưa có câu cùng nội dung trong ngân hàng (body gồm cả test_cases). */
export async function ensureQuestion(token, bankId, label, body) {
  const list = items(await api(`/questions?bank_id=${bankId}&limit=100`, { token }));
  const found = list.find((q) => q.content === body.content);
  const question = found ?? await api("/questions", { method: "POST", token, body: { bank_id: bankId, ...body } });
  log(`${label}: ${found ? "đã có" : "tạo mới"} (id ${question.id})`);
  return question;
}

/** Chờ run job kết thúc (poll GET /run-jobs/{id}). */
export async function waitRun(token, runId, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await api(`/run-jobs/${runId}`, { token });
    if (job.status === "completed" || job.status === "failed") return job;
    await sleep(1500);
  }
  throw new Error(`Run job ${runId} chưa xong sau ${timeoutMs / 1000}s — kiểm tra worker`);
}

/** Kiểm tra đề bằng lời giải mẫu để được phép xuất bản (assessment-spec §7). */
export async function verifyQuestion(token, question, label) {
  const { run_id } = await api(`/questions/${question.id}/verify`, { method: "POST", token, body: {} });
  const job = await waitRun(token, run_id);
  const passed = job.tests.filter((t) => t.verdict === "AC").length;
  log(`Kiểm tra đề ${label}: ${job.verdict ?? job.status} (${passed}/${job.tests.length} test)`);
  return job;
}

/** Chờ bài nộp code chấm xong. */
export async function waitSubmission(token, submissionId, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const detail = await api(`/submissions/${submissionId}`, { token });
    if (detail.status === "completed" || detail.status === "failed") return detail;
    await sleep(2000);
  }
  throw new Error(`Bài nộp ${submissionId} chưa chấm xong — kiểm tra worker`);
}

/** Tạo bài (bulk, xuất bản ngay) nếu lớp chưa có bài cùng tiêu đề; bulk không trả id nên dò lại theo tiêu đề. */
export async function ensureAssignment(token, classId, assignment, label) {
  const list = async () => items(await api(`/classes/${classId}/assignments`, { token }));
  return findOrCreate(list, (a) => a.title === assignment.title, async () => {
    await api("/assignments/bulk", { method: "POST", token, body: { class_ids: [classId], publish: true, assignment } });
    const created = (await list()).find((a) => a.title === assignment.title);
    if (!created) throw new Error(`Không tìm thấy bài "${assignment.title}" sau khi tạo`);
    return created;
  }, label);
}

export const REVIEW_DEFAULTS = { review_mode: "after_submit", review_shows_answers: true, shuffle_questions: false, shuffle_options: false };
