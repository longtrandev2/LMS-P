package vn.lmsp.service;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.AdminDtos.*;
import vn.lmsp.enums.AnnouncementAudience;
import vn.lmsp.enums.UserStatus;
import vn.lmsp.model.Announcement;
import vn.lmsp.model.LmsClass;
import vn.lmsp.model.User;
import vn.lmsp.repository.AnnouncementRepository;
import vn.lmsp.repository.ClassRepository;
import vn.lmsp.repository.EnrollmentRepository;
import vn.lmsp.repository.UserRepository;

/** Thông báo hệ thống của admin — docs/admin-spec.md §5.1. Người nhận là tài khoản không bị khóa. */
@Service
@RequiredArgsConstructor
public class AnnouncementService {
    static final String TYPE = "system.announcement";
    static final Set<String> ROLES = Set.of("student", "lecturer", "admin");
    private final AnnouncementRepository announcements;
    private final UserRepository users;
    private final ClassRepository classes;
    private final EnrollmentRepository enrollments;
    private final NotificationFanout fanout;
    private final AuditService audit;

    @Transactional
    public AnnouncementCreated create(AnnouncementInput input, Long actorId) {
        AnnouncementAudience audience = input.audience();
        String role = audience == AnnouncementAudience.ROLE ? requireRole(input.role()) : null;
        LmsClass clazz = audience == AnnouncementAudience.CLASS ? requireClass(input.class_id()) : null;
        Set<Long> recipients = new LinkedHashSet<>(switch (audience) {
            case ALL -> users.findUnlockedIds();
            case ROLE -> users.findUnlockedIdsByRole(role);
            case CLASS -> classRecipients(clazz);
        });
        User creator = users.findById(actorId).orElseThrow(() -> notFound("Không tìm thấy người dùng"));
        String title = input.title().trim();
        Announcement saved = announcements.save(new Announcement(title, input.body(), audience, role, clazz,
                recipients.size(), creator));
        fanout.send(recipients, TYPE, title, input.body(), Map.of("announcement_id", saved.getId()));
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("title", title);
        after.put("audience", audience.value());
        after.put("role", role);
        after.put("class_id", clazz == null ? null : clazz.getId());
        after.put("recipient_count", recipients.size());
        audit.record(actorId, "announcement.create", "announcement", saved.getId(), null, after);
        return new AnnouncementCreated(saved.getId(), recipients.size());
    }

    @Transactional(readOnly = true)
    public AnnouncementPage list(int page, int limit) {
        var result = announcements.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(page - 1, limit));
        return new AnnouncementPage(result.getContent().stream().map(AnnouncementService::toView).toList(),
                result.getTotalElements(), page, limit);
    }

    private List<Long> classRecipients(LmsClass clazz) {
        List<Long> ids = new ArrayList<>(enrollments.findUnlockedActiveStudentIds(clazz.getId()));
        if (clazz.getLecturer().getStatus() != UserStatus.locked) ids.add(clazz.getLecturerId());
        return ids;
    }

    private String requireRole(String role) {
        String value = role == null ? "" : role.trim();
        if (!ROLES.contains(value)) throw bad("Vai trò nhận phải là student, lecturer hoặc admin");
        return value;
    }

    private LmsClass requireClass(Long classId) {
        if (classId == null) throw bad("Chọn lớp nhận thông báo");
        return classes.findById(classId).orElseThrow(() -> bad("Lớp nhận thông báo không tồn tại"));
    }

    private static AnnouncementView toView(Announcement item) {
        User creator = item.getCreator();
        return new AnnouncementView(item.getId(), item.getTitle(), item.getBody(), item.getAudience(), item.getRole(),
                item.getClassId(), item.getLmsClass() == null ? null : item.getLmsClass().getCode(), item.getRecipientCount(),
                new UserRef(creator.getId(), creator.getFullName()), item.getCreatedAt());
    }

    private static LmsException bad(String message) {
        return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null);
    }

    private static LmsException notFound(String message) {
        return new LmsException("NOT_FOUND", message, HttpStatus.NOT_FOUND, null);
    }
}
