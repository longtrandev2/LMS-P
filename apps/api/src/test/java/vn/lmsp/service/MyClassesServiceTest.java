package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.*;
import static vn.lmsp.support.ScheduleFixtures.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.mapper.AcademicsMapper;
import vn.lmsp.repository.ClassCardQueries;
import vn.lmsp.repository.ClassCardQueries.SessionStats;
import vn.lmsp.repository.EnrollmentRepository;

class MyClassesServiceTest {
    private final EnrollmentRepository enrollments = mock(EnrollmentRepository.class);
    private final ClassCardQueries cards = mock(ClassCardQueries.class);
    private final MyClassesService service = new MyClassesService(enrollments, cards, new AcademicsMapper());

    @Test void cardCombinesBatchedStatisticsPerClass() {
        var clazz = clazz(null);
        when(enrollments.searchMyClasses(eq(42L), eq(EnrollmentStatus.active), isNull(), any()))
                .thenReturn(new PageImpl<>(List.of(enrollment(clazz, user(42, "student")))));
        LocalDateTime next = LocalDateTime.of(2026, 11, 2, 0, 0);
        when(cards.sessionStats(eq(List.of(3L)), any())).thenReturn(Map.of(3L, new SessionStats(15, 6, next)));
        when(cards.attendedSessions(List.of(3L), 42L)).thenReturn(Map.of(3L, 5L));
        when(cards.materials(List.of(3L))).thenReturn(Map.of(3L, 4L));
        when(cards.openAssignments(eq(List.of(3L)), any())).thenReturn(Map.of());

        var card = service.myClasses(42L, 1, 20, " ", "code").items().get(0);

        assertThat(card.credits()).isEqualTo(3);
        assertThat(card.total_sessions()).isEqualTo(15);
        assertThat(card.held_sessions()).isEqualTo(6);
        assertThat(card.attended_sessions()).isEqualTo(5);
        assertThat(card.next_session_at()).isEqualTo(next);
        assertThat(card.materials_count()).isEqualTo(4);
        assertThat(card.open_assignments_count()).isZero();
        assertThat(card.lecturer_avatar_url()).isNull();
        verify(cards, times(1)).sessionStats(any(), any());
    }
}
