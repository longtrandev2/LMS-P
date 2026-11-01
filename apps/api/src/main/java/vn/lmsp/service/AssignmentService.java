package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.ReviewMode;
import vn.lmsp.mapper.AssignmentMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AssignmentService {
    private final AssignmentRepository assignments;
    private final AssignmentAccess access;
    private final AssignmentReadService reader;
    private final UserRepository users;
    private final AssignmentMapper mapper;
    private final AuditService audit;
    private final AssignmentPublishService publisher;
    private final AssignmentAttemptRepository attempts;
    private final BlueprintValidator validator;
    private final BlueprintService blueprints;

    @Transactional(readOnly = true)
    public AssignmentPage list(Long classId, Long actor, boolean student, boolean admin, int page, int limit) {
        List<Assignment> all = student ? studentList(classId, actor) : lecturerList(classId, actor, admin);
        int from = Math.min((page - 1) * limit, all.size()); int to = Math.min(from + limit, all.size());
        return new AssignmentPage(all.subList(from, to).stream().map(reader::summary).toList(), all.size(), page, limit);
    }
    @Transactional
    public AssignmentDetails create(Long classId, AssignmentInput input, Long actorId, boolean admin) {
        LmsClass clazz = access.lecturerClass(classId, actorId, admin); var settings = validator.settings(input);
        Assignment item = assignments.save(new Assignment(clazz, input.title().trim(), input.description(), input.category(),
                input.available_from(), input.due_at(), settings.allowLate(), settings.lateDueAt(), settings.penalty(),
                settings.maxAttempts(), settings.policy(), user(actorId)));
        configure(item, input, settings);
        blueprints.replace(item, input, actorId, admin);
        audit.record(actorId, "assignment.create", "assignment", item.getId(), null, mapper.toAuditValue(item));
        return reader.details(item);
    }
    @Transactional
    public List<AssignmentDetails> createForClasses(BulkAssignmentInput body, Long actorId) {
        List<Long> ids = body.class_ids().stream().distinct().toList();
        if (ids.size() != body.class_ids().size() || ids.size() > 100)
            throw bad("Chọn tối đa 100 lớp và không chọn trùng lớp");
        Long courseId = null;
        for (Long classId : ids) {
            LmsClass clazz = access.lecturerClass(classId, actorId, false);
            if (courseId != null && !courseId.equals(clazz.getCourseId()))
                throw bad("Các lớp nhận cùng một đề phải thuộc cùng học phần");
            courseId = clazz.getCourseId();
        }
        List<AssignmentDetails> created = new ArrayList<>();
        for (Long classId : ids) {
            AssignmentDetails draft = create(classId, body.assignment(), actorId, false);
            created.add(body.publish() ? publisher.publish(draft.assignment().id(), actorId, false,
                    Boolean.TRUE.equals(body.confirm_unverified())) : draft);
        }
        return created;
    }
    @Transactional(readOnly = true)
    public AssignmentDetails get(Long id, Long actorId, boolean student, boolean admin) {
        Assignment item = student ? access.studentAssignment(id, actorId, false) : access.lecturerAssignment(id, actorId, admin, false);
        // Bài giao theo phiên chỉ trả metadata cho sinh viên (đề đọc qua phiên) nên xem được trước giờ mở — exam-spec.md §5.3.
        if (student && !item.isSessionBased() && item.getAvailableFrom() != null && UtcTime.now().isBefore(item.getAvailableFrom()))
            throw conflict("Bài chưa mở");
        if (!student) return reader.details(item);
        int n = item.getCategory() == AssignmentCategory.QUIZ
                ? (int) attempts.countByAssignment_IdAndStudent_Id(id, actorId) + 1 : 0;
        return reader.studentDetails(item, actorId, n);
    }
    @Transactional
    public AssignmentDetails update(Long id, AssignmentInput input, Long actorId, boolean admin) {
        Assignment item = access.lecturerAssignment(id, actorId, admin, true);
        if (item.isPublished()) throw conflict("Bài đã xuất bản nên không thể sửa; hãy tạo bài nháp mới");
        var settings = validator.settings(input); var old = mapper.toAuditValue(item);
        item.update(input.title().trim(), input.description(), input.category(), input.available_from(), input.due_at(),
                settings.allowLate(), settings.lateDueAt(), settings.penalty(), settings.maxAttempts(), settings.policy());
        configure(item, input, settings);
        if (BlueprintService.hasBlueprint(input)) blueprints.replace(item, input, actorId, admin);
        else blueprints.validateExisting(item);
        audit.record(actorId, "assignment.update", "assignment", id, old, mapper.toAuditValue(item));
        return reader.details(item);
    }
    @Transactional
    public AssignmentDetails updatePublishedSettings(Long id, PublishedSettingsInput input, Long actorId, boolean admin) {
        Assignment item = access.lecturerAssignment(id, actorId, admin, true);
        if (!item.isPublished()) throw conflict("Bản nháp cần dùng chức năng sửa bài nháp");
        validatePublishedSettings(input);
        var old = mapper.toAuditValue(item);
        item.updatePublishedSettings(input.title().trim(), input.description(), input.available_from(), input.due_at(),
                input.allow_late(), input.allow_late() ? input.late_due_at() : null,
                input.allow_late() ? input.late_penalty_percent() : 0,
                input.review_mode() == null ? item.getReviewMode() : input.review_mode(),
                input.review_shows_answers() == null ? item.isReviewShowsAnswers() : input.review_shows_answers());
        if (input.rules_text() != null) item.updateRulesText(input.rules_text().isBlank() ? null : input.rules_text());
        var updated = mapper.toAuditValue(item); updated.put("reason", input.reason().trim());
        audit.record(actorId, "assignment.published_settings.update", "assignment", id, old, updated);
        return reader.details(item);
    }
    @Transactional
    public void delete(Long id, Long actorId, boolean admin) {
        Assignment item = access.lecturerAssignment(id, actorId, admin, true);
        if (item.isPublished()) throw conflict("Không thể xóa bài đã xuất bản");
        var old = mapper.toAuditValue(item); assignments.delete(item);
        audit.record(actorId, "assignment.delete", "assignment", id, old, null);
    }
    @Transactional
    public AssignmentDetails publish(Long id, Long actorId, boolean admin, boolean confirmUnverified) {
        return publisher.publish(id, actorId, admin, confirmUnverified);
    }

    private List<Assignment> lecturerList(Long classId, Long actor, boolean admin) {
        access.lecturerClass(classId, actor, admin); return assignments.findAllByLmsClass_IdOrderByCreatedAtDescIdDesc(classId);
    }
    private List<Assignment> studentList(Long classId, Long actor) {
        access.studentClass(classId, actor); return assignments.findAllByLmsClass_IdAndPublishedTrueOrderByDueAtAscIdAsc(classId);
    }
    private void validatePublishedSettings(PublishedSettingsInput input) {
        if (input.due_at() == null) throw bad("Hạn nộp là bắt buộc");
        if (input.available_from() != null && !input.available_from().isBefore(input.due_at()))
            throw bad("Thời điểm mở bài phải trước hạn nộp");
        if (input.allow_late() && (input.late_due_at() == null || !input.late_due_at().isAfter(input.due_at())))
            throw bad("Hạn nộp muộn phải sau hạn nộp chính thức");
    }
    private void configure(Assignment item, AssignmentInput input, BlueprintValidator.Settings settings) {
        item.configureReview(input.review_mode() == null ? ReviewMode.after_close : input.review_mode(),
                input.review_shows_answers() == null || input.review_shows_answers(),
                Boolean.TRUE.equals(input.shuffle_questions()), Boolean.TRUE.equals(input.shuffle_options()));
        item.configureDelivery(settings.timeLimit(), settings.mode(), settings.variantCount(), settings.rulesText());
    }
    private User user(Long id) { return users.findById(id).orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND, null)); }
    private LmsException bad(String message) { return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null); }
    private LmsException conflict(String message) { return new LmsException("CONFLICT", message, HttpStatus.CONFLICT, null); }
}
