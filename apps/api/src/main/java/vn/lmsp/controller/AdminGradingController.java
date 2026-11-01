package vn.lmsp.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.AdminDtos.*;
import vn.lmsp.service.FailedGradingService;

/** Job chấm lỗi, chấm lại hàng loạt, dọn hàng chết — docs/admin-spec.md §4. */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminGradingController {
    private final FailedGradingService failed;

    @GetMapping("/grading/failed")
    public FailedPage failed(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int limit) {
        return failed.failed(page, limit);
    }

    @PostMapping("/grading/regrade")
    public BulkRegradeResult regrade(@Valid @RequestBody BulkRegradeInput body, @AuthenticationPrincipal String actor) {
        return failed.regrade(body, Long.valueOf(actor));
    }

    @PostMapping("/queues/{name}/purge")
    public PurgeResult purge(@PathVariable String name, @Valid @RequestBody PurgeInput body,
                             @AuthenticationPrincipal String actor) {
        return failed.purge(name, body.reason(), Long.valueOf(actor));
    }
}
