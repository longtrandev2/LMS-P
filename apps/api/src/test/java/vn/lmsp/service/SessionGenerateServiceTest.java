package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.clazz;
import static vn.lmsp.support.ScheduleFixtures.session;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.ScheduleDtos.GenerateInput;
import vn.lmsp.dto.ScheduleDtos.WeeklyPattern;
import vn.lmsp.enums.SessionMode;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.ClassSessionRepository;
import vn.lmsp.repository.UserRepository;

class SessionGenerateServiceTest {
    private static final LocalDate MONDAY = LocalDate.of(2026, 11, 2);
    private final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ClassAccess access = mock(ClassAccess.class);
    private final SessionNumbering numbering = mock(SessionNumbering.class);
    private final AuditService audit = mock(AuditService.class);
    private final SessionGenerateService service = new SessionGenerateService(sessions, users, access, numbering, audit);
    private final LmsClass clazz = clazz(null);

    @BeforeEach void setUp() {
        when(access.manageLocked(3L, 7L, false)).thenReturn(clazz);
        when(users.getReferenceById(7L)).thenReturn(clazz.getLecturer());
        when(sessions.findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(3L)).thenReturn(List.of());
    }

    private static GenerateInput input(LocalDate from, LocalDate to, boolean replace, WeeklyPattern... patterns) {
        return new GenerateInput(from, to, List.of(patterns), replace);
    }
    private static WeeklyPattern pattern(int weekday, int start, int end) {
        return new WeeklyPattern(weekday, start, end, "B202", SessionMode.in_person);
    }
    @SuppressWarnings("unchecked")
    private List<ClassSession> saved() {
        ArgumentCaptor<List<ClassSession>> captor = ArgumentCaptor.forClass(List.class);
        verify(sessions).saveAll(captor.capture());
        return captor.getValue();
    }

    @Test void createsOneSessionPerMatchingWeekdayWithUtcTimes() {
        var result = service.generate(3L, input(MONDAY, MONDAY.plusDays(27), false, pattern(1, 1, 3), pattern(4, 7, 9)), 7L, false);

        assertThat(result.created()).isEqualTo(8);
        assertThat(result.removed()).isZero();
        List<ClassSession> created = saved();
        assertThat(created).extracting(ClassSession::getSessionDate).first().isEqualTo(MONDAY);
        assertThat(created.get(1).getSessionDate()).isEqualTo(MONDAY.plusDays(3));
        assertThat(created.get(0).getStartsAt()).isEqualTo(LocalDateTime.of(2026, 11, 2, 0, 0));
        assertThat(created.get(1).getEndsAt()).isEqualTo(LocalDateTime.of(2026, 11, 5, 8, 50));
        assertThat(created).extracting(ClassSession::getSessionNo).doesNotHaveDuplicates();
        verify(numbering).renumber(3L);
        verify(audit).record(eq(7L), eq("session.generate"), eq("class"), eq(3L), isNull(), anyMap());
    }

    @Test void replaceRemovesUnmarkedSessionsAndAppendSkipsOverlappingSlots() {
        when(sessions.findReplaceableIds(3L)).thenReturn(List.of(11L, 12L, 13L));
        when(sessions.deleteByIds(List.of(11L, 12L, 13L))).thenReturn(3);
        ClassSession kept = session(clazz, 20, 1, MONDAY, 2, 4);
        when(sessions.findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(3L)).thenReturn(List.of(kept));

        var result = service.generate(3L, input(MONDAY, MONDAY.plusDays(13), true, pattern(1, 1, 3)), 7L, false);

        assertThat(result.removed()).isEqualTo(3);
        assertThat(result.created()).isEqualTo(1);
        assertThat(saved()).singleElement().satisfies(s -> {
            assertThat(s.getSessionDate()).isEqualTo(MONDAY.plusDays(7));
            assertThat(s.getSessionNo()).isEqualTo(2);
        });
    }

    @Test void appendModeNeverDeletesExistingSessions() {
        service.generate(3L, input(MONDAY, MONDAY, false, pattern(1, 1, 2)), 7L, false);
        verify(sessions, never()).findReplaceableIds(any());
        verify(sessions, never()).deleteByIds(any());
    }

    @Test void rejectsInvalidRangesPatternsAndClassCapacity() {
        assertInvalid(input(MONDAY, MONDAY.minusDays(1), false, pattern(1, 1, 2)));
        assertInvalid(input(MONDAY, MONDAY.plusWeeks(26).plusDays(1), false, pattern(1, 1, 2)));
        assertInvalid(input(MONDAY, MONDAY.plusDays(7), false, pattern(1, 4, 2)));
        assertInvalid(input(MONDAY, MONDAY.plusDays(7), false, pattern(1, 1, 3), pattern(1, 3, 5)));
        List<ClassSession> full = new ArrayList<>(Collections.nCopies(199, session(clazz, 1, 1, MONDAY.minusYears(1), 1, 1)));
        when(sessions.findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(3L)).thenReturn(full);
        assertInvalid(input(MONDAY, MONDAY.plusDays(7), false, pattern(1, 1, 2)));
        verify(sessions, never()).saveAll(any());
    }

    @Test void twentySixWeeksIsTheInclusiveLimit() {
        var result = service.generate(3L, input(MONDAY, MONDAY.plusWeeks(26), false, pattern(1, 1, 2)), 7L, false);
        assertThat(result.created()).isEqualTo(27);
    }

    @Test void onlyTheResponsibleLecturerOrAdminCanGenerate() {
        when(access.manageLocked(3L, 8L, false)).thenThrow(new LmsException("FORBIDDEN", "x", HttpStatus.FORBIDDEN, null));
        assertThatThrownBy(() -> service.generate(3L, input(MONDAY, MONDAY, false, pattern(1, 1, 2)), 8L, false))
                .isInstanceOf(LmsException.class).extracting("code").isEqualTo("FORBIDDEN");
        verifyNoInteractions(audit);
    }

    private void assertInvalid(GenerateInput input) {
        assertThatThrownBy(() -> service.generate(3L, input, 7L, false))
                .isInstanceOf(LmsException.class).extracting("code").isEqualTo("VALIDATION_ERROR");
    }
}
