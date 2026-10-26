package vn.lmsp.controller;

import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AcademicsDtos.*;
import vn.lmsp.service.AcademicsService;
import vn.lmsp.service.EnrollmentService;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AcademicsController {
    private final AcademicsService service;
    private final EnrollmentService enrollmentService;

    @GetMapping("/courses") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public Page<CourseView> courses(@RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit,
                                    @RequestParam(required=false) String q, @RequestParam(defaultValue="code") String sort,
                                    @AuthenticationPrincipal String actor, Authentication auth) {
        return service.courses(checkedPage(page), checkedLimit(limit), q, sort, Long.valueOf(actor), hasRole(auth, "ROLE_ADMIN"));
    }
    @PostMapping("/courses") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public CourseView createCourse(@Valid @RequestBody CourseInput body, @AuthenticationPrincipal String actor) { return service.createCourse(body, Long.valueOf(actor)); }
    @GetMapping("/courses/{id}") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public CourseView course(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) { return service.course(id, Long.valueOf(actor), hasRole(auth, "ROLE_ADMIN")); }
    @PatchMapping("/courses/{id}") @PreAuthorize("hasRole('ADMIN')")
    public CourseView updateCourse(@PathVariable Long id, @Valid @RequestBody CourseInput body, @AuthenticationPrincipal String actor) { return service.updateCourse(id, body, Long.valueOf(actor)); }
    @DeleteMapping("/courses/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasRole('ADMIN')")
    public void deleteCourse(@PathVariable Long id, @AuthenticationPrincipal String actor) { service.deleteCourse(id, Long.valueOf(actor)); }

    @GetMapping("/classes")
    @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public Page<ClassView> classes(@RequestParam(required=false) Long course_id, @RequestParam(required=false) String semester,
                                   @RequestParam(required=false) String q, @RequestParam(defaultValue="code") String sort,
                                   @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit,
                                   @AuthenticationPrincipal String actor, Authentication auth) {
        return service.classes(course_id, semester, q, sort, checkedPage(page), checkedLimit(limit), Long.valueOf(actor), hasRole(auth, "ROLE_ADMIN"));
    }
    @GetMapping("/admin/classes") @PreAuthorize("hasRole('ADMIN')")
    public Page<ClassView> adminClasses(@RequestParam(required=false) Long course_id, @RequestParam(required=false) String semester,
                                        @RequestParam(required=false) String q, @RequestParam(defaultValue="code") String sort,
                                        @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit) {
        return service.classes(course_id, semester, q, sort, checkedPage(page), checkedLimit(limit), null, true);
    }
    @PostMapping("/classes") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public ClassView createClass(@Valid @RequestBody ClassInput body, @AuthenticationPrincipal String actor) { return service.createClass(body, Long.valueOf(actor)); }
    @GetMapping("/classes/{id}")
    public ClassView getClass(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return service.getClass(id, Long.valueOf(actor), hasRole(auth, "ROLE_ADMIN"), hasRole(auth, "ROLE_LECTURER"));
    }
    @PatchMapping("/classes/{id}") @PreAuthorize("hasRole('ADMIN')")
    public ClassView updateClass(@PathVariable Long id, @Valid @RequestBody ClassPatch body, @AuthenticationPrincipal String actor) { return service.updateClass(id, body, Long.valueOf(actor)); }
    @PatchMapping("/admin/classes/{id}") @PreAuthorize("hasRole('ADMIN')")
    public ClassView adminUpdateClass(@PathVariable Long id, @Valid @RequestBody ClassPatch body, @AuthenticationPrincipal String actor) { return service.adminUpdateClass(id, body, Long.valueOf(actor)); }
    @DeleteMapping("/classes/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasRole('ADMIN')")
    public void deleteClass(@PathVariable Long id, @AuthenticationPrincipal String actor) { service.deleteClass(id, Long.valueOf(actor)); }

    @PostMapping("/classes/{id}/enrollments") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public EnrollResult enroll(@PathVariable Long id, @Valid @RequestBody EnrollIdsRequest body, @AuthenticationPrincipal String actor, Authentication auth) {
        List<EnrollTarget> selected = body.student_ids().stream().map(EnrollTarget::new).toList();
        return enrollmentService.enroll(id, selected, Long.valueOf(actor), hasRole(auth, "ROLE_ADMIN"));
    }
    @GetMapping("/classes/{id}/student-candidates") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public Page<StudentCandidateView> candidates(@PathVariable Long id, @RequestParam(required=false) String q,
            @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return enrollmentService.candidates(id, checkedPage(page), checkedLimit(limit), q,
                Long.valueOf(actor), hasRole(auth, "ROLE_ADMIN"));
    }
    @PostMapping("/classes/{id}/enrollments/import/preview") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public EnrollPreview previewCsv(@PathVariable Long id, @Valid @RequestBody CsvEnrollRequest body,
                                    @AuthenticationPrincipal String actor, Authentication auth) {
        return enrollmentService.previewCsv(id, body.students(), Long.valueOf(actor), hasRole(auth, "ROLE_ADMIN"));
    }
    @PostMapping("/classes/{id}/enrollments/import") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public EnrollResult importCsv(@PathVariable Long id, @Valid @RequestBody CsvEnrollRequest body,
                                  @AuthenticationPrincipal String actor, Authentication auth) {
        return enrollmentService.importCsv(id, body.students(), Long.valueOf(actor), hasRole(auth, "ROLE_ADMIN"));
    }
    @DeleteMapping("/classes/{id}/enrollments/{studentId}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public void drop(@PathVariable Long id, @PathVariable Long studentId, @AuthenticationPrincipal String actor, Authentication auth) {
        enrollmentService.drop(id, studentId, Long.valueOf(actor), hasRole(auth, "ROLE_ADMIN"));
    }
    @GetMapping("/classes/{id}/students") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public Page<StudentView> students(@PathVariable Long id, @RequestParam(defaultValue="1") int page,
                                     @RequestParam(defaultValue="20") int limit, @RequestParam(required=false) String q,
                                     @RequestParam(defaultValue="full_name") String sort,
                                     @AuthenticationPrincipal String actor, Authentication auth) {
        return enrollmentService.students(id, checkedPage(page), checkedLimit(limit), q, sort,
                Long.valueOf(actor), hasRole(auth, "ROLE_ADMIN"));
    }
    @GetMapping("/me/classes") @PreAuthorize("hasRole('STUDENT')")
    public Page<MyClassView> myClasses(@AuthenticationPrincipal String actor, @RequestParam(defaultValue="1") int page,
                                       @RequestParam(defaultValue="20") int limit, @RequestParam(required=false) String q,
                                       @RequestParam(defaultValue="code") String sort) {
        return enrollmentService.myClasses(Long.valueOf(actor), checkedPage(page), checkedLimit(limit), q, sort);
    }

    private boolean hasRole(Authentication auth, String role) { return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(role)); }
    private int checkedPage(int page) { if (page < 1) throw new IllegalArgumentException("page phải lớn hơn hoặc bằng 1"); return page; }
    private int checkedLimit(int limit) { if (limit < 1 || limit > 100) throw new IllegalArgumentException("limit phải từ 1 đến 100"); return limit; }
}
