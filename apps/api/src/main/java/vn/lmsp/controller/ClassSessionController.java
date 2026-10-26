package vn.lmsp.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AcademicsDtos.*;
import vn.lmsp.service.ClassSessionService;
import java.time.LocalDate;
import java.util.List;

/** Buổi học + lịch (FR-CRS-05..07): xem cần là thành viên lớp; tạo/sửa/xóa chỉ lec/adm. */
@RestController
@RequestMapping("/api/v1")
public class ClassSessionController {
    private final ClassSessionService service;
    public ClassSessionController(ClassSessionService service) { this.service = service; }
    @GetMapping("/classes/{id}/sessions")
    public List<SessionView> list(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth,
                                  @RequestParam(required=false) LocalDate from, @RequestParam(required=false) LocalDate to) {
        return service.list(id, Long.valueOf(actor), privileged(auth), from, to);
    }
    @PostMapping("/classes/{id}/sessions") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public List<SessionView> create(@PathVariable Long id, @Valid @RequestBody SessionInput body, @AuthenticationPrincipal String actor) {
        return service.create(id, body, Long.valueOf(actor));
    }
    @PatchMapping("/classes/{id}/sessions/{sid}") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public SessionView update(@PathVariable Long id, @PathVariable Long sid, @Valid @RequestBody SessionPatch body) {
        return service.update(id, sid, body);
    }
    @DeleteMapping("/classes/{id}/sessions/{sid}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public void delete(@PathVariable Long id, @PathVariable Long sid) { service.delete(id, sid); }
    @GetMapping("/me/schedule") @PreAuthorize("hasRole('STUDENT')")
    public List<SessionView> mySchedule(@AuthenticationPrincipal String actor,
                                        @RequestParam(required=false) LocalDate from, @RequestParam(required=false) LocalDate to) {
        return service.mySchedule(Long.valueOf(actor), from, to);
    }
    @GetMapping("/me/teaching-schedule") @PreAuthorize("hasAnyRole('LECTURER','ADMIN')")
    public List<SessionView> teachingSchedule(@AuthenticationPrincipal String actor,
                                              @RequestParam(required=false) LocalDate from, @RequestParam(required=false) LocalDate to) {
        return service.teachingSchedule(Long.valueOf(actor), from, to);
    }
    private boolean privileged(Authentication auth) { return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_LECTURER")); }
}
