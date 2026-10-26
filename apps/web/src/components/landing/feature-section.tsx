import { ClassFragment, QuizFragment, SubmissionFragment } from "@/components/landing/product-fragments";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    id: "hoc-lieu",
    title: "Học liệu & lớp",
    text: "Mỗi lớp học phần có không gian riêng: tài liệu, bài tập và danh sách sinh viên. Sinh viên thấy đúng lớp mình đang học.",
    points: ["Tải tệp hoặc chia sẻ liên kết", "Thêm sinh viên từng người hoặc từ tệp CSV", "Thông báo khi có học liệu mới"],
    fragment: <ClassFragment />,
  },
  {
    id: "bai-tap",
    title: "Bài tập & quiz",
    text: "Soạn câu hỏi một lần trong ngân hàng, dùng lại cho nhiều bài. Hạn nộp, số lượt làm và nộp muộn theo quy định của lớp.",
    points: ["Trắc nghiệm, điền khuyết, ghép cặp, sắp xếp", "Danh sách sắp đến hạn cho từng sinh viên", "Xem lại bài làm sau khi nộp"],
    fragment: <QuizFragment />,
  },
  {
    id: "cham-code",
    title: "Chấm code tự động",
    text: "Bài lập trình được chạy trong môi trường cách ly với bộ test của giảng viên. Kết quả từng test hiện ngay trên trang bài nộp.",
    points: ["Chạy thử với test mẫu trước khi nộp", "Kết quả rõ ràng: đúng, sai, quá thời gian, lỗi biên dịch", "Giảng viên xem bảng kết quả theo lớp"],
    fragment: <SubmissionFragment />,
  },
];

/** Ba khối chức năng chính, mỗi khối kèm mảnh giao diện thật. */
export function FeatureSection() {
  return (
    <div className="mx-auto w-full max-w-6xl divide-y px-4 sm:px-6">
      {FEATURES.map((feature, index) => (
        <section key={feature.id} id={feature.id} aria-labelledby={`${feature.id}-title`}
          className="grid scroll-mt-16 items-center gap-8 py-14 md:grid-cols-2 md:gap-12 md:py-20">
          <div className={cn("space-y-4", index % 2 === 1 && "md:order-2")}>
            <h2 id={`${feature.id}-title`} className="text-xl font-semibold tracking-tight sm:text-2xl">{feature.title}</h2>
            <p className="max-w-md text-muted-foreground">{feature.text}</p>
            <ul className="space-y-2 text-sm">
              {feature.points.map((point) => (
                <li key={point} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-foreground" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">{feature.fragment}</div>
        </section>
      ))}
    </div>
  );
}
