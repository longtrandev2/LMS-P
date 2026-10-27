import { MarkdownView } from "@/components/markdown-view";
import type { AssignmentQuestion } from "@/types/api";
import { renderBlankLabels } from "./answer-model";
import { ChoiceAnswer } from "./choice-answer";
import type { AnswerFieldProps } from "./correctness-mark";
import { FillBlankAnswer } from "./fill-blank-answer";
import { MatchingAnswer } from "./matching-answer";
import { OrderingAnswer } from "./ordering-answer";
import { NumericAnswer, ShortAnswer } from "./text-answer";

/** Ô trả lời theo loại câu khách quan (§1). Câu lập trình không dùng ô này. */
export function AnswerInput(props: AnswerFieldProps) {
  switch (props.question.type) {
    case "mcq":
    case "multiple_choice":
    case "true_false":
      return <ChoiceAnswer {...props} />;
    case "short_answer":
      return <ShortAnswer {...props} />;
    case "numeric":
      return <NumericAnswer {...props} />;
    case "fill_blank":
      return <FillBlankAnswer {...props} />;
    case "matching":
      return <MatchingAnswer {...props} />;
    case "ordering":
      return <OrderingAnswer {...props} />;
    default:
      return <p className="text-sm text-muted-foreground">Loại câu này làm ở trang riêng.</p>;
  }
}

/** Nội dung câu hỏi (Markdown); câu điền chỗ trống hiện `[[n]]` thành nhãn "(n)". */
export function QuestionPrompt({ question, className }: { question: AssignmentQuestion; className?: string }) {
  const source = question.type === "fill_blank" ? renderBlankLabels(question.content) : question.content;
  return <MarkdownView source={source} className={className} />;
}
