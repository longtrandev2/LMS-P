package vn.lmsp.enums;

/** Loại câu hỏi — docs/assessment-spec.md §1. `mcq` = một đáp án (giữ tên cũ để tương thích dữ liệu). */
public enum QuestionType {
    mcq, multiple_choice, true_false, short_answer, numeric, fill_blank, matching, ordering, programming;

    public boolean isChoice() { return this == mcq || this == multiple_choice || this == true_false; }
    public boolean isObjective() { return this != programming; }
    public boolean usesAnswerSpec() {
        return this == short_answer || this == numeric || this == fill_blank || this == matching || this == ordering;
    }
    public boolean supportsPartialScoring() {
        return this == multiple_choice || this == fill_blank || this == matching || this == ordering;
    }
}
