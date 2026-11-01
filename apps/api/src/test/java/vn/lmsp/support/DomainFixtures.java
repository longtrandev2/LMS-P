package vn.lmsp.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.enums.*;
import vn.lmsp.model.*;

public final class DomainFixtures {
    private DomainFixtures() { }

    public static <T> T identified(T entity, long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }

    public static User user(long id, String role) {
        return identified(new User(role + "@test.local", "private-password-hash", "Demo " + role,
                "SV" + id, role(role)), id);
    }

    public static Role role(String name) {
        Role role = BeanUtils.instantiateClass(Role.class);
        ReflectionTestUtils.setField(role, "name", name);
        return role;
    }

    public static LmsClass clazz(Integer capacity) {
        User lecturer = user(7, "lecturer");
        Course course = identified(new Course("CS101", "Lập trình", null, lecturer), 2);
        return identified(new LmsClass(course, "CS101-01", "Lớp 01", "2026-1", lecturer, null,
                capacity, null, null, "A101", "Thứ hai", ClassStatus.active), 3);
    }

    public static Question question(long id, QuestionType type) {
        User owner = user(7, "lecturer");
        QuestionBank bank = identified(new QuestionBank(null, owner, "Ngân hàng", null, owner), 20);
        QuestionCategory category = identified(new QuestionCategory(bank, "Chưa phân loại", owner), 30);
        return identified(new Question(owner, category, type, "Nội dung hiện tại", "Java",
                QuestionDifficulty.medium), id);
    }

    public static Assignment assignment(AssignmentCategory category) {
        return identified(new Assignment(clazz(null), "Bài 01", null, category,
                LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(1), false, null,
                0, 3, ScorePolicy.best, user(7, "lecturer")), 50);
    }

    public static QuestionSnapshot mcqSnapshot(String content) {
        return new QuestionSnapshot(QuestionType.mcq, content, "Java", QuestionDifficulty.medium, null, null,
                List.of(new OptionView(11L, "Đúng", true, 1), new OptionView(12L, "Sai", false, 2)), null,
                null, List.of());
    }

    public static QuestionSnapshot programmingSnapshot() {
        return new QuestionSnapshot(QuestionType.programming, "Cộng hai số", "Python", QuestionDifficulty.easy, null, null,
                List.of(), null, new ProgrammingView("# starter", null, "private-sample-solution", "python",
                        List.of("python"), 1000, 128, "token", null),
                List.of(new TestCaseView("1 2", "3", true, BigDecimal.ONE, 1),
                        new TestCaseView("private-input", "private-output", false, BigDecimal.TEN, 2)));
    }

    public static QuestionVersion version(Question question, int number, QuestionSnapshot snapshot) {
        return identified(new QuestionVersion(question, number,
                new ObjectMapper().valueToTree(snapshot), user(7, "lecturer")), 1000 + number);
    }

    public static AssignmentQuestion link(Assignment assignment, Question question, String points, int position) {
        return new AssignmentQuestion(assignment, question, new BigDecimal(points), position);
    }
}
