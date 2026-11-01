package vn.lmsp.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.ScheduleDtos.AttendanceSheet;
import vn.lmsp.dto.ScheduleDtos.AttendanceUpdate;
import vn.lmsp.service.AttendanceService;
import vn.lmsp.service.AttendanceStatsService;

/** Điểm danh — api-spec §11. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AttendanceController {
    private final AttendanceService attendance;
    private final AttendanceStatsService stats;

    @GetMapping("/sessions/{id}/attendance") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public AttendanceSheet sheet(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return attendance.sheet(id, Long.valueOf(actor), SessionController.isAdmin(auth));
    }

    @PutMapping("/sessions/{id}/attendance") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public AttendanceSheet update(@PathVariable Long id, @Valid @RequestBody AttendanceUpdate body,
                                  @AuthenticationPrincipal String actor, Authentication auth) {
        return attendance.update(id, body, Long.valueOf(actor), SessionController.isAdmin(auth));
    }

    /** Giảng viên/admin: ClassAttendanceSummary; sinh viên: StudentAttendance của mình. */
    @GetMapping("/classes/{classId}/attendance/summary")
    public Object summary(@PathVariable Long classId, @AuthenticationPrincipal String actor, Authentication auth) {
        return stats.summary(classId, Long.valueOf(actor), SessionController.isAdmin(auth));
    }
}
