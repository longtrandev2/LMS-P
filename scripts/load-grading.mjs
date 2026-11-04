/**
 * Đo tải chấm code: bắn N bài nộp đồng thời, đo độ trễ (nộp → có kết quả) và thông lượng với 1..K worker.
 * Cần stack đang chạy và đã seed. Chạy: node scripts/load-grading.mjs [--workers 1,2,3] [--n 30] [--langs python,cpp]
 * Script tự đổi số worker bằng `docker compose --scale` và trả về 1 worker khi xong.
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { api, items, login, ensureAssignment, days } from "./seed-lib.mjs";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const WORKERS = arg("workers", "1,2,3").split(",").map(Number);
const N = Number(arg("n", "30"));
const LANGS = arg("langs", "python,cpp").split(",");
const STUDENT = arg("student", "sv03@lms.local");
// sum2: "Thi: tổng hai số" (python/cpp/java); sumn: "Code: tổng dãy số" (python/c/cpp/java, test 1000 số)
const PROBLEM = arg("problem", "sum2");
const PROBLEMS = {
  sum2: { prefix: "Đọc hai số nguyên", title: "[Đo tải] Chấm code" },
  sumn: { prefix: "Cho dãy gồm", title: "[Đo tải] Chấm code — tổng dãy" },
};
const infra = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../infra");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// String.raw: giữ nguyên chuỗi thoát (\n) bên trong mã C/C++.
const CODE_SUMN = {
  python: String.raw`n = int(input())
print(sum(map(int, input().split())))
`,
  c: String.raw`#include <stdio.h>
int main(void){int n;long long s=0,x;if(scanf("%d",&n)!=1)return 0;for(int i=0;i<n;i++){scanf("%lld",&x);s+=x;}printf("%lld\n",s);return 0;}
`,
  cpp: String.raw`#include <bits/stdc++.h>
int main(){int n;long long s=0,x;std::cin>>n;while(n--){std::cin>>x;s+=x;}std::cout<<s<<"\n";}
`,
  java: String.raw`import java.util.*;
public class Main{public static void main(String[] a){Scanner s=new Scanner(System.in);int n=s.nextInt();long t=0;for(int i=0;i<n;i++)t+=s.nextLong();System.out.println(t);}}
`,
};
const CODE = {
  python: "a, b = map(int, input().split())\nprint(a + b)\n",
  cpp: "#include <bits/stdc++.h>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<\"\\n\";}\n",
  java: "import java.util.*;\npublic class Main{public static void main(String[] x){Scanner s=new Scanner(System.in);long a=s.nextLong(),b=s.nextLong();System.out.println(a+b);}}\n",
};

async function setWorkers(k) {
  execSync(`docker compose up -d --no-recreate --scale worker=${k} worker`, { cwd: infra, stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    const q = (await api("/health/queue")).queues.find((x) => x.name === "q.grading");
    if (q?.consumers === k) return;
    await sleep(2000);
  }
  throw new Error(`Không thấy ${k} worker kết nối q.grading`);
}

async function target(lec) {
  const klass = items(await api("/classes", { token: lec })).find((c) => c.code === "NET101-L01");
  const bank = items(await api("/question-banks", { token: lec })).find((b) => b.name === "Ngân hàng đề NET101");
  const question = items(await api(`/questions?bank_id=${bank.id}&limit=100`, { token: lec }))
    .find((q) => q.type === "programming" && q.content.startsWith(PROBLEMS[PROBLEM].prefix));
  if (!question) throw new Error("Không tìm thấy câu 'Thi: tổng hai số' — chạy seed-demo trước");
  const assignment = await ensureAssignment(lec, klass.id, { title: PROBLEMS[PROBLEM].title, description: "Bài dùng cho scripts/load-grading.mjs",
    category: "assignment", due_at: days(365), max_attempts: null, score_policy: "best", review_mode: "after_submit",
    review_shows_answers: true, shuffle_questions: false, shuffle_options: false,
    questions: [{ question_id: question.id, points: 1, position: 1 }] }, "Bài đo tải");
  return { assignment, question };
}

async function round(stu, { assignment, question }, lang, n = N) {
  const t0 = Date.now();
  const sent = await Promise.all(Array.from({ length: n }, async () => {
    const start = Date.now();
    const r = await api(`/assignments/${assignment.id}/questions/${question.id}/submissions`,
      { method: "POST", token: stu, idempotencyKey: crypto.randomUUID(), body: { language: lang, source_code: (PROBLEM === "sumn" ? CODE_SUMN : CODE)[lang] } });
    return { id: r.submission_id, start };
  }));
  const pending = new Map(sent.map((s) => [s.id, s]));
  const done = [];
  while (pending.size) {
    await sleep(300);
    await Promise.all([...pending.values()].map(async (s) => {
      const d = await api(`/submissions/${s.id}`, { token: stu });
      if (d.status === "completed" || d.status === "failed") {
        done.push({ ms: Date.now() - s.start, verdict: d.verdict ?? d.status, run: d.result?.duration_ms ?? null });
        pending.delete(s.id);
      }
    }));
    if (Date.now() - t0 > 15 * 60_000) throw new Error("Quá 15 phút chưa chấm xong");
  }
  const sorted = done.map((d) => d.ms).sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
  const total = Math.max(...done.map((d) => d.ms));
  const verdicts = done.reduce((m, d) => ({ ...m, [d.verdict]: (m[d.verdict] ?? 0) + 1 }), {});
  const runs = done.map((d) => d.run).filter((x) => x != null);
  return { avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length), p50: pct(0.5), p95: pct(0.95), max: total,
    perMin: Math.round((n / total) * 60_000), exec: runs.length ? Math.round(runs.reduce((a, b) => a + b, 0) / runs.length) : null, verdicts };
}

const lec = await login("lecturer@lms.local");
const stu = await login(STUDENT);
const t = await target(lec);
const rows = [];
try {
  for (const k of WORKERS) {
    await setWorkers(k);
    for (const lang of LANGS) {
      await round(stu, t, lang, 2).catch(() => null); // làm nóng (2 bài), không tính
      const r = await round(stu, t, lang);
      rows.push({ workers: k, lang, ...r });
      console.log(`${k} worker · ${lang}: tb ${r.avg} ms · p50 ${r.p50} · p95 ${r.p95} · xong hết ${r.max} ms · ${r.perMin} bài/phút · chạy trong sandbox tb ${r.exec} ms · ${JSON.stringify(r.verdicts)}`);
    }
  }
} finally {
  await setWorkers(1).catch((e) => console.error(`Không trả về 1 worker: ${e.message}`));
}
console.log(`\n| Worker | Ngôn ngữ | N | TB (ms) | p50 | p95 | Xong hết (ms) | Bài/phút | Kết quả |\n|---|---|---|---|---|---|---|---|---|`);
for (const r of rows) console.log(`| ${r.workers} | ${r.lang} | ${N} | ${r.avg} | ${r.p50} | ${r.p95} | ${r.max} | ${r.perMin} | ${Object.entries(r.verdicts).map(([k, v]) => `${k} ${v}`).join(", ")} |`);
