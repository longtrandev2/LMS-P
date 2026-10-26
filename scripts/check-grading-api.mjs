import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const apiUrl = process.env.GRADING_CHECK_API_URL ?? "http://localhost:18000";
const brokerUrl = process.env.GRADING_CHECK_BROKER_URL ?? "http://localhost:15673";
assert(process.env.GRADING_CHECK_PASSWORD, "Set GRADING_CHECK_PASSWORD for the isolated test broker");
const brokerAuth = "Basic " + Buffer.from("lms_check:" + process.env.GRADING_CHECK_PASSWORD).toString("base64");
async function api(path, token, method = "GET", body, expected = 200, key) {
  const response = await fetch(apiUrl + "/api/v1" + path, {
    method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(key ? { "Idempotency-Key": key } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json();
  assert(Array.isArray(expected) ? expected.includes(response.status) : response.status === expected,
    method + " " + path + ": HTTP " + response.status + " " + JSON.stringify(value));
  return value;
}
async function broker(path, body) {
  const response = await fetch(brokerUrl + "/api" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: brokerAuth, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert(response.ok, "Broker HTTP " + response.status + " " + path);
  return response.json();
}
async function until(get, label) {
  for (let i = 0; i < 150; i++) {
    const value = await get();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Timed out: " + label);
}
async function login(role) {
  return api("/auth/login", null, "POST", { email: role + "@lms.local", password: "Demo@12345" });
}
async function connect(token) {
  const socket = new WebSocket(apiUrl.replace(/^http/, "ws") + "/ws?token=" + encodeURIComponent(token));
  const events = [];
  socket.addEventListener("message", event => events.push(JSON.parse(event.data)));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket timeout")), 10000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("WebSocket failed")); }, { once: true });
  });
  return { socket, events };
}
async function takeJob(id) {
  return until(async () => {
    const messages = await broker("/queues/%2F/q.grading/get",
      { count: 10, ackmode: "ack_requeue_false", encoding: "auto", truncate: 50000 });
    return messages.map(item => JSON.parse(item.payload)).find(item => item.submission_id === id);
  }, "outbox dispatch");
}
async function publish(event) {
  const result = await broker("/exchanges/%2F/lms/publish", {
    properties: { content_type: "application/json", delivery_mode: 2 },
    routing_key: "grading.events", payload: JSON.stringify(event), payload_encoding: "string",
  });
  assert.equal(result.routed, true);
}
const admin = await login("admin"), lecturer = await login("lecturer"), student = await login("student");
const token = admin.access_token;
const tag = Date.now().toString().slice(-10);
const course = await api("/courses", token, "POST", { code: "QA" + tag, name: "Grading API check" }, 201);
const clazz = await api("/classes", token, "POST", { course_id: course.id, code: "QA01", name: "QA",
  semester: "2026-1", lecturer_id: lecturer.user.id }, 201);
await api("/classes/" + clazz.id + "/enrollments", token, "POST", { students: [{ student_id: student.user.id }] }, 201);
const bank = await api("/courses/" + course.id + "/question-bank", token, "PUT");
const question = await api("/questions", token, "POST", { bank_id: bank.id, type: "programming",
  content: "Add two numbers", difficulty: "easy", programming: { starter_code: "# starter", solution_code: "private-solution",
    allowed_languages: ["python"], time_limit_ms: 1000, memory_limit_mb: 128 } }, 201);
await api("/questions/" + question.id + "/test-cases", token, "PUT", [
  { input: "1 2", expected_output: "3", is_public: true, weight: 1 },
  { input: "private-input", expected_output: "private-output", is_public: false, weight: 3 },
]);
const assignment = await api("/classes/" + clazz.id + "/assignments", token, "POST", {
  title: "Code QA", category: "assignment", due_at: new Date(Date.now() + 3600000).toISOString().slice(0, 19),
  max_attempts: 2, questions: [{ question_id: question.id, points: 10, position: 1 }],
}, 201);
const assignmentId = assignment.assignment.id;
await api("/assignments/" + assignmentId + "/publish", token, "POST");
const path = "/assignments/" + assignmentId + "/questions/" + question.id + "/submissions";
const own = await connect(student.access_token), unrelated = await connect(admin.access_token);
try {
  own.socket.send(JSON.stringify({ type: "ping" }));
  await until(() => own.events.some(event => event.type === "pong" && event.ts && event.data), "WS pong");
  const key = randomUUID(), code = { language: "python", source_code: "print(3)" };
  const concurrent = await Promise.all(Array.from({ length: 3 }, () => api(path, student.access_token, "POST", code, [200, 202], key)));
  const accepted = concurrent[0];
  assert(concurrent.every(item => item.submission_id === accepted.submission_id));
  assert.equal(accepted.status, "pending");
  const replay = await api(path, student.access_token, "POST", code, 200, key);
  assert.equal(replay.submission_id, accepted.submission_id);
  await api(path, student.access_token, "POST", { ...code, source_code: "print(4)" }, 409, key);
  const job = await takeJob(accepted.submission_id);
  assert.equal(job.schema_version, 3);
  assert.equal(job.student_id, student.user.id);
  assert.equal(job.source_code, undefined);
  const detailPath = "/submissions/" + accepted.submission_id;
  const pending = await api(detailPath, student.access_token);
  assert.equal(pending.score, null);
  assert.equal(pending.source_code, code.source_code);
  const history = await api("/me/submissions?assignment_id=" + assignmentId, student.access_token);
  assert(history.some(item => item.id === accepted.submission_id && item.status === "pending" && item.type === "code" && item.score === null));
  const payload = { job_id: job.job_id, submission_id: accepted.submission_id, status: "grading" };
  await publish({ event: "submission.status", payload, user_id: admin.user.id });
  await until(async () => (await api(detailPath, student.access_token)).status === "grading", "grading status");
  const completed = { ...payload, status: "completed", verdict: "AC", compile_error: false, duration_ms: 5 };
  await publish({ event: "submission.graded", payload: completed, user_id: admin.user.id });
  const result = await until(async () => {
    const detail = await api(detailPath, student.access_token);
    return detail.status === "completed" ? detail : null;
  }, "persisted grade");
  assert.equal(result.score, null);
  assert.equal(result.verdict, "AC");
  assert(!JSON.stringify(result).includes("private-"));
  const privileged = await api(detailPath, lecturer.access_token);
  assert.equal(privileged.result.verdict, "AC");
  await until(() => own.events.some(event => event.type === "submission.graded" && event.data.verdict === "AC"), "WS terminal");
  assert(!unrelated.events.some(event => event.type.startsWith("submission.")), "WS must use DB owner");
  await publish({ event: "submission.graded", payload: completed });
  await publish({ event: "submission.status", payload });
  assert.equal((await api(detailPath, student.access_token)).status, "completed");
  const notifications = await api("/notifications", student.access_token);
  assert.equal(notifications.items.filter(item => item.data?.submission_id === accepted.submission_id).length, 1);
  const outsiderEmail = "qa" + tag + "@test.local";
  await api("/users", token, "POST", { email: outsiderEmail, full_name: "QA outsider",
    role_names: ["student"], password: "Check@12345" }, 201);
  const outsider = await api("/auth/login", null, "POST", { email: outsiderEmail, password: "Check@12345" });
  await api(detailPath, outsider.access_token, "GET", undefined, 403);
  const second = await api(path, student.access_token, "POST", code, 202, randomUUID());
  const secondJob = await takeJob(second.submission_id);
  const deadBefore = (await broker("/queues/%2F/q.grading.events.dead")).messages;
  await publish({ event: "submission.graded", payload: { ...completed,
    job_id: secondJob.job_id, submission_id: second.submission_id, verdict: null } });
  await until(async () => (await broker("/queues/%2F/q.grading.events.dead")).messages > deadBefore, "invalid-result DLQ");
  assert.equal((await api("/submissions/" + second.submission_id, student.access_token)).status, "pending");
  await publish({ event: "submission.graded", payload: { job_id: secondJob.job_id,
    submission_id: second.submission_id, status: "failed", verdict: "SYSTEM_ERROR", compile_error: false,
    error_message: "private-input" } });
  await until(async () => (await api("/submissions/" + second.submission_id, student.access_token)).status === "failed", "system failure");
  const failed = await api("/submissions/" + second.submission_id, student.access_token);
  assert.equal(failed.score, null);
  assert(!JSON.stringify(failed).includes("private-input"));
  await api(path, student.access_token, "POST", code, 409, randomUUID());
  console.log("PASS: real DB/broker submission, outbox, idempotency, verdict grading, WS routing, RBAC, DLQ and attempt limit.");
} finally {
  own.socket.close();
  unrelated.socket.close();
}
