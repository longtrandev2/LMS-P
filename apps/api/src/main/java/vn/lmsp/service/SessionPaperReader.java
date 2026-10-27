package vn.lmsp.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.mapper.QuestionPaperMapper;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AssignmentQuestion;
import vn.lmsp.model.AttemptSession;
import vn.lmsp.repository.AssignmentQuestionRepository;
import vn.lmsp.service.AssignmentReadService.PaperItem;

/**
 * Đọc đề của một phiên đúng như sinh viên đã thấy — docs/exam-spec.md §5.2 bước 5, §6: câu theo `question_order`,
 * lựa chọn trộn bằng {@code PaperShuffler.of(assignment, student, attempt_no)} như lúc bắt đầu phiên.
 */
@Component
@RequiredArgsConstructor
public class SessionPaperReader {
    private final AssignmentQuestionRepository links;
    private final QuestionVersionService snapshots;
    private final QuestionPaperMapper papers;

    /** Câu của phiên theo `question_order` (một truy vấn). */
    public List<AssignmentQuestion> questions(AttemptSession session) {
        Map<Long, AssignmentQuestion> byId = links.findAllById(session.getQuestionOrder()).stream()
                .collect(Collectors.toMap(AssignmentQuestion::getId, Function.identity()));
        return session.getQuestionOrder().stream().map(byId::get).filter(Objects::nonNull).toList();
    }

    /** Đề cho sinh viên của phiên, kèm snapshot để xem lại. */
    public List<PaperItem> paper(Assignment assignment, AttemptSession session) {
        PaperShuffler shuffler = PaperShuffler.of(assignment.getId(), session.getStudentId(), session.getAttemptNo());
        List<PaperItem> items = new ArrayList<>();
        for (AssignmentQuestion link : questions(session)) {
            if (link.getQuestionVersion() == null) continue;
            QuestionSnapshot snapshot = snapshots.read(link.getQuestionVersion());
            items.add(new PaperItem(link, snapshot, papers.student(link, link.getQuestionVersion().getId(), snapshot,
                    items.size() + 1, shuffler, assignment.isShuffleOptions())));
        }
        return items;
    }
}
