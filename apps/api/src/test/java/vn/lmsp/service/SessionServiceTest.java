package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static vn.lmsp.support.DomainFixtures.clazz;
import static vn.lmsp.support.ScheduleFixtures.session;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.ScheduleDtos.SessionPatch;
import vn.lmsp.enums.SessionMode;
import vn.lmsp.mapper.ScheduleMapper;
import vn.lmsp.model.ClassSession;
import vn.lmsp.model.LmsClass;
import vn.lmsp.repository.*;

class SessionServiceTest {
    private final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
    private final AttendanceRecordRepository records = mock(AttendanceRecordRepository.class);
    private final LeaveRequestRepository leaves = mock(LeaveRequestRepository.class);
    private final ClassAccess access = mock(ClassAccess.class);
    private final SessionNumbering numbering = mock(SessionNumbering.class);
    private final SessionViewAssembler views = mock(SessionViewAssembler.class);
    private final AuditService audit = mock(AuditService.class);
    private final SessionService service = new SessionService(sessions, records, leaves, mock(UserRepository.class),
            access, numbering, views, new ScheduleMapper(), audit);
    private final LmsClass clazz = clazz(null);
    private final ClassSession item = session(clazz, 30, 1, LocalDate.of(2026, 11, 2), 1, 3);

    private void owned() {
        when(sessions.findById(30L)).thenReturn(Optional.of(item));
        when(access.manageLocked(3L, 7L, false)).thenReturn(clazz);
    }

    @Test void markedSessionCannotBeDeletedOnlyCancelled() {
        owned();
        when(records.existsBySession_Id(30L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(30L, 7L, false)).extracting("code").isEqualTo("CONFLICT");
        verify(sessions, never()).delete(any());
    }

    @Test void sessionWithLeaveRequestCannotBeDeleted() {
        owned();
        when(leaves.existsBySession_Id(30L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(30L, 7L, false)).extracting("code").isEqualTo("CONFLICT");
    }

    @Test void unmarkedSessionIsDeletedRenumberedAndAudited() {
        owned();
        service.delete(30L, 7L, false);
        verify(sessions).delete(item);
        verify(numbering).renumber(3L);
        verify(audit).record(eq(7L), eq("session.delete"), eq("class_session"), eq(30L), anyMap(), isNull());
    }

    @Test void reschedulingRecomputesUtcTimesAndAllowsANewReminder() {
        owned();
        ReflectionTestUtils.setField(item, "upcomingNotifiedAt", LocalDateTime.now());
        service.update(30L, new SessionPatch(LocalDate.of(2026, 11, 3), 10, 11, "", SessionMode.online, null, null, true), 7L, false);

        assertThat(item.getStartsAt()).isEqualTo(LocalDateTime.of(2026, 11, 3, 9, 0));
        assertThat(item.getEndsAt()).isEqualTo(LocalDateTime.of(2026, 11, 3, 10, 50));
        assertThat(item.getUpcomingNotifiedAt()).isNull();
        assertThat(item.getRoom()).isNull();
        assertThat(item.isCancelled()).isTrue();
        verify(numbering).renumber(3L);
        verify(audit).record(eq(7L), eq("session.update"), eq("class_session"), eq(30L), anyMap(), anyMap());
    }

    @Test void invalidPeriodsAreRejectedOnUpdate() {
        owned();
        assertThatThrownBy(() -> service.update(30L, new SessionPatch(null, 5, null, null, null, null, null, null), 7L, false))
                .isInstanceOf(LmsException.class).extracting("code").isEqualTo("VALIDATION_ERROR");
    }

    @Test void studentsListSessionsWithTheirOwnStatus() {
        when(access.member(3L, 42L, false)).thenReturn(new ClassAccess.Member(clazz, false));
        when(sessions.findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(3L)).thenReturn(List.of(item));
        service.list(3L, 42L, false, null, "02/11");
        verify(views).views(clazz, List.of(item), 42L);
        when(access.member(3L, 7L, false)).thenReturn(new ClassAccess.Member(clazz, true));
        service.list(3L, 7L, false, SessionMode.online, null);
        verify(views).views(clazz, List.of(), null);
    }
}
