package vn.lmsp.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AcademicsDtos.*;
import vn.lmsp.service.EnrollmentService;

/** Ghi danh 1 chiều (FR-CRS-02/BR11): chỉ lecturer/admin thao tác; SV chỉ đọc /me/classes. */
@RestController
@RequestMapping("/api/v1")
public class ClassEnrollmentController {
    private final EnrollmentService service;
    public ClassEnrollmentController(EnrollmentService service) { this.service = service; }
    @PostMapping("/classes/{id}/enrollments") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public EnrollOutcome enroll(@PathVariable Long id, @RequestBody JsonNode body, @AuthenticationPrincipal String actor) {
        return service.enroll(id, body, Long.valueOf(actor));
    }
    @DeleteMapping("/classes/{id}/enrollments/{studentId}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public void drop(@PathVariable Long id, @PathVariable Long studentId,@AuthenticationPrincipal String actor) { service.drop(id, studentId,Long.valueOf(actor)); }
    @GetMapping("/classes/{id}/students") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public Page<StudentView> students(@PathVariable Long id, @RequestParam(required=false) String q,
                                      @RequestParam(required=false) String sort,
                                      @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit) {
        return service.students(id, q, sort, page, checkedLimit(limit));
    }
    @GetMapping("/me/classes") @PreAuthorize("hasRole('STUDENT')")
    public Page<MyClassView> myClasses(@AuthenticationPrincipal String actor, @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit) {
        return service.myClasses(Long.valueOf(actor), page, checkedLimit(limit));
    }
    private int checkedLimit(int limit) { if (limit < 1 || limit > 100) throw new IllegalArgumentException("limit phải từ 1 đến 100"); return limit; }
}
