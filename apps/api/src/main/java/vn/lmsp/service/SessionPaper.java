package vn.lmsp.service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.AssignmentSection;
import vn.lmsp.model.AttemptSession;

/**
 * Câu của một phiên theo `question_order` và cách nhóm theo phần — docs/exam-spec.md §3.1, §5.2 bước 5, §5.3.
 * Câu không gắn phần (bài cũ) đứng trong một phần không tên ở đầu.
 */
@Component
@RequiredArgsConstructor
public class SessionPaper {
    /** Một phần của đề khi hiển thị; `title` rỗng = phần không tên. */
    public record Group(String title, List<AssignmentQuestion> questions) { }

    private final PaperProvider papers;

    /** Câu trong đề của phiên, đúng thứ tự `question_order`. */
    public List<AssignmentQuestion> questions(AttemptSession session) {
        Map<Long, AssignmentQuestion> byId = papers.paperQuestions(session.getPaperId()).stream()
                .collect(Collectors.toMap(AssignmentQuestion::getId, Function.identity(), (left, right) -> left));
        return session.getQuestionOrder().stream().map(byId::get).filter(Objects::nonNull).toList();
    }

    public List<Group> groups(AttemptSession session, List<AssignmentQuestion> ordered) {
        return group(ordered, papers.sections(session.getAssignmentId()));
    }

    /** Thứ tự hiển thị: phần giữ thứ tự; trong phần trộn nếu `shuffle` (mỗi phần một muối riêng). */
    public static List<Long> order(List<AssignmentQuestion> original, List<AssignmentSection> sections,
                                   boolean shuffle, PaperShuffler shuffler) {
        List<Long> result = new ArrayList<>();
        List<Group> groups = group(original, sections);
        for (int index = 0; index < groups.size(); index++) {
            List<AssignmentQuestion> items = groups.get(index).questions();
            if (shuffle) items = shuffler.permute(items, -(index + 1L));
            items.forEach(link -> result.add(link.getId()));
        }
        return result;
    }

    /** Nhóm câu theo phần (giữ thứ tự trong `questions`); bỏ phần không có câu nào. */
    public static List<Group> group(List<AssignmentQuestion> questions, List<AssignmentSection> sections) {
        Map<Long, Integer> indexOf = new HashMap<>();
        for (int i = 0; i < sections.size(); i++) indexOf.put(sections.get(i).getId(), i + 1);
        List<List<AssignmentQuestion>> buckets = new ArrayList<>();
        for (int i = 0; i <= sections.size(); i++) buckets.add(new ArrayList<>());
        for (AssignmentQuestion link : questions)
            buckets.get(indexOf.getOrDefault(link.getSectionId(), 0)).add(link);
        List<Group> result = new ArrayList<>();
        for (int i = 0; i < buckets.size(); i++) {
            if (buckets.get(i).isEmpty()) continue;
            result.add(new Group(i == 0 ? "" : sections.get(i - 1).getTitle(), List.copyOf(buckets.get(i))));
        }
        return result;
    }
}
