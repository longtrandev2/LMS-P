package vn.lmsp.controller;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.QuestionDtos.*;
import vn.lmsp.service.QuestionBankService;
import vn.lmsp.service.QuestionCsvService;

@RestController
@RequestMapping("/api/v1")
@PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
@RequiredArgsConstructor
public class QuestionBankController {
    private final QuestionBankService service;
    private final QuestionCsvService csv;

    @GetMapping("/question-banks")
    public List<QuestionBankView> banks(@AuthenticationPrincipal String actor, Authentication auth,
                                        @RequestParam(required=false) Long course_id) {
        return service.list(Long.valueOf(actor), isAdmin(auth), course_id);
    }
    @PostMapping("/question-banks") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('LECTURER')")
    public QuestionBankView createBank(@Valid @RequestBody QuestionBankInput body,
                                       @AuthenticationPrincipal String actor, Authentication auth) {
        return service.create(body, Long.valueOf(actor), isAdmin(auth));
    }
    @PatchMapping("/question-banks/{id}/visibility")
    public QuestionBankView visibility(@PathVariable Long id, @RequestBody QuestionBankVisibilityInput body,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return service.setVisibility(id, body.visibility(), Long.valueOf(actor), isAdmin(auth));
    }

    @GetMapping("/question-banks/{id}/permissions")
    public List<BankPermissionView> permissions(@PathVariable Long id,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return service.permissions(id, Long.valueOf(actor), isAdmin(auth));
    }
    @GetMapping("/question-banks/{id}/eligible-lecturers")
    public List<BankLecturerView> eligibleLecturers(@PathVariable Long id,
            @AuthenticationPrincipal String actor, Authentication auth) {
        return service.eligibleLecturers(id, Long.valueOf(actor), isAdmin(auth));
    }

    @PutMapping("/question-banks/{id}/permissions/{lecturerId}")
    public BankPermissionView grant(@PathVariable Long id, @PathVariable Long lecturerId,
            @Valid @RequestBody BankPermissionInput body, @AuthenticationPrincipal String actor, Authentication auth) {
        return service.grant(id, lecturerId, body.permission(), Long.valueOf(actor), isAdmin(auth));
    }

    @DeleteMapping("/question-banks/{id}/permissions/{lecturerId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable Long id, @PathVariable Long lecturerId,
            @AuthenticationPrincipal String actor, Authentication auth) {
        service.revoke(id, lecturerId, Long.valueOf(actor), isAdmin(auth));
    }
    @GetMapping("/question-banks/{id}/categories")
    public List<CategoryView> categories(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return service.categories(id, Long.valueOf(actor), isAdmin(auth));
    }
    @PostMapping("/question-banks/{id}/categories") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('LECTURER')")
    public CategoryView createCategory(@PathVariable Long id, @Valid @RequestBody CategoryInput body,
                                       @AuthenticationPrincipal String actor, Authentication auth) {
        return service.createCategory(id, body, Long.valueOf(actor), isAdmin(auth));
    }
    @PatchMapping("/question-categories/{id}")
    public CategoryView renameCategory(@PathVariable Long id, @Valid @RequestBody CategoryInput body,
                                       @AuthenticationPrincipal String actor, Authentication auth) {
        return service.renameCategory(id, body, Long.valueOf(actor), isAdmin(auth));
    }
    @DeleteMapping("/question-categories/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        service.deleteCategory(id, Long.valueOf(actor), isAdmin(auth));
    }
    @PostMapping("/question-banks/{bankId}/categories/{categoryId}/questions/import/preview") @PreAuthorize("hasRole('LECTURER')")
    public QuestionCsvPreview previewCsv(@PathVariable Long bankId, @PathVariable Long categoryId,
            @Valid @RequestBody QuestionCsvRequest body, @AuthenticationPrincipal String actor, Authentication auth) {
        return csv.preview(bankId, categoryId, body, Long.valueOf(actor), isAdmin(auth));
    }
    @PostMapping("/question-banks/{bankId}/categories/{categoryId}/questions/import") @PreAuthorize("hasRole('LECTURER')")
    public QuestionImportResult importCsv(@PathVariable Long bankId, @PathVariable Long categoryId,
            @Valid @RequestBody QuestionCsvRequest body, @AuthenticationPrincipal String actor, Authentication auth) {
        return csv.importRows(bankId, categoryId, body, Long.valueOf(actor), isAdmin(auth));
    }
    private boolean isAdmin(Authentication auth) { return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")); }
}
