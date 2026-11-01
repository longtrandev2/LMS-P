package vn.lmsp.controller;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AttemptSessionDtos.*;
import vn.lmsp.dto.RunDtos.PracticeRunInput;
import vn.lmsp.dto.RunDtos.RunAccepted;
import vn.lmsp.service.*;

/** Phiên làm bài phía sinh viên — docs/api-spec.md §7, docs/exam-spec.md §5. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AttemptSessionController {
    private final AttemptSessionStartService starts;
    private final AttemptSessionReadService reads;
    private final SessionAnswerService answers;
    private final SessionEventService events;
    private final SessionFinishService finishes;
    private final SessionPracticeRunService runs;

    /** 201 phiên mới, 200 tiếp tục phiên đang làm. */
    @PostMapping("/assignments/{id}/sessions") @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<AttemptSessionView> start(@PathVariable Long id,
            @Valid @RequestBody(required = false) StartSessionInput body, @AuthenticationPrincipal String actor) {
        var started = starts.start(id, Long.valueOf(actor), body);
        return ResponseEntity.status(started.created() ? HttpStatus.CREATED : HttpStatus.OK).body(started.view());
    }

    @GetMapping("/me/attempt-sessions") @PreAuthorize("hasRole('STUDENT')")
    public List<AttemptSessionSummary> mine(@RequestParam(name = "assignment_id", required = false) Long assignmentId,
            @AuthenticationPrincipal String actor) {
        return reads.mine(Long.valueOf(actor), assignmentId);
    }

    @GetMapping("/attempt-sessions/{id}") @PreAuthorize("hasRole('STUDENT')")
    public AttemptSessionView get(@PathVariable Long id, @AuthenticationPrincipal String actor) {
        return reads.get(id, Long.valueOf(actor));
    }

    @PutMapping("/attempt-sessions/{id}/answers") @PreAuthorize("hasRole('STUDENT')")
    public SessionClock save(@PathVariable Long id, @Valid @RequestBody SaveAnswersInput body,
            @AuthenticationPrincipal String actor) {
        return answers.save(id, Long.valueOf(actor), body);
    }

    @PostMapping("/attempt-sessions/{id}/events") @PreAuthorize("hasRole('STUDENT')")
    public SessionClock event(@PathVariable Long id, @Valid @RequestBody SessionEventInput body,
            @AuthenticationPrincipal String actor) {
        return events.client(id, Long.valueOf(actor), body);
    }

    @PostMapping("/attempt-sessions/{id}/finish") @PreAuthorize("hasRole('STUDENT')")
    public AttemptSessionSummary finish(@PathVariable Long id, @Valid @RequestBody(required = false) FinishInput body,
            @AuthenticationPrincipal String actor) {
        return finishes.finish(id, Long.valueOf(actor), body);
    }

    @PostMapping("/attempt-sessions/{id}/questions/{questionId}/run") @PreAuthorize("hasRole('STUDENT')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public RunAccepted run(@PathVariable Long id, @PathVariable Long questionId,
            @Valid @RequestBody PracticeRunInput body, @AuthenticationPrincipal String actor) {
        return runs.run(id, questionId, Long.valueOf(actor), body);
    }
}
