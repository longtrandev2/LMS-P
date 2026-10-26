package vn.lmsp.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AcademicsDtos.*;
import vn.lmsp.service.AcademicsService;

@RestController
@RequestMapping("/api/v1")
public class AcademicsController {
    private final AcademicsService service;
    public AcademicsController(AcademicsService service) { this.service = service; }
    @GetMapping("/courses") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public Page<CourseView> courses(@RequestParam(required=false) String q, @RequestParam(required=false) String sort,
                                    @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit) {
        return service.courses(q, sort, page, checkedLimit(limit));
    }
    @PostMapping("/courses") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public CourseView createCourse(@Valid @RequestBody CourseInput body, @AuthenticationPrincipal String actor) { return service.createCourse(body, Long.valueOf(actor)); }
    @GetMapping("/courses/{id}") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public CourseView course(@PathVariable Long id) { return service.course(id); }
    @PatchMapping("/courses/{id}") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public CourseView updateCourse(@PathVariable Long id, @RequestBody CourseInput body,@AuthenticationPrincipal String actor) { return service.updateCourse(id, body,Long.valueOf(actor)); }
    @DeleteMapping("/courses/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public void deleteCourse(@PathVariable Long id,@AuthenticationPrincipal String actor) { service.deleteCourse(id,Long.valueOf(actor)); }
    @GetMapping("/classes") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public Page<ClassView> classes(@RequestParam(required=false) Long course_id, @RequestParam(required=false) String semester,
                                   @RequestParam(required=false) String q, @RequestParam(required=false) String sort,
                                   @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit) {
        return service.classes(course_id, semester, q, sort, page, checkedLimit(limit));
    }
    @PostMapping("/classes") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public ClassView createClass(@Valid @RequestBody ClassInput body,@AuthenticationPrincipal String actor) { return service.createClass(body,Long.valueOf(actor)); }
    @GetMapping("/classes/{id}")
    public ClassView getClass(@PathVariable Long id, @AuthenticationPrincipal String actor, org.springframework.security.core.Authentication auth) {
        boolean privileged = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_LECTURER"));
        return service.getClass(id, Long.valueOf(actor), privileged);
    }
    @PatchMapping("/classes/{id}") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public ClassView updateClass(@PathVariable Long id, @RequestBody ClassPatch body,@AuthenticationPrincipal String actor) { return service.updateClass(id, body,Long.valueOf(actor)); }
    @DeleteMapping("/classes/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public void deleteClass(@PathVariable Long id,@AuthenticationPrincipal String actor) { service.deleteClass(id,Long.valueOf(actor)); }
    private int checkedLimit(int limit) { if (limit < 1 || limit > 100) throw new IllegalArgumentException("limit phải từ 1 đến 100"); return limit; }
}
