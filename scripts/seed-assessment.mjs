/** Seed dữ liệu assessment v2: 8 loại câu khách quan, quiz tổng hợp, bài code chuẩn CP (docs/assessment-spec.md). */
import { api, items, days, log, ensureQuestion, verifyQuestion, ensureAssignment, waitSubmission, REVIEW_DEFAULTS } from "./seed-lib.mjs";

const choice = (options) => options.map(([content, is_correct]) => ({ content, is_correct }));
const SUM_STATEMENT = `Cho dãy gồm \`n\` số nguyên. Tính tổng các phần tử.

## Input
- Dòng 1: số nguyên \`n\` (1 ≤ n ≤ 10^5).
- Dòng 2: \`n\` số nguyên \`a_i\` (|a_i| ≤ 10^9).

## Output
Một số nguyên là tổng của dãy.

## Ràng buộc
Tổng có thể vượt 32 bit — dùng kiểu 64 bit.`;
const AVG_STATEMENT = `Cho \`n\` số thực, in ra trung bình cộng.

## Input
Dòng 1: \`n\` (1 ≤ n ≤ 1000). Dòng 2: \`n\` số thực.

## Output
Trung bình cộng. Chấp nhận sai số tuyệt đối hoặc tương đối 1e-6.`;
const CPP_SUM = "#include <bits/stdc++.h>\nusing namespace std;\nint main(){int n;cin>>n;long long s=0,x;for(int i=0;i<n;i++){cin>>x;s+=x;}cout<<s<<\"\\n\";}\n";

export async function seedAssessment({ lecturer, student, klass, bank, catOverview, catSocket }) {
  console.log("Câu hỏi đa loại (assessment v2):");
  const q = (label, body) => ensureQuestion(lecturer, bank.id, label, { category_id: catOverview, difficulty: "medium", ...body });
  const multi = await q("Nhiều đáp án", { type: "multiple_choice", scoring_mode: "partial",
    content: "Những giao thức tầng ứng dụng nào dưới đây **mặc định chạy trên TCP**?",
    explanation: "HTTP và SMTP dùng TCP; DNS truy vấn thường dùng UDP; DHCP dùng UDP.",
    options: choice([["HTTP", true], ["DNS (truy vấn thường)", false], ["SMTP", true], ["DHCP", false]]) });
  const tf = await q("Đúng/Sai", { type: "true_false", difficulty: "easy", content: "UDP đảm bảo các gói tin đến đích đúng thứ tự gửi.",
    explanation: "UDP không đảm bảo thứ tự và không truyền lại gói tin.", options: choice([["Đúng", false], ["Sai", true]]) });
  const short = await q("Trả lời ngắn", { type: "short_answer", difficulty: "easy",
    content: "Viết tên giao thức dùng để truyền trang web giữa trình duyệt và máy chủ (viết tắt).",
    answer_spec: { accepted: ["HTTP", "HyperText Transfer Protocol"], case_sensitive: false } });
  const numeric = await q("Đáp số", { type: "numeric", content: "Một địa chỉ IPv4 dài bao nhiêu **bit**?",
    answer_spec: { value: 32, tolerance: 0 } });
  const blank = await q("Điền chỗ trống", { type: "fill_blank", scoring_mode: "partial", category_id: catSocket,
    content: "Phía server TCP gọi `[[1]]()` để gắn địa chỉ, `listen()` để chờ, rồi `[[2]]()` để nhận từng kết nối.",
    answer_spec: { blanks: [{ accepted: ["bind"], case_sensitive: false }, { accepted: ["accept"], case_sensitive: false }] } });
  const match = await q("Ghép cặp", { type: "matching", scoring_mode: "partial", content: "Ghép mỗi giao thức với cổng mặc định của nó.",
    answer_spec: { pairs: [{ left: "HTTP", right: "80" }, { left: "HTTPS", right: "443" }, { left: "SSH", right: "22" }, { left: "DNS", right: "53" }],
      distractors: [{ text: "8080" }] } });
  const order = await q("Sắp xếp", { type: "ordering", scoring_mode: "all_or_nothing", category_id: catSocket,
    content: "Sắp xếp các bước bắt tay ba bước (three-way handshake) của TCP theo đúng thứ tự.",
    answer_spec: { items: [{ text: "Client gửi SYN" }, { text: "Server trả SYN-ACK" }, { text: "Client gửi ACK" }] } });
  const mcqAny = items(await api(`/questions?bank_id=${bank.id}&type=mcq&limit=100`, { token: lecturer }))[0];

  const objective = [mcqAny, multi, tf, short, numeric, blank, match, order];
  const quiz = await ensureAssignment(lecturer, klass.id, { ...REVIEW_DEFAULTS, shuffle_questions: true, shuffle_options: true,
    title: "Quiz tổng hợp — 8 dạng câu", description: "Mỗi câu 1,25 điểm. Được làm 2 lượt, xem đáp án ngay sau khi nộp.",
    category: "quiz", due_at: days(5), max_attempts: 2, score_policy: "best",
    questions: objective.map((item, index) => ({ question_id: item.id, points: 1.25, position: index + 1 })) }, "Quiz tổng hợp 8 dạng câu");

  if (items(await api(`/assignments/${quiz.id}/quiz-attempts`, { token: student })).length) log("Quiz tổng hợp: đã có lượt nộp");
  else {
    const detail = async (item) => api(`/questions/${item.id}`, { token: lecturer });
    const [m, t, mt, o] = await Promise.all([detail(multi), detail(tf), detail(match), detail(order)]);
    const httpOnly = m.options.filter((opt) => opt.content === "HTTP").map((opt) => opt.id);
    const pairs = mt.answer_spec.pairs;
    const matches = { [pairs[0].id]: pairs[0].right_id, [pairs[1].id]: pairs[1].right_id, [pairs[2].id]: pairs[3].right_id, [pairs[3].id]: pairs[2].right_id };
    const attempt = await api(`/assignments/${quiz.id}/quiz-attempts`, { method: "POST", token: student, idempotencyKey: crypto.randomUUID(), body: { answers: [
      { question_id: multi.id, selected_option_ids: httpOnly },
      { question_id: tf.id, selected_option_ids: [t.options.find((opt) => opt.is_correct).id] },
      { question_id: short.id, text: "http" },
      { question_id: numeric.id, number: 32 },
      { question_id: blank.id, blanks: ["bind", "connect"] },
      { question_id: match.id, matches },
      { question_id: order.id, order: o.answer_spec.items.map((item) => item.id) }] } });
    log(`Quiz tổng hợp: nộp 1 lượt (bỏ trống câu 1, đúng một phần câu nhiều đáp án/điền/ghép) → ${attempt.score}/${attempt.max_score}`);
  }

  console.log("Bài lập trình chuẩn CP:");
  const prog = (label, content, programming, tests) => q(label, { type: "programming", category_id: catSocket, content,
    programming: { allowed_languages: ["python", "c", "cpp", "java"], time_limit_ms: 1000, memory_limit_mb: 256, ...programming },
    test_cases: tests.map(([input, expected_output, is_public]) => ({ input, expected_output, is_public })) });
  const big = Array.from({ length: 1000 }, (_, i) => 1_000_000_000 - i);
  const sum = await prog("Code: tổng dãy số", SUM_STATEMENT, { checker_mode: "token", solution_code: CPP_SUM, solution_language: "cpp" },
    [["3\n1 2 3\n", "6", true], ["1\n-5\n", "-5", false], ["5\n1000000000 1000000000 1000000000 1000000000 1000000000\n", "5000000000", false],
     [`1000\n${big.join(" ")}\n`, String(big.reduce((a, b) => a + b, 0)), false]]);
  const avg = await prog("Code: trung bình cộng (checker số thực)", AVG_STATEMENT,
    { checker_mode: "float", checker_epsilon: 1e-6, solution_code: "n = int(input())\na = list(map(float, input().split()))\nprint(sum(a) / n)\n", solution_language: "python" },
    [["4\n1 2 3 4\n", "2.5", true], ["3\n1 1 2\n", "1.333333333", false], ["2\n-1.5 0.5\n", "-0.5", false]]);

  const title = "Bài lập trình — chuẩn CP";
  if (!items(await api(`/classes/${klass.id}/assignments`, { token: lecturer })).some((a) => a.title === title)) {
    await verifyQuestion(lecturer, sum, "tổng dãy số");
    await verifyQuestion(lecturer, avg, "trung bình cộng");
  }
  const cp = await ensureAssignment(lecturer, klass.id, { ...REVIEW_DEFAULTS, title, description: "2 bài, 4 ngôn ngữ, tối đa 10 lượt mỗi bài.",
    category: "assignment", due_at: days(10), max_attempts: 10, score_policy: "best",
    questions: [{ question_id: sum.id, points: 5, position: 1 }, { question_id: avg.id, points: 5, position: 2 }] }, "Bài code chuẩn CP");

  if (items(await api(`/me/submissions?assignment_id=${cp.id}`, { token: student })).length) { log("Bài CP: đã có bài nộp"); return; }
  const submit = async (question, language, source_code, label) => {
    const receipt = await api(`/assignments/${cp.id}/questions/${question.id}/submissions`,
      { method: "POST", token: student, idempotencyKey: crypto.randomUUID(), body: { language, source_code } });
    const result = await waitSubmission(student, receipt.submission_id);
    log(`${label}: ${result.verdict}${result.result?.failed_test ? ` (sai ở test ${result.result.failed_test})` : ""}, điểm ${result.score}`);
  };
  await submit(sum, "cpp", "int main( { return 0; }\n", "Tổng dãy — C++ lỗi cú pháp");
  await submit(sum, "python", "n = int(input())\na = list(map(int, input().split()))\nprint(sum(a[1:]))\n", "Tổng dãy — Python bỏ sót phần tử đầu");
  await submit(sum, "cpp", CPP_SUM, "Tổng dãy — C++ đúng");
  await submit(avg, "python", "n = int(input())\na = list(map(float, input().split()))\nprint(f'{sum(a) / n:.6f}')\n", "Trung bình — in 6 chữ số");
}
