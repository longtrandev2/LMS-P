package vn.lmsp.service;

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
import java.math.BigDecimal;
import java.util.*;

@Service
public class QuestionService {
    private final QuestionRepository questions;
    private final QuestionOptionRepository options;
    private final QuestionProgrammingRepository programming;
    private final TestCaseRepository testCases;
    private final UserRepository users;
    private final QuestionReadService reader;
    private final QuestionVersionService snapshots;
    private final QuestionMapper mapper;
    private final QuestionBankService banks;
    private final AuditService audit;

    public QuestionService(QuestionRepository questions, QuestionOptionRepository options,
            QuestionProgrammingRepository programming, TestCaseRepository testCases,
            UserRepository users, QuestionReadService reader, QuestionVersionService snapshots,
            QuestionMapper mapper, QuestionBankService banks, AuditService audit) {
        this.questions = questions; this.options = options; this.programming = programming; this.testCases = testCases;
        this.users = users; this.reader = reader; this.snapshots = snapshots; this.mapper = mapper; this.banks = banks; this.audit = audit;
    }
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
                : banks.requireCategory(input.category_id(), actorId, admin);
        if (!category.getBankId().equals(input.bank_id())) throw bad("Danh mục không thuộc ngân hàng đã chọn");
        Question q = questions.save(new Question(actor, category, input.type(), text(input.content(), "Nội dung câu hỏi"),
                blankNull(input.topic()), input.difficulty() == null ? QuestionDifficulty.medium : input.difficulty()));
        applyCreate(q, input); questions.flush(); snapshots.saveVersion(q, actor);
        audit.record(actorId, "question.create", "question", q.getId(), null, mapper.toAuditValue(q));
        return reader.view(q);
    }
    @Transactional
    public QuestionView update(Long id, QuestionPatch input, Long actorId, boolean admin) {
        Question q = access(id, actorId, admin, true);
        if (input.type() != null && input.type() != q.getType()) throw bad("Không thể đổi loại câu hỏi sau khi tạo");
        String content = input.content() == null ? q.getContent() : text(input.content(), "Nội dung câu hỏi");
        String topic = input.topic() == null ? q.getTopic() : blankNull(input.topic());
        QuestionDifficulty difficulty = input.difficulty() == null ? q.getDifficulty() : input.difficulty();
        QuestionCategory category = input.category_id() == null ? q.getCategory() : banks.requireCategory(input.category_id(), actorId, admin);
        var old = mapper.toAuditValue(q); q.update(content, topic, difficulty, category);
        if (q.getType() == QuestionType.mcq && input.options() != null) replaceOptions(q, input.options());
        if (q.getType() == QuestionType.programming && input.programming() != null) saveProgramming(q, input.programming());
        q.touch();
        snapshots.saveVersion(q, user(actorId));
        audit.record(actorId, "question.update", "question", id, old, mapper.toAuditValue(q));
        return reader.view(q);
    }
    @Transactional
    public void delete(Long id, Long actorId, boolean admin) {
        Question q = access(id, actorId, admin, true); var old = mapper.toAuditValue(q); q.softDelete();
        audit.record(actorId, "question.delete", "question", id, old, null);
    }
    @Transactional
    public QuestionView replaceCases(Long id, List<TestCaseInput> input, Long actorId, boolean admin) {
        Question q = access(id, actorId, admin, true);
        if (q.getType() != QuestionType.programming) throw bad("Test case chỉ áp dụng cho câu hỏi lập trình");
        testCases.deleteAllByQuestion_Id(id);
        for (int i = 0; i < input.size(); i++) {
            TestCaseInput row = input.get(i);
            testCases.save(new TestCase(q, row.input(), row.expected_output(), !Boolean.FALSE.equals(row.is_public()),
                    row.weight() == null ? BigDecimal.ONE : row.weight(), i + 1));
        }
        q.touch();
        snapshots.saveVersion(q, user(actorId));
        audit.record(actorId, "question.test_cases.replace", "question", id, null, Map.of("count", input.size()));
        return reader.view(q);
    }
    @Transactional(readOnly = true)
    public void requireVerifyOwner(Long id, Long actorId, boolean admin) {
        Question q = access(id, actorId, admin, false);
        if (q.getType() != QuestionType.programming) throw bad("Chỉ chạy thử câu hỏi lập trình");
        throw new LmsException("RUNNER_UNAVAILABLE", "Chức năng chạy thử cần worker sandbox; worker hiện chưa có bộ chạy code.", HttpStatus.NOT_IMPLEMENTED, null);
    }

    private void applyCreate(Question q, QuestionInput input) {
        if (q.getType() == QuestionType.mcq) {
            if (input.programming() != null) throw bad("Câu trắc nghiệm không nhận cấu hình lập trình");
            replaceOptions(q, input.options() == null ? List.of() : input.options());
        } else {
            if (input.options() != null && !input.options().isEmpty()) throw bad("Câu lập trình không nhận lựa chọn MCQ");
            if (input.programming() == null) throw bad("Thiếu cấu hình câu hỏi lập trình");
            saveProgramming(q, input.programming());
        }
    }
    private void replaceOptions(Question q, List<OptionInput> rows) {
        long correct = rows.stream().filter(row -> Boolean.TRUE.equals(row.is_correct())).count();
        if (rows.size() < 2 || correct != 1) throw bad("MCQ cần ít nhất 2 lựa chọn và đúng 1 đáp án chính xác");
        options.deleteAllByQuestion_Id(q.getId());
        for (int i = 0; i < rows.size(); i++) options.save(new QuestionOption(q, text(rows.get(i).content(), "Nội dung lựa chọn"), Boolean.TRUE.equals(rows.get(i).is_correct()), i + 1));
    }
    private void saveProgramming(Question q, ProgrammingInput input) {
        int time = input.time_limit_ms() == null ? 5000 : input.time_limit_ms();
        int memory = input.memory_limit_mb() == null ? 256 : input.memory_limit_mb();
        if (time < 100 || time > 30000 || memory < 32 || memory > 2048) throw bad("Giới hạn thời gian hoặc bộ nhớ không hợp lệ");
        var entity = programming.findById(q.getId()).orElseGet(() -> new QuestionProgramming(q, null, null, null, time, memory));
        entity.update(input.starter_code(), input.solution_code(), input.allowed_languages(), time, memory);
        programming.save(entity);
    }
    private Question access(Long id, Long actorId, boolean admin, boolean lock) {
        Question q = (lock ? questions.findLockedById(id) : questions.findByIdAndDeletedFalse(id))
                .orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy câu hỏi", HttpStatus.NOT_FOUND, null));
        banks.requireCategory(q.getCategoryId(), actorId, admin);
        return q;
    }
    private User user(Long id) { return users.findById(id).orElseThrow(() -> new LmsException("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND, null)); }
    private String text(String value, String label) { if (value == null || value.isBlank()) throw bad(label + " không được để trống"); return value.trim(); }
    private String blankNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private LmsException bad(String message) { return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null); }
}
