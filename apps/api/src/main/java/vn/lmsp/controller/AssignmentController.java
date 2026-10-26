package vn.lmsp.controller;

import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AssignmentDtos.*;
import vn.lmsp.dto.ReviewDtos.AttemptReview;
import vn.lmsp.dto.ReviewDtos.QuizAttemptView;
import vn.lmsp.dto.ReviewDtos.ResultsTable;
import vn.lmsp.dto.RunDtos.PracticeRunInput;
import vn.lmsp.dto.RunDtos.RunAccepted;
import vn.lmsp.enums.GradingVerdict;
import vn.lmsp.enums.SubmissionStatus;
import vn.lmsp.service.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AssignmentController {
    private final AssignmentService assignments;
    private final AssignmentSubmissionService submissions;
    private final ProgrammingSubmissionService programming;
    private final QuizAttemptService quizzes;
    private final AttemptReviewService reviews;
    private final AssignmentResultService results;
    private final PracticeRunService practice;

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
    public AssignmentDetails publish(@PathVariable Long id, @RequestBody(required=false) PublishInput body,
            @AuthenticationPrincipal String actor, Authentication auth) {
        boolean confirm = body != null && Boolean.TRUE.equals(body.confirm_unverified());
        return assignments.publish(id, Long.valueOf(actor), isAdmin(auth), confirm);
    }
    @GetMapping("/assignments/{id}/quiz-attempts") @PreAuthorize("hasRole('STUDENT')")
    public List<QuizAttemptView> quizHistory(@PathVariable Long id, @AuthenticationPrincipal String actor) {
        return quizzes.quizHistory(id, Long.valueOf(actor));
    }
    @PostMapping("/assignments/{id}/quiz-attempts") @PreAuthorize("hasRole('STUDENT')")
    public QuizAttemptView submitQuiz(@PathVariable Long id, @RequestHeader("Idempotency-Key") String key,
            @Valid @RequestBody QuizSubmitInput body, @AuthenticationPrincipal String actor) {
        return quizzes.submitQuiz(id, Long.valueOf(actor), key, body);
    }
    @GetMapping("/assignments/{id}/quiz-attempts/{attemptId}") @PreAuthorize("hasAnyRole('ADMIN','LECTURER','STUDENT')")
    public AttemptReview reviewAttempt(@PathVariable Long id, @PathVariable Long attemptId,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return reviews.review(id, attemptId, Long.valueOf(actor), isStudent(auth), isAdmin(auth));
    }
    @PostMapping("/assignments/{id}/questions/{questionId}/submissions") @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> submitQuestion(@PathVariable Long id, @PathVariable Long questionId,
            @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody(required=false) QuestionSubmissionInput body,
            @AuthenticationPrincipal String actor) {
        if (body != null && body.isCode()) {
            var receipt = programming.submit(id, questionId, Long.valueOf(actor), key, body);
            return ResponseEntity.status(receipt.replayed() ? HttpStatus.OK : HttpStatus.ACCEPTED).body(receipt.accepted());
        }
        return ResponseEntity.ok(submissions.submitQuestion(id, questionId, Long.valueOf(actor), key, body));
    }
    @PostMapping("/assignments/{id}/questions/{questionId}/run") @PreAuthorize("hasRole('STUDENT')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public RunAccepted runQuestion(@PathVariable Long id, @PathVariable Long questionId,
            @Valid @RequestBody PracticeRunInput body, @AuthenticationPrincipal String actor) {
        return practice.run(id, questionId, Long.valueOf(actor), body);
    }
    @GetMapping("/me/submissions") @PreAuthorize("hasRole('STUDENT')")
    public List<SubmissionView> mySubmissions(@RequestParam Long assignment_id, @AuthenticationPrincipal String actor) {
        return submissions.mySubmissions(assignment_id, Long.valueOf(actor));
    }
    @GetMapping("/assignments/{id}/submissions") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public List<SubmissionView> lecturerSubmissions(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth,
            @RequestParam(required=false) Long question_id, @RequestParam(required=false) SubmissionStatus status,
            @RequestParam(required=false) GradingVerdict verdict, @RequestParam(required=false) String q) {
        return submissions.lecturerSubmissions(id, Long.valueOf(actor), isAdmin(auth), question_id, status, verdict, q);
    }
    @GetMapping("/assignments/{id}/results") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public ResultsTable results(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return results.results(id, Long.valueOf(actor), isAdmin(auth));
    }
    private boolean isStudent(Authentication auth) { return hasRole(auth, "ROLE_STUDENT"); }
    private boolean isAdmin(Authentication auth) { return hasRole(auth, "ROLE_ADMIN"); }
    private boolean hasRole(Authentication auth, String role) { return auth.getAuthorities().stream().anyMatch(item -> item.getAuthority().equals(role)); }
    private int checkedPage(int page) { if (page < 1) throw new IllegalArgumentException("page phải lớn hơn hoặc bằng 1"); return page; }
    private int checkedLimit(int limit) { if (limit < 1 || limit > 100) throw new IllegalArgumentException("limit phải từ 1 đến 100"); return limit; }
}
