package vn.lmsp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.mapper.QuestionMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import java.util.*;

/** Soạn câu hỏi: tạo/sửa một request, một transaction, tối đa một version — assessment-spec.md §2. */
@Service
@RequiredArgsConstructor
public class QuestionService {
    private final QuestionRepository questions;
    private final UserRepository users;
    private final QuestionReadService reader;
    private final QuestionVersionService snapshots;
    private final QuestionContentValidator validator;
    private final QuestionContentService contents;
    private final QuestionMapper mapper;
    private final QuestionBankService banks;
    private final AuditService audit;

    @Transactional(readOnly = true)
    public QuestionPage list(Long actor, boolean admin, Long bankId, Long categoryId, QuestionType type,
            String topic, QuestionDifficulty difficulty, String query, int page, int limit, String sort) {
        if (categoryId != null) {
            QuestionCategory category = banks.requireCategory(categoryId, actor, admin);
            if (bankId != null && !bankId.equals(category.getBankId())) throw bad("Danh mục không thuộc ngân hàng đã chọn");
            bankId = category.getBankId();
        }
        if (bankId != null) banks.requireBank(bankId, actor, admin);
        Long owner = bankId == null && !admin ? actor : null;
        String field = switch (sort) { case "updated_at" -> "updatedAt"; case "difficulty" -> "difficulty"; default -> "createdAt"; };
        var result = questions.search(owner, bankId, categoryId, type, blankNull(topic), difficulty, blankNull(query),
                PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, field)));
        return new QuestionPage(result.getContent().stream().map(reader::summary).toList(), result.getTotalElements(), page, limit);
    }
    @Transactional(readOnly = true)
    public QuestionView get(Long id, Long actor, boolean admin) { return reader.view(access(id, actor, admin, false)); }
    @Transactional
    public QuestionView create(QuestionInput input, Long actorId, boolean admin) {
        User actor = user(actorId);
        QuestionCategory category = input.category_id() == null
                ? banks.defaultCategory(input.bank_id(), actorId, admin)
                : banks.requireEditableCategory(input.category_id(), actorId, admin);
        if (!category.getBankId().equals(input.bank_id())) throw bad("Danh mục không thuộc ngân hàng đã chọn");
        QuestionContent content = validator.validate(input.type(), input.content(), input.explanation(), input.scoring_mode(),
                input.options(), input.answer_spec(), input.programming(), input.test_cases());
        Question q = questions.save(new Question(actor, category, input.type(), content.content(),
                blankNull(input.topic()), input.difficulty() == null ? QuestionDifficulty.medium : input.difficulty()));
        contents.apply(q, content); questions.flush(); snapshots.saveVersion(q, actor);
        audit.record(actorId, "question.create", "question", q.getId(), null, mapper.toAuditValue(q));
        return reader.view(q);
    }
    @Transactional
    public QuestionView update(Long id, QuestionPatch input, Long actorId, boolean admin) {
        Question q = access(id, actorId, admin, true);
        QuestionType type = q.getType();
        if (input.type() != null && input.type() != type) throw bad("Không thể đổi loại câu hỏi sau khi tạo");
        QuestionContent content = validator.validate(type,
                input.content() == null ? q.getContent() : input.content(),
                input.explanation() == null ? q.getExplanation() : input.explanation(),
                input.scoring_mode() == null ? q.getScoringMode() : input.scoring_mode(),
                input.options() != null ? input.options() : type.isChoice() ? contents.currentOptions(id) : null,
                input.answer_spec() != null ? input.answer_spec() : type.usesAnswerSpec() ? q.getAnswerSpec() : null,
                input.programming() != null ? input.programming() : programming(type) ? contents.currentProgramming(id) : null,
                input.test_cases() != null ? input.test_cases() : programming(type) ? contents.currentTests(id) : null);
        String topic = input.topic() == null ? q.getTopic() : blankNull(input.topic());
        QuestionDifficulty difficulty = input.difficulty() == null ? q.getDifficulty() : input.difficulty();
        QuestionCategory category = input.category_id() == null ? q.getCategory() : banks.requireEditableCategory(input.category_id(), actorId, admin);
        var old = mapper.toAuditValue(q);
        q.update(content.content(), topic, difficulty, category);
        contents.apply(q, content); q.touch(); questions.flush();
        snapshots.saveVersion(q, user(actorId));
        audit.record(actorId, "question.update", "question", id, old, mapper.toAuditValue(q));
        return reader.view(q);
    }
    @Transactional
    public void delete(Long id, Long actorId, boolean admin) {
        Question q = access(id, actorId, admin, true); var old = mapper.toAuditValue(q); q.softDelete();
        audit.record(actorId, "question.delete", "question", id, old, null);
    }
    /** Tương thích cũ: thay toàn bộ test. Form mới gửi test trong POST/PATCH. */
    @Transactional
    public QuestionView replaceCases(Long id, List<TestCaseInput> input, Long actorId, boolean admin) {
        Question q = access(id, actorId, admin, true);
        if (!programming(q.getType())) throw bad("Test case chỉ áp dụng cho câu hỏi lập trình");
        QuestionContent content = validator.validate(q.getType(), q.getContent(), q.getExplanation(), q.getScoringMode(),
                null, null, contents.currentProgramming(id), input);
        contents.apply(q, content); q.touch(); questions.flush();
        snapshots.saveVersion(q, user(actorId));
        audit.record(actorId, "question.test_cases.replace", "question", id, null, Map.of("count", input.size()));
        return reader.view(q);
    }
    /** Câu hỏi còn hiệu lực mà người dùng được sửa (không khóa dòng). */
    @Transactional(readOnly = true)
    public Question requireEditable(Long id, Long actorId, boolean admin) {
        Question q = questions.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy câu hỏi", HttpStatus.NOT_FOUND, null));
        banks.requireEditableCategory(q.getCategoryId(), actorId, admin);
        return q;
    }

    private Question access(Long id, Long actorId, boolean admin, boolean edit) {
        Question q = (edit ? questions.findLockedById(id) : questions.findByIdAndDeletedFalse(id))
                .orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy câu hỏi", HttpStatus.NOT_FOUND, null));
        if (edit) banks.requireEditableCategory(q.getCategoryId(), actorId, admin);
        else banks.requireCategory(q.getCategoryId(), actorId, admin);
        return q;
    }
    private static boolean programming(QuestionType type) { return type == QuestionType.programming; }
    private User user(Long id) { return users.findById(id).orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND, null)); }
    private String blankNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private LmsException bad(String message) { return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null); }
}
