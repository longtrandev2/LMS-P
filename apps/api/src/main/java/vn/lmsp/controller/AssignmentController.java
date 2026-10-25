package vn.lmsp.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import vn.lmsp.service.ProgrammingSubmissionService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.service.AssignmentService;
import vn.lmsp.service.AssignmentSubmissionService;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class AssignmentController {
    private final AssignmentService assignments;
    private final AssignmentSubmissionService submissions;
    private final ProgrammingSubmissionService programming;
    public AssignmentController(AssignmentService assignments, AssignmentSubmissionService submissions, ProgrammingSubmissionService programming) {
        this.assignments = assignments; this.submissions = submissions; this.programming = programming;
    }
    @GetMapping("/classes/{classId}/assignments")
    @PreAuthorize("hasAnyRole('ADMIN','LECTURER','STUDENT')")
    public AssignmentPage list(@PathVariable Long classId, @AuthenticationPrincipal String actor, Authentication auth,
            @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit) {
        return assignments.list(classId, Long.valueOf(actor), isStudent(auth), isAdmin(auth), checkedPage(page), checkedLimit(limit));
    }
    @PostMapping("/classes/{classId}/assignments") @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('LECTURER')")
    public AssignmentDetails create(@PathVariable Long classId, @Valid @RequestBody AssignmentInput body,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return assignments.create(classId, body, Long.valueOf(actor), isAdmin(auth));
    }
    @PostMapping("/assignments/bulk") @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('LECTURER')")
    public List<AssignmentDetails> createForClasses(@Valid @RequestBody BulkAssignmentInput body,
            @AuthenticationPrincipal String actor) {
        return assignments.createForClasses(body, Long.valueOf(actor));
    }
    @GetMapping("/assignments/{id}") @PreAuthorize("hasAnyRole('ADMIN','LECTURER','STUDENT')")
    public AssignmentDetails get(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return assignments.get(id, Long.valueOf(actor), isStudent(auth), isAdmin(auth));
    }
    @PatchMapping("/assignments/{id}") @PreAuthorize("hasRole('LECTURER')")
    public AssignmentDetails update(@PathVariable Long id, @Valid @RequestBody AssignmentInput body,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return assignments.update(id, body, Long.valueOf(actor), isAdmin(auth));
    }
    @PatchMapping("/assignments/{id}/published-settings") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public AssignmentDetails updatePublishedSettings(@PathVariable Long id, @Valid @RequestBody PublishedSettingsInput body,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return assignments.updatePublishedSettings(id, body, Long.valueOf(actor), isAdmin(auth));
    }
    @DeleteMapping("/assignments/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('LECTURER')")
    public void delete(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        assignments.delete(id, Long.valueOf(actor), isAdmin(auth));
    }
    @PostMapping("/assignments/{id}/publish") @PreAuthorize("hasRole('LECTURER')")
    public AssignmentDetails publish(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return assignments.publish(id, Long.valueOf(actor), isAdmin(auth));
    }
    @GetMapping("/assignments/{id}/quiz-attempts") @PreAuthorize("hasRole('STUDENT')")
    public List<QuizAttemptView> quizHistory(@PathVariable Long id, @AuthenticationPrincipal String actor) {
        return submissions.quizHistory(id, Long.valueOf(actor));
    }
    @PostMapping("/assignments/{id}/quiz-attempts") @PreAuthorize("hasRole('STUDENT')")
    public QuizAttemptView submitQuiz(@PathVariable Long id, @RequestHeader("Idempotency-Key") String key,
            @RequestBody QuizSubmitInput body, @AuthenticationPrincipal String actor) {
        return submissions.submitQuiz(id, Long.valueOf(actor), key, body);
    }
    @PostMapping("/assignments/{id}/questions/{questionId}/submissions") @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> submitQuestion(@PathVariable Long id, @PathVariable Long questionId,
            @RequestHeader("Idempotency-Key") String key, @RequestBody(required=false) QuestionSubmissionInput body,
            @AuthenticationPrincipal String actor) {
        if (body != null && (body.language() != null || body.source_code() != null)) {
            var receipt = programming.submit(id, questionId, Long.valueOf(actor), key, body);
            return ResponseEntity.status(receipt.replayed() ? HttpStatus.OK : HttpStatus.ACCEPTED).body(receipt.accepted());
        }
        return ResponseEntity.ok(submissions.submitQuestion(id, questionId, Long.valueOf(actor), key, body));
    }
    @PostMapping("/assignments/{id}/questions/{questionId}/run") @PreAuthorize("hasRole('STUDENT')")
    public void runQuestion(@PathVariable Long id, @PathVariable Long questionId, @AuthenticationPrincipal String actor) {
        submissions.runQuestion(id, questionId, Long.valueOf(actor));
    }
    @GetMapping("/me/submissions") @PreAuthorize("hasRole('STUDENT')")
    public List<SubmissionView> mySubmissions(@RequestParam Long assignment_id, @AuthenticationPrincipal String actor) {
        return submissions.mySubmissions(assignment_id, Long.valueOf(actor));
    }
    @GetMapping("/assignments/{id}/submissions") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public List<SubmissionView> lecturerSubmissions(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return submissions.lecturerSubmissions(id, Long.valueOf(actor), isAdmin(auth));
    }
    private boolean isStudent(Authentication auth) { return hasRole(auth, "ROLE_STUDENT"); }
    private boolean isAdmin(Authentication auth) { return hasRole(auth, "ROLE_ADMIN"); }
    private boolean hasRole(Authentication auth, String role) { return auth.getAuthorities().stream().anyMatch(item -> item.getAuthority().equals(role)); }
    private int checkedPage(int page) { if (page < 1) throw new IllegalArgumentException("page phải lớn hơn hoặc bằng 1"); return page; }
    private int checkedLimit(int limit) { if (limit < 1 || limit > 100) throw new IllegalArgumentException("limit phải từ 1 đến 100"); return limit; }
}
