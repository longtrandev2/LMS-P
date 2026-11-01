package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.clazz;
import static vn.lmsp.support.ScheduleFixtures.session;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import vn.lmsp.model.ClassSession;
import vn.lmsp.repository.ClassSessionRepository;

class SessionNumberingTest {
    private final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
    private final SessionNumbering numbering = new SessionNumbering(sessions);

    @Test void renumbersByTimeThroughTemporaryNegativeValues() {
        var clazz = clazz(null);
        LocalDate day = LocalDate.of(2026, 11, 2);
        ClassSession first = session(clazz, 1, 2, day, 1, 3);
        ClassSession second = session(clazz, 2, 1, day.plusDays(2), 1, 3);
        ClassSession added = session(clazz, 3, 3, day.plusDays(1), 1, 3);
        when(sessions.findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(3L)).thenReturn(List.of(first, added, second));

        numbering.renumber(3L);

        assertThat(List.of(first, added, second)).extracting(ClassSession::getSessionNo).containsExactly(1, 2, 3);
        InOrder order = inOrder(sessions);
        order.verify(sessions).findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(3L);
        order.verify(sessions, times(2)).flush();
    }

    @Test void stableNumberingDoesNotTouchTheDatabase() {
        var clazz = clazz(null);
        ClassSession only = session(clazz, 1, 1, LocalDate.of(2026, 11, 2), 1, 3);
        when(sessions.findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(3L)).thenReturn(List.of(only));
        numbering.renumber(3L);
        verify(sessions, never()).flush();
    }

    @Test void periodsMustStayInsideTheDailyGrid() {
        assertThatNoException().isThrownBy(() -> SessionNumbering.validatePeriods(1, 14));
        assertThatThrownBy(() -> SessionNumbering.validatePeriods(5, 4)).hasMessageContaining("Tiết");
        assertThatThrownBy(() -> SessionNumbering.validatePeriods(0, 2)).hasMessageContaining("Tiết");
        assertThatThrownBy(() -> SessionNumbering.validatePeriods(3, 15)).hasMessageContaining("Tiết");
        assertThatThrownBy(() -> SessionNumbering.requireCapacity(201)).hasMessageContaining("200");
    }
}
