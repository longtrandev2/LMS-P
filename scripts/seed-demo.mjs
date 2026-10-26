/**
 * Seed dữ liệu demo tối giản cho LMS-P — gọi REST API thật, không ghi thẳng DB.
 * Chạy khi stack đang lên:  node scripts/seed-demo.mjs
 * Mọi bản ghi find-or-create theo mã/tên nên chạy lại không nhân bản.
 * Yêu cầu Node 20+ (dùng fetch/FormData sẵn).
 */
const BASE = process.env.LMS_API_URL ?? "http://localhost:8000/api/v1";
const DEMO_PASSWORD = "Demo@12345";

async function api(path, { method = "GET", token, body, form, idempotencyKey } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await fetch(`${BASE}${path}`, {
    method, headers, body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status}: ${text.slice(0, 300)}`);
  return data;
}
const items = (data) => Array.isArray(data) ? data : (data?.items ?? []);
const login = async (email) =>
  (await api("/auth/login", { method: "POST", body: { email, password: DEMO_PASSWORD } })).access_token;
const days = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 19);
const log = (msg) => console.log(`  ${msg}`);

const PDF = `%PDF-1.4
1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj
2 0 obj <</Type/Pages/Kids[3 0 R]/Count 1>> endobj
3 0 obj <</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]>> endobj
trailer <</Size 4/Root 1 0 R>>
%%EOF`;

async function findOrCreate(listFn, match, create, label) {
  const existing = (await listFn()).find(match);
  if (existing) { log(`${label}: đã có (id ${existing.id})`); return existing; }
  const raw = await create();
  const created = raw.user ?? raw; // POST /users trả {user, temporary_password}
  log(`${label}: tạo mới (id ${created.id})`);
  return created;
}

async function main() {
  console.log("Đăng nhập…");
  const admin = await login("admin@lms.local");
  const lecturer = await login("lecturer@lms.local");
  const student = await login("student@lms.local");

  console.log("Học phần & lớp:");
  const course = await findOrCreate(
    async () => items(await api("/courses", { token: admin })),
    (c) => c.code === "NET101",
    () => api("/courses", { method: "POST", token: admin, body: { code: "NET101", name: "Lập trình mạng", description: "Học phần demo" } }),
    "Học phần NET101");
  const users = async (role) => items(await api(`/users?role=${role}&limit=100`, { token: admin }));
  const demoLecturer = (await users("lecturer")).find((u) => u.email === "lecturer@lms.local");
  const ensureStudent = (email, name, code) => findOrCreate(
    () => users("student").then((list) => list.filter((u) => u.email === email)),
    (u) => u.email === email,
    () => api("/users", { method: "POST", token: admin, body: { email, full_name: name, student_code: code, role_names: ["student"], password: DEMO_PASSWORD } }),
    `SV ${code}`);
  const sv1 = (await users("student")).find((u) => u.email === "student@lms.local");
  const sv2 = await ensureStudent("sv02@lms.local", "Nguyễn Văn B", "SV000002");
  const sv3 = await ensureStudent("sv03@lms.local", "Trần Thị C", "SV000003");

  const klass = await findOrCreate(
    async () => items(await api("/classes", { token: admin })),
    (c) => c.code === "NET101-L01",
    () => api("/classes", { method: "POST", token: admin, body: {
      course_id: course.id, code: "NET101-L01", name: "Lập trình mạng — Lớp 1", semester: "2026.2",
      lecturer_id: demoLecturer.id, max_students: 40, room: "A1.1", schedule: "T3 1-3, T5 1-3" } }),
    "Lớp NET101-L01");
  const enrolled = items(await api(`/classes/${klass.id}/students`, { token: lecturer })).map((s) => s.user_id ?? s.id);
  const missing = [sv1, sv2, sv3].filter((s) => s && !enrolled.includes(s.id)).map((s) => s.id);
  if (missing.length) {
    const result = await api(`/classes/${klass.id}/enrollments`, { method: "POST", token: lecturer, body: { student_ids: missing } });
    log(`Ghi danh thêm ${result.added} sinh viên`);
  } else log("Ghi danh: đã đủ 3 sinh viên");

  console.log("Học liệu:");
  const materials = items(await api(`/classes/${klass.id}/materials`, { token: lecturer }));
  if (materials.some((m) => m.title === "Slide tuần 1 — Tổng quan môn học")) log("Học liệu: đã có");
  else {
    const form = new FormData();
    form.append("title", "Slide tuần 1 — Tổng quan môn học");
    form.append("description", "Giới thiệu kiến trúc mạng, mô hình OSI");
    form.append("file", new Blob([PDF], { type: "application/pdf" }), "slide-tuan-1.pdf");
    await api(`/classes/${klass.id}/materials`, { method: "POST", token: lecturer, form });
    log("Học liệu: upload slide-tuan-1.pdf");
  }

  console.log("Ngân hàng câu hỏi:");
  const bank = await findOrCreate(
    async () => items(await api("/question-banks", { token: lecturer })),
    (b) => b.name === "Ngân hàng đề NET101",
    () => api("/question-banks", { method: "POST", token: lecturer, body: { course_id: course.id, name: "Ngân hàng đề NET101", description: "Đề demo", visibility: "shared" } }),
    "Ngân hàng đề NET101");
  const categories = items(await api(`/question-banks/${bank.id}/categories`, { token: lecturer }));
  const ensureCategory = async (name) => categories.find((c) => c.name === name)?.id
    ?? (await api(`/question-banks/${bank.id}/categories`, { method: "POST", token: lecturer, body: { name } })).id;
  const catOverview = await ensureCategory("Tổng quan");
  const catSocket = await ensureCategory("Socket");

  const questionList = async () => items(await api(`/questions?bank_id=${bank.id}&limit=100`, { token: lecturer }));
  async function ensureQuestion(label, content, body, testCases) {
    const found = (await questionList()).find((q) => q.content === content);
    const question = found ?? await api("/questions", { method: "POST", token: lecturer, body });
    if (testCases && !found) await api(`/questions/${question.id}/test-cases`, { method: "PUT", token: lecturer, body: testCases });
    log(`${label}: ${found ? "đã có" : "tạo mới"} (id ${question.id})`);
    return question;
  }
  const mcqBody = (content, difficulty, topic, categoryId, options) => ({
    bank_id: bank.id, category_id: categoryId, type: "mcq", content, topic, difficulty,
    options: options.map(([text, correct]) => ({ content: text, is_correct: correct })) });
  const progBody = (content, topic, difficulty, categoryId, starter, solution) => ({
    bank_id: bank.id, category_id: categoryId, type: "programming", content, topic, difficulty,
    programming: { starter_code: starter, solution_code: solution, allowed_languages: ["python"], time_limit_ms: 5000, memory_limit_mb: 256 } });
  const q1 = await ensureQuestion("MCQ giao thức tầng vận chuyển",
    "Giao thức nào sau đây hoạt động ở tầng vận chuyển và hướng kết nối?",
    mcqBody("Giao thức nào sau đây hoạt động ở tầng vận chuyển và hướng kết nối?", "medium", "Giao thức", catOverview, [
      ["UDP", false], ["TCP", true], ["ICMP", false], ["ARP", false]]));
  const q2 = await ensureQuestion("MCQ cổng HTTP",
    "Cổng mặc định của giao thức HTTP là bao nhiêu?",
    mcqBody("Cổng mặc định của giao thức HTTP là bao nhiêu?", "easy", "Giao thức", catOverview, [
      ["21", false], ["25", false], ["80", true], ["443", false]]));
  const q3 = await ensureQuestion("MCQ socket",
    "Trong Python, lời gọi nào chuyển socket sang trạng thái nghe kết nối đến?",
    mcqBody("Trong Python, lời gọi nào chuyển socket sang trạng thái nghe kết nối đến?", "hard", "Socket", catSocket, [
      ["socket.connect()", false], ["socket.bind()", false], ["socket.listen()", true], ["socket.accept()", false]]));
  const p1 = await ensureQuestion("Code: tính tổng hai số",
    "Nhập vào một dòng chứa hai số nguyên a và b cách nhau bởi khoảng trắng. In ra tổng a + b.",
    progBody("Nhập vào một dòng chứa hai số nguyên a và b cách nhau bởi khoảng trắng. In ra tổng a + b.", "Tổng", "easy", catSocket,
      "a, b = map(int, input().split())\n# In ra tổng a + b\n", "a, b = map(int, input().split())\nprint(a + b)\n"),
    [{ input: "3 4", expected_output: "7", is_public: true, weight: 1 },
     { input: "10 -2", expected_output: "8", is_public: true, weight: 1 },
     { input: "999999 1", expected_output: "1000000", is_public: false, weight: 1 }]);
  const p2 = await ensureQuestion("Code: đảo chuỗi",
    "Nhập một dòng chữ không có khoảng trắng. In ra chuỗi bị đảo ngược.",
    progBody("Nhập một dòng chữ không có khoảng trắng. In ra chuỗi bị đảo ngược.", "Chuỗi", "medium", catSocket,
      "s = input()\n# In ra chuỗi đảo ngược\n", "s = input()\nprint(s[::-1])\n"),
    [{ input: "hello", expected_output: "olleh", is_public: true, weight: 1 },
     { input: "lmsp", expected_output: "psml", is_public: false, weight: 1 }]);

  console.log("Bài tập:");
  const classAssignments = async () => items(await api(`/classes/${klass.id}/assignments`, { token: lecturer }));
  const ensureAssignment = (title, body, label) => findOrCreate(classAssignments,
    (a) => a.title === title,
    async () => {
      await api("/assignments/bulk", { method: "POST", token: lecturer, body });
      const created = (await classAssignments()).find((a) => a.title === title); // bulk không trả id — dò lại theo tiêu đề
      if (!created) throw new Error(`Không tìm thấy bài "${title}" sau khi tạo`);
      return created;
    }, label);
  const quiz = await ensureAssignment("Kiểm tra nhanh — Mạng cơ bản", {
      class_ids: [klass.id], publish: true,
      assignment: { title: "Kiểm tra nhanh — Mạng cơ bản", description: "Quiz 3 câu", category: "quiz", due_at: days(3),
        max_attempts: 2, score_policy: "best",
        questions: [{ question_id: q1.id, points: 20, position: 1 }, { question_id: q2.id, points: 30, position: 2 }, { question_id: q3.id, points: 50, position: 3 }] } },
    "Quiz 3 câu (đã xuất bản)");
  const codeAsg = await ensureAssignment("Bài tập lập trình số 1", {
      class_ids: [klass.id], publish: true,
      assignment: { title: "Bài tập lập trình số 1", description: "2 bài code Python", category: "assignment", due_at: days(7),
        allow_late: true, late_due_at: days(9), late_penalty_percent: 20, max_attempts: 5, score_policy: "best",
        questions: [{ question_id: p1.id, points: 60, position: 1 }, { question_id: p2.id, points: 40, position: 2 }] } },
    "Bài code (đã xuất bản)");

  console.log("Lượt nộp mẫu của sinh viên demo:");
  const quizAttempts = items(await api(`/assignments/${quiz.id}/quiz-attempts`, { token: student }).catch(() => ({ items: [] })));
  if (quizAttempts.length) log("Quiz: sinh viên demo đã có lượt nộp");
  else {
    // View sinh viên không trả đáp án đúng — lấy id lựa chọn qua view giảng viên của từng câu.
    const d1 = await api(`/questions/${q1.id}`, { token: lecturer });
    const d2 = await api(`/questions/${q2.id}`, { token: lecturer });
    const correct = (q) => q.options.find((o) => o.is_correct).id;
    const wrong = (q) => q.options.find((o) => !o.is_correct).id;
    const attempt = await api(`/assignments/${quiz.id}/quiz-attempts`, { method: "POST", token: student, idempotencyKey: crypto.randomUUID(), body: {
      answers: [
        { question_id: d1.id, selected_option_ids: [correct(d1)] },
        { question_id: d2.id, selected_option_ids: [wrong(d2)] },
      ] } });
    log(`Quiz: nộp 1 lượt — đúng câu 1, sai câu 2, bỏ trống câu 3 → ${attempt.score ?? "?"} điểm`);
  }

  const codeHistory = items(await api(`/me/submissions?assignment_id=${codeAsg.id}`, { token: student }))
    .filter((s) => s.question_id === p1.id);
  if (codeHistory.length) log("Code: sinh viên demo đã nộp bài tính tổng");
  else {
    const submit = (source) => api(`/assignments/${codeAsg.id}/questions/${p1.id}/submissions`,
      { method: "POST", token: student, idempotencyKey: crypto.randomUUID(), body: { language: "python", source_code: source } });
    await submit("a, b = map(int, input().split())\nprint(0)\n");
    log("Code: nộp lời giải SAI (in ra 0) — lượt 1");
    const receipt = await submit("a, b = map(int, input().split())\nprint(a + b)\n");
    log("Code: nộp lời giải ĐÚNG — lượt 2");
    for (let i = 0; i < 45; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const status = await api(`/submissions/${receipt.submission_id}`, { token: student });
      if (status.status === "completed" || status.status === "failed") {
        log(`Chấm xong: ${status.status}${status.result?.verdict ? ` — verdict ${status.result.verdict}` : ""}`);
        break;
      }
      if (i === 44) log("Vẫn đang chấm sau 90s — kiểm tra worker: docker compose logs worker");
    }
  }

  console.log(`
Hoàn tất. Đăng nhập http://localhost:3000 (mật khẩu chung: ${DEMO_PASSWORD})
  admin@lms.local    — quản trị user/học phần/lớp, xem audit
  lecturer@lms.local — lớp NET101-L01, học liệu, ngân hàng đề, 2 bài đã xuất bản
  student@lms.local  (mã SV000001) — làm quiz, nộp code, xem lịch sử/verdict
  sv02@lms.local / sv03@lms.local — sinh viên thêm trong lớp`);
}

main().catch((error) => { console.error(`LỖI: ${error.message}`); process.exit(1); });
