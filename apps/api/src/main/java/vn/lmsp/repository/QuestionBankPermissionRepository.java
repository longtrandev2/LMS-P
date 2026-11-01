package vn.lmsp.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.lmsp.model.QuestionBankPermission;

public interface QuestionBankPermissionRepository extends JpaRepository<QuestionBankPermission, QuestionBankPermission.Key> {
    Optional<QuestionBankPermission> findById_BankIdAndId_LecturerId(Long bankId, Long lecturerId);
    List<QuestionBankPermission> findAllById_BankIdOrderById_LecturerId(Long bankId);
    void deleteById_BankIdAndId_LecturerId(Long bankId, Long lecturerId);
}
