package vn.lmsp.service;

import org.springframework.stereotype.Service;
import vn.lmsp.enums.BankPermission;
import vn.lmsp.model.QuestionBank;
import vn.lmsp.repository.ClassRepository;
import vn.lmsp.repository.QuestionBankPermissionRepository;

@Service
public class QuestionBankAccessService {
    private final ClassRepository classes;
    private final QuestionBankPermissionRepository permissions;

    public QuestionBankAccessService(ClassRepository classes, QuestionBankPermissionRepository permissions) {
        this.classes = classes; this.permissions = permissions;
    }

    public boolean canView(QuestionBank bank, Long actor, boolean admin) {
        if (admin || bank.getOwnerId().equals(actor)) return true;
        Long courseId = bank.getCourseId();
        if (courseId == null || !classes.existsByCourse_IdAndLecturer_Id(courseId, actor)) return false;
        return "shared".equals(bank.getVisibility()) || permissions.findById_BankIdAndId_LecturerId(bank.getId(), actor).isPresent();
    }

    public boolean canEdit(QuestionBank bank, Long actor, boolean admin) {
        if (admin || bank.getOwnerId().equals(actor)) return true;
        Long courseId = bank.getCourseId();
        if (courseId == null || !classes.existsByCourse_IdAndLecturer_Id(courseId, actor)) return false;
        return permissions.findById_BankIdAndId_LecturerId(bank.getId(), actor)
                .map(item -> item.getPermission() == BankPermission.edit).orElse(false);
    }
}
