package vn.lmsp.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.GradebookDtos.*;
import vn.lmsp.service.*;

/** Sổ điểm M8 — docs/api-spec.md §8. RBAC theo lớp kiểm tra ở service. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class GradebookController {
    private final GradePolicyService policies;
    private final GradebookService gradebook;
    private final GradeOverrideService overrides;
    private final GradeImportService imports;
    private final GradeExportService exports;

    @GetMapping("/classes/{id}/grade-policy") @PreAuthorize("hasAnyRole('ADMIN','LECTURER','STUDENT')")
    public GradePolicy policy(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        boolean admin = isAdmin(auth);
        return policies.get(id, Long.valueOf(actor), admin, !admin && !isLecturer(auth) && isStudent(auth));
    }

    @PutMapping("/classes/{id}/grade-policy") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public GradePolicy updatePolicy(@PathVariable Long id, @Valid @RequestBody GradePolicyInput body,
                                    @AuthenticationPrincipal String actor, Authentication auth) {
        return policies.update(id, body, Long.valueOf(actor), isAdmin(auth));
    }

    @GetMapping("/classes/{id}/gradebook") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public Gradebook gradebook(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        return gradebook.gradebook(id, Long.valueOf(actor), isAdmin(auth));
    }

    @PutMapping("/classes/{id}/grades/{studentId}/{component}") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public GradeRow override(@PathVariable Long id, @PathVariable Long studentId, @PathVariable String component,
                             @Valid @RequestBody OverrideInput body, @AuthenticationPrincipal String actor, Authentication auth) {
        return overrides.override(id, studentId, component, body, Long.valueOf(actor), isAdmin(auth));
    }

    @PostMapping("/classes/{id}/grades/import/preview") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public ImportPreview previewImport(@PathVariable Long id, @Valid @RequestBody ImportInput body,
                                       @AuthenticationPrincipal String actor, Authentication auth) {
        return imports.preview(id, body, Long.valueOf(actor), isAdmin(auth));
    }

    @PostMapping("/classes/{id}/grades/import") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public ImportResult confirmImport(@PathVariable Long id, @Valid @RequestBody ImportInput body,
                                      @AuthenticationPrincipal String actor, Authentication auth) {
        return imports.confirm(id, body, Long.valueOf(actor), isAdmin(auth));
    }

    @GetMapping("/classes/{id}/gradebook/export") @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public ResponseEntity<byte[]> export(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        GradeExportService.Export file = exports.export(id, Long.valueOf(actor), isAdmin(auth));
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.filename()).build().toString())
                .body(file.content());
    }

    @GetMapping("/me/classes/{id}/grades") @PreAuthorize("hasRole('STUDENT')")
    public MyGrades mine(@PathVariable Long id, @AuthenticationPrincipal String actor) {
        return gradebook.mine(id, Long.valueOf(actor));
    }

    private static boolean isAdmin(Authentication auth) { return hasRole(auth, "ROLE_ADMIN"); }
    private static boolean isLecturer(Authentication auth) { return hasRole(auth, "ROLE_LECTURER"); }
    private static boolean isStudent(Authentication auth) { return hasRole(auth, "ROLE_STUDENT"); }
    private static boolean hasRole(Authentication auth, String role) {
        return auth.getAuthorities().stream().anyMatch(a -> role.equals(a.getAuthority()));
    }
}
