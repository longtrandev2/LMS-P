package vn.lmsp.service;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.mapper.QuestionBankMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

@Service
public class QuestionBankService {
    private final QuestionBankRepository banks;
    private final QuestionCategoryRepository categories;
    private final QuestionRepository questions;
    private final CourseRepository courses;
    private final ClassRepository classes;
    private final UserRepository users;
    private final AuditService audit;
    private final QuestionBankMapper mapper;

    public QuestionBankService(QuestionBankRepository banks, QuestionCategoryRepository categories,
            QuestionRepository questions, CourseRepository courses, ClassRepository classes,
            UserRepository users, AuditService audit, QuestionBankMapper mapper) {
        this.banks = banks; this.categories = categories; this.questions = questions; this.courses = courses;
        this.classes = classes; this.users = users; this.audit = audit; this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<QuestionBankView> list(Long actor, boolean admin, Long courseId) {
        return banks.findAccessible(actor, admin, courseId).stream().map(mapper::toView).toList();
    }

    @Transactional
    public QuestionBankView create(QuestionBankInput input, Long actorId, boolean admin) {
        if (input.course_id() != null) return ensureCourseBank(input.course_id(), actorId, admin);
        String name = text(input.name(), "Tên ngân hàng");
        User owner = users.findById(actorId).orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND));
        QuestionBank bank = banks.save(new QuestionBank(null, owner, name, blankNull(input.description()), owner));
        categories.save(new QuestionCategory(bank, "Chưa phân loại", owner));
        audit.record(actorId, "question_bank.create", "question_bank", bank.getId(), null, Map.of("name", name));
        return mapper.toView(bank);
    }

    @Transactional
    public QuestionBankView ensureCourseBank(Long courseId, Long actorId, boolean admin) {
        Course course = courses.findLockedById(courseId)
                .orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy học phần", HttpStatus.NOT_FOUND));
        requireCourse(course, actorId, admin);
        var existing = banks.findByCourse_Id(courseId);
        if (existing.isPresent()) return mapper.toView(existing.get());
        User owner = user(actorId);
        String name = course.getCode() + " · Ngân hàng câu hỏi";
        QuestionBank bank = banks.saveAndFlush(new QuestionBank(course, owner, name, null, owner));
        categories.save(new QuestionCategory(bank, "Chưa phân loại", owner));
        audit.record(actorId, "question_bank.create", "question_bank", bank.getId(), null, Map.of("course_id", courseId));
        return mapper.toView(bank);
    }

    @Transactional(readOnly = true)
    public List<CategoryView> categories(Long bankId, Long actor, boolean admin) {
        requireBank(bankId, actor, admin);
        return categories.findAllByBank_IdOrderByNameAsc(bankId).stream().map(mapper::toCategoryView).toList();
    }

    @Transactional
    public CategoryView createCategory(Long bankId, CategoryInput input, Long actorId, boolean admin) {
        QuestionBank bank = requireBank(bankId, actorId, admin); String name = text(input.name(), "Tên danh mục");
        if (categories.existsByBank_IdAndNameIgnoreCase(bankId, name)) throw failure("DUPLICATE_CATEGORY", "Danh mục đã tồn tại trong ngân hàng", HttpStatus.CONFLICT);
        QuestionCategory category = categories.save(new QuestionCategory(bank, name, user(actorId)));
        audit.record(actorId, "question_category.create", "question_category", category.getId(), null, Map.of("bank_id", bankId, "name", name));
        return mapper.toCategoryView(category);
    }

    @Transactional
    public CategoryView renameCategory(Long id, CategoryInput input, Long actorId, boolean admin) {
        QuestionCategory category = category(id); requireBank(category.getBankId(), actorId, admin);
        if (isDefaultCategory(category)) throw failure("DEFAULT_CATEGORY", "Danh mục Chưa phân loại của hệ thống không thể đổi tên", HttpStatus.CONFLICT);
        String name = text(input.name(), "Tên danh mục");
        if (!name.equalsIgnoreCase(category.getName()) && categories.existsByBank_IdAndNameIgnoreCase(category.getBankId(), name))
            throw failure("DUPLICATE_CATEGORY", "Danh mục đã tồn tại trong ngân hàng", HttpStatus.CONFLICT);
        category.rename(name); audit.record(actorId, "question_category.rename", "question_category", id, null, Map.of("name", name));
        return mapper.toCategoryView(category);
    }

    @Transactional
    public void deleteCategory(Long id, Long actorId, boolean admin) {
        QuestionCategory category = category(id); requireBank(category.getBankId(), actorId, admin);
        if (isDefaultCategory(category)) throw failure("DEFAULT_CATEGORY", "Danh mục Chưa phân loại của hệ thống không thể xóa", HttpStatus.CONFLICT);
        if (categories.countByBank_Id(category.getBankId()) <= 1) throw failure("LAST_CATEGORY", "Ngân hàng cần giữ lại ít nhất một danh mục", HttpStatus.CONFLICT);
        if (questions.existsByCategory_Id(id)) throw failure("CATEGORY_NOT_EMPTY", "Chuyển hoặc xóa câu hỏi trong danh mục trước", HttpStatus.CONFLICT);
        categories.delete(category); audit.record(actorId, "question_category.delete", "question_category", id, Map.of("name", category.getName()), null);
    }

    @Transactional(readOnly = true)
    public QuestionCategory requireCategory(Long id, Long actor, boolean admin) {
        QuestionCategory category = category(id); requireBank(category.getBankId(), actor, admin); return category;
    }

    @Transactional
    public QuestionCategory defaultCategory(Long bankId, Long actorId, boolean admin) {
        QuestionBank bank = requireBank(bankId, actorId, admin);
        return categories.findByBank_IdAndNameIgnoreCase(bankId, "Chưa phân loại")
                .orElseGet(() -> categories.save(new QuestionCategory(bank, "Chưa phân loại", user(actorId))));
    }

    @Transactional(readOnly = true)
    public QuestionBank requireBank(Long id, Long actor, boolean admin) {
        QuestionBank bank = banks.findById(id).orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy ngân hàng câu hỏi", HttpStatus.NOT_FOUND));
        if (!admin && !canAccess(bank, actor)) throw failure("FORBIDDEN", "Bạn không có quyền với ngân hàng này", HttpStatus.FORBIDDEN);
        return bank;
    }

    public void requireQuestionUsage(Question question, LmsClass clazz, Long actor, boolean admin) {
        QuestionBank bank = question.getCategory().getBank();
        boolean allowed = admin || (bank.getCourseId() == null ? bank.getOwnerId().equals(actor) : bank.getCourseId().equals(clazz.getCourseId()));
        if (!allowed) throw failure("FORBIDDEN", "Câu hỏi không thuộc học phần hoặc ngân hàng cá nhân của bạn", HttpStatus.FORBIDDEN);
    }

    private boolean canAccess(QuestionBank bank, Long actor) {
        if (bank.getOwnerId().equals(actor)) return true;
        Long courseId = bank.getCourseId();
        return courseId != null && (classes.existsByCourse_IdAndLecturer_Id(courseId, actor) || courses.findById(courseId).map(c -> c.getCreatedBy().equals(actor)).orElse(false));
    }
    private void requireCourse(Course course, Long actor, boolean admin) {
        if (!admin && !course.getCreatedBy().equals(actor) && !classes.existsByCourse_IdAndLecturer_Id(course.getId(), actor))
            throw failure("FORBIDDEN", "Chỉ giảng viên phụ trách học phần mới được tạo ngân hàng trong đó", HttpStatus.FORBIDDEN);
    }
    private QuestionCategory category(Long id) { return categories.findById(id).orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy danh mục", HttpStatus.NOT_FOUND)); }
    private boolean isDefaultCategory(QuestionCategory item) { return "Chưa phân loại".equalsIgnoreCase(item.getName()); }
    private User user(Long id) { return users.findById(id).orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND)); }
    private static String text(String value, String field) { if (value == null || value.isBlank()) throw failure("VALIDATION_ERROR", field + " không được để trống", HttpStatus.BAD_REQUEST); return value.trim(); }
    private static String blankNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static LmsException failure(String code, String message, HttpStatus status) { return new LmsException(code, message, status, null); }
}
