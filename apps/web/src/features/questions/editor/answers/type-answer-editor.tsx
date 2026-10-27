import { ProgrammingSettings } from "../programming/programming-settings";
import { SolutionEditor } from "../programming/solution-editor";
import { SolutionRunsPanel } from "../programming/solution-runs-panel";
import { StarterCodesEditor } from "../programming/starter-codes-editor";
import { TestsSection } from "../programming/tests-section";
import { useEditor } from "../editor-context";
import { ChoiceOptionsEditor } from "./choice-options-editor";
import { FillBlankEditor } from "./fill-blank-editor";
import { MatchingEditor } from "./matching-editor";
import { OrderingEditor } from "./ordering-editor";
import { NumericEditor, ShortAnswerEditor } from "./text-answer-editors";
import { TrueFalseEditor } from "./true-false-editor";

/** Editor đáp án riêng theo loại câu. */
export function TypeAnswerEditor({ suggestVerify }: { suggestVerify: boolean }) {
  const { draft } = useEditor();
  switch (draft.type) {
    case "mcq": case "multiple_choice": return <ChoiceOptionsEditor />;
    case "true_false": return <TrueFalseEditor />;
    case "short_answer": return <ShortAnswerEditor />;
    case "numeric": return <NumericEditor />;
    case "fill_blank": return <FillBlankEditor />;
    case "matching": return <MatchingEditor />;
    case "ordering": return <OrderingEditor />;
    case "programming": return <>
      <ProgrammingSettings />
      <StarterCodesEditor />
      <SolutionEditor />
      <TestsSection />
      <SolutionRunsPanel suggestVerify={suggestVerify} />
    </>;
  }
}
