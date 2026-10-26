package vn.lmsp.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.QuestionDrawDtos.*;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.dto.RunDtos.DraftCheckInput;
import vn.lmsp.dto.RunDtos.RunAccepted;
import vn.lmsp.enums.QuestionDifficulty;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.service.QuestionCheckService;
import vn.lmsp.service.QuestionDrawService;
import vn.lmsp.service.QuestionService;
import java.util.List;

@RestController
@RequestMapping("/api/v1/questions")
@PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
@RequiredArgsConstructor
public class QuestionController {
    private final QuestionService service;
    private final QuestionDrawService draws;
    private final QuestionCheckService checks;

    @GetMapping
    public QuestionPage list(@AuthenticationPrincipal String actor, Authentication auth,
            @RequestParam(required=false) Long bank_id, @RequestParam(required=false) Long category_id,
            @RequestParam(required=false) QuestionType type, @RequestParam(required=false) String topic,
            @RequestParam(required=false) QuestionDifficulty difficulty, @RequestParam(required=false) String q,
            @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit,
            @RequestParam(defaultValue="created_at") String sort) {
        return service.list(Long.valueOf(actor), isAdmin(auth), bank_id, category_id, type, topic, difficulty, q,
                checkedPage(page), checkedLimit(limit), sort);
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('LECTURER')")
    public QuestionView create(@Valid @RequestBody QuestionInput body, @AuthenticationPrincipal String actor, Authentication auth) {
        return service.create(body, Long.valueOf(actor), isAdmin(auth));
    }
    @GetMapping("/{id}")
    public QuestionView get(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return service.get(id, Long.valueOf(actor), isAdmin(auth));
    }
    @PatchMapping("/{id}") @PreAuthorize("hasRole('LECTURER')")
    public QuestionView update(@PathVariable Long id, @Valid @RequestBody QuestionPatch body,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return service.update(id, body, Long.valueOf(actor), isAdmin(auth));
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        service.delete(id, Long.valueOf(actor), isAdmin(auth));
    }
    @PutMapping("/{id}/test-cases") @PreAuthorize("hasRole('LECTURER')")
    public QuestionView replaceTestCases(@PathVariable Long id, @Valid @RequestBody List<@Valid TestCaseInput> body,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return service.replaceCases(id, body, Long.valueOf(actor), isAdmin(auth));
    }
    @PostMapping("/draw") @PreAuthorize("hasRole('LECTURER')")
    public DrawResult draw(@Valid @RequestBody DrawRequest body, @AuthenticationPrincipal String actor, Authentication auth) {
        return draws.draw(body, Long.valueOf(actor), isAdmin(auth));
    }
    @PostMapping("/{id}/verify") @ResponseStatus(HttpStatus.ACCEPTED) @PreAuthorize("hasRole('LECTURER')")
    public RunAccepted verify(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return checks.verify(id, Long.valueOf(actor), isAdmin(auth));
    }
    @PostMapping("/draft-check") @ResponseStatus(HttpStatus.ACCEPTED) @PreAuthorize("hasRole('LECTURER')")
    public RunAccepted draftCheck(@Valid @RequestBody DraftCheckInput body, @AuthenticationPrincipal String actor, Authentication auth) {
        return checks.draftCheck(body, Long.valueOf(actor), isAdmin(auth));
    }
    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(item -> item.getAuthority().equals("ROLE_ADMIN"));
    }
    private int checkedPage(int page) { if (page < 1) throw new IllegalArgumentException("page phải lớn hơn hoặc bằng 1"); return page; }
    private int checkedLimit(int limit) { if (limit < 1 || limit > 100) throw new IllegalArgumentException("limit phải từ 1 đến 100"); return limit; }
}
