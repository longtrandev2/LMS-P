package vn.lmsp.service;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.enums.BankPermission;
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
    private final QuestionBankAccessService access;
    private final QuestionBankPermissionRepository permissions;

    public QuestionBankService(QuestionBankRepository banks, QuestionCategoryRepository categories,
            QuestionRepository questions, CourseRepository courses, ClassRepository classes,
            UserRepository users, AuditService audit, QuestionBankMapper mapper,
            QuestionBankAccessService access, QuestionBankPermissionRepository permissions) {
        this.banks = banks; this.categories = categories; this.questions = questions; this.courses = courses;
        this.classes = classes; this.users = users; this.audit = audit; this.mapper = mapper;
        this.access = access; this.permissions = permissions;
    }

    @Transactional(readOnly = true)
    public List<QuestionBankView> list(Long actor, boolean admin, Long courseId) {
        return banks.findAccessible(actor, admin, courseId).stream()
                .map(bank -> view(bank, actor, admin)).toList();
    }

    @Transactional
    public QuestionBankView create(QuestionBankInput input, Long actorId, boolean admin) {
        if (admin) throw failure("FORBIDDEN", "Giảng viên phụ trách học phần mới được tạo ngân hàng", HttpStatus.FORBIDDEN);
        Course course = courses.findById(input.course_id())
                .orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy học phần", HttpStatus.NOT_FOUND));
        if (!classes.existsByCourse_IdAndLecturer_Id(course.getId(), actorId))
            throw failure("FORBIDDEN", "Bạn chưa được phân công giảng dạy học phần", HttpStatus.FORBIDDEN);
        String name = text(input.name(), "Tên ngân hàng");
        User owner = user(actorId);
        QuestionBank bank = banks.save(new QuestionBank(course, owner, name, blankNull(input.description()),
                input.visibility() == null ? "private" : input.visibility(), owner));
        categories.save(new QuestionCategory(bank, "Chưa phân loại", owner));
        audit.record(actorId, "question_bank.create", "question_bank", bank.getId(), null, Map.of("name", name));
        return view(bank, actorId, false);
    }

    @Transactional(readOnly = true)
    public List<CategoryView> categories(Long bankId, Long actor, boolean admin) {
        requireBank(bankId, actor, admin);
        return categories.findAllByBank_IdOrderByNameAsc(bankId).stream().map(mapper::toCategoryView).toList();
    }

    @Transactional
    public CategoryView createCategory(Long bankId, CategoryInput input, Long actorId, boolean admin) {
        QuestionBank bank = requireEditableBank(bankId, actorId, admin); String name = text(input.name(), "Tên danh mục");
        if (categories.existsByBank_IdAndNameIgnoreCase(bankId, name)) throw failure("DUPLICATE_CATEGORY", "Danh mục đã tồn tại trong ngân hàng", HttpStatus.CONFLICT);
        QuestionCategory category = categories.save(new QuestionCategory(bank, name, user(actorId)));
        audit.record(actorId, "question_category.create", "question_category", category.getId(), null, Map.of("bank_id", bankId, "name", name));
        return mapper.toCategoryView(category);
    }

    @Transactional
    public CategoryView renameCategory(Long id, CategoryInput input, Long actorId, boolean admin) {
        QuestionCategory category = category(id); requireEditableBank(category.getBankId(), actorId, admin);
        if (isDefaultCategory(category)) throw failure("DEFAULT_CATEGORY", "Danh mục Chưa phân loại của hệ thống không thể đổi tên", HttpStatus.CONFLICT);
        String name = text(input.name(), "Tên danh mục");
        if (!name.equalsIgnoreCase(category.getName()) && categories.existsByBank_IdAndNameIgnoreCase(category.getBankId(), name))
            throw failure("DUPLICATE_CATEGORY", "Danh mục đã tồn tại trong ngân hàng", HttpStatus.CONFLICT);
        category.rename(name); audit.record(actorId, "question_category.rename", "question_category", id, null, Map.of("name", name));
        return mapper.toCategoryView(category);
    }

    @Transactional
    public void deleteCategory(Long id, Long actorId, boolean admin) {
        QuestionCategory category = category(id); requireEditableBank(category.getBankId(), actorId, admin);
        if (isDefaultCategory(category)) throw failure("DEFAULT_CATEGORY", "Danh mục Chưa phân loại của hệ thống không thể xóa", HttpStatus.CONFLICT);
        if (categories.countByBank_Id(category.getBankId()) <= 1) throw failure("LAST_CATEGORY", "Ngân hàng cần giữ lại ít nhất một danh mục", HttpStatus.CONFLICT);
        if (questions.existsByCategory_Id(id)) throw failure("CATEGORY_NOT_EMPTY", "Chuyển hoặc xóa câu hỏi trong danh mục trước", HttpStatus.CONFLICT);
        categories.delete(category); audit.record(actorId, "question_category.delete", "question_category", id, Map.of("name", category.getName()), null);
    }

    @Transactional(readOnly = true)
    public QuestionCategory requireCategory(Long id, Long actor, boolean admin) {
        QuestionCategory category = category(id); requireBank(category.getBankId(), actor, admin); return category;
    }

    public QuestionCategory requireEditableCategory(Long id, Long actor, boolean admin) {
        QuestionCategory category = category(id); requireEditableBank(category.getBankId(), actor, admin); return category;
    }

    @Transactional
    public QuestionCategory defaultCategory(Long bankId, Long actorId, boolean admin) {
        QuestionBank bank = requireEditableBank(bankId, actorId, admin);
        return categories.findByBank_IdAndNameIgnoreCase(bankId, "Chưa phân loại")
                .orElseGet(() -> categories.save(new QuestionCategory(bank, "Chưa phân loại", user(actorId))));
    }

    @Transactional(readOnly = true)
    public QuestionBank requireBank(Long id, Long actor, boolean admin) {
        QuestionBank bank = banks.findById(id).orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy ngân hàng câu hỏi", HttpStatus.NOT_FOUND));
        if (!access.canView(bank, actor, admin)) throw failure("FORBIDDEN", "Bạn không có quyền với ngân hàng này", HttpStatus.FORBIDDEN);
        return bank;
    }

    public QuestionBank requireEditableBank(Long id, Long actor, boolean admin) {
        QuestionBank bank = requireBank(id, actor, admin);
        if (!access.canEdit(bank, actor, admin)) throw failure("FORBIDDEN", "Bạn chỉ được xem ngân hàng này", HttpStatus.FORBIDDEN);
        return bank;
    }

    @Transactional
    public QuestionBankView setVisibility(Long id, String visibility, Long actor, boolean admin) {
        QuestionBank bank = requireManagedBank(id, actor, admin);
        if (!"private".equals(visibility) && !"shared".equals(visibility))
            throw failure("VALIDATION_ERROR", "Phạm vi ngân hàng không hợp lệ", HttpStatus.BAD_REQUEST);
        bank.setVisibility(visibility);
        audit.record(actor, "question_bank.visibility", "question_bank", id, null, Map.of("visibility", visibility));
        return view(bank, actor, admin);
    }

    @Transactional(readOnly = true)
    public List<BankPermissionView> permissions(Long id, Long actor, boolean admin) {
        requireManagedBank(id, actor, admin);
        return this.permissions.findAllById_BankIdOrderById_LecturerId(id).stream()
                .map(item -> new BankPermissionView(item.getLecturerId(), item.getPermission())).toList();
    }

    @Transactional(readOnly = true)
    public List<BankLecturerView> eligibleLecturers(Long id, Long actor, boolean admin) {
        QuestionBank bank = requireManagedBank(id, actor, admin);
        if (bank.getCourseId() == null) return List.of();
        return classes.findOtherLecturers(bank.getCourseId(), bank.getOwnerId()).stream()
                .map(user -> new BankLecturerView(user.getId(), user.getFullName(), user.getEmail())).toList();
    }

    @Transactional
    public BankPermissionView grant(Long id, Long lecturerId, BankPermission permission, Long actor, boolean admin) {
        QuestionBank bank = requireManagedBank(id, actor, admin);
        if (bank.getCourseId() == null || !classes.existsByCourse_IdAndLecturer_Id(bank.getCourseId(), lecturerId))
            throw failure("VALIDATION_ERROR", "Giảng viên chưa được phân công vào học phần", HttpStatus.BAD_REQUEST);
        if (bank.getOwnerId().equals(lecturerId))
            throw failure("VALIDATION_ERROR", "Chủ ngân hàng đã có toàn quyền", HttpStatus.BAD_REQUEST);
        User lecturer = user(lecturerId);
        if (lecturer.getRoles().stream().noneMatch(role -> "lecturer".equals(role.getName())))
            throw failure("VALIDATION_ERROR", "Tài khoản không phải giảng viên", HttpStatus.BAD_REQUEST);
        var existing = permissions.findById_BankIdAndId_LecturerId(id, lecturerId);
        if (existing.isPresent()) existing.get().setPermission(permission);
        else permissions.save(new QuestionBankPermission(bank, lecturer, permission));
        audit.record(actor, "question_bank.permission", "question_bank", id, null,
                Map.of("lecturer_id", lecturerId, "permission", permission.name()));
        return new BankPermissionView(lecturerId, permission);
    }

    @Transactional
    public void revoke(Long id, Long lecturerId, Long actor, boolean admin) {
        requireManagedBank(id, actor, admin);
        permissions.deleteById_BankIdAndId_LecturerId(id, lecturerId);
        audit.record(actor, "question_bank.permission_revoke", "question_bank", id,
                Map.of("lecturer_id", lecturerId), null);
    }

    private QuestionBank requireManagedBank(Long id, Long actor, boolean admin) {
        QuestionBank bank = requireBank(id, actor, admin);
        if (!admin && !bank.getOwnerId().equals(actor))
            throw failure("FORBIDDEN", "Chỉ chủ ngân hàng được chia sẻ ngân hàng", HttpStatus.FORBIDDEN);
        return bank;
    }

    private QuestionBankView view(QuestionBank bank, Long actor, boolean admin) {
        return mapper.toView(bank, access.canEdit(bank, actor, admin), admin || bank.getOwnerId().equals(actor));
    }

    public void requireQuestionUsage(Question question, LmsClass clazz, Long actor, boolean admin) {
        QuestionBank bank = question.getCategory().getBank();
        boolean allowed = bank.getCourseId() == null
                ? bank.getOwnerId().equals(actor)
                : bank.getCourseId().equals(clazz.getCourseId()) && access.canView(bank, actor, false);
        if (!allowed) throw failure("FORBIDDEN", "Câu hỏi không thuộc học phần hoặc ngân hàng cá nhân của bạn", HttpStatus.FORBIDDEN);
    }

    private QuestionCategory category(Long id) { return categories.findById(id).orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy danh mục", HttpStatus.NOT_FOUND)); }
    private boolean isDefaultCategory(QuestionCategory item) { return "Chưa phân loại".equalsIgnoreCase(item.getName()); }
    private User user(Long id) { return users.findById(id).orElseThrow(() -> failure("NOT_FOUND", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND)); }
    private static String text(String value, String field) { if (value == null || value.isBlank()) throw failure("VALIDATION_ERROR", field + " không được để trống", HttpStatus.BAD_REQUEST); return value.trim(); }
    private static String blankNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static LmsException failure(String code, String message, HttpStatus status) { return new LmsException(code, message, status, null); }
}
