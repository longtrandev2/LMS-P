package vn.lmsp.controller;

import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.lmsp.dto.ScheduleDtos.LeaveRequestView;
import vn.lmsp.dto.ScheduleDtos.LeaveReview;
import vn.lmsp.dto.ScheduleDtos.Page;
import vn.lmsp.enums.LeaveRequestStatus;
import vn.lmsp.service.LeaveRequestService;
import vn.lmsp.service.LeaveReviewService;

/** Đơn xin nghỉ — api-spec §11. Quyền chủ đơn/giảng viên phụ trách kiểm tra ở service. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class LeaveRequestController {
    private final LeaveRequestService leaveRequests;
    private final LeaveReviewService reviews;

    @PostMapping(value = "/sessions/{sessionId}/leave-requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('STUDENT')")
    public LeaveRequestView create(@PathVariable Long sessionId, @RequestParam(required = false) String reason,
                                   @RequestParam(required = false) MultipartFile evidence, @AuthenticationPrincipal String actor) {
        return leaveRequests.create(sessionId, Long.valueOf(actor), reason, evidence);
    }

    @GetMapping("/classes/{classId}/leave-requests")
    public Page<LeaveRequestView> list(@PathVariable Long classId, @RequestParam(required = false) LeaveRequestStatus status,
                                       @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "50") int limit,
                                       @AuthenticationPrincipal String actor, Authentication auth) {
        if (page < 1) throw new IllegalArgumentException("page phải lớn hơn hoặc bằng 1");
        if (limit < 1 || limit > 100) throw new IllegalArgumentException("limit phải từ 1 đến 100");
        return leaveRequests.list(classId, Long.valueOf(actor), SessionController.isAdmin(auth), status, page, limit);
    }

    @PatchMapping("/leave-requests/{id}")
    public LeaveRequestView change(@PathVariable Long id, @Valid @RequestBody LeaveReview body,
                                   @AuthenticationPrincipal String actor, Authentication auth) {
        return reviews.change(id, body, Long.valueOf(actor), SessionController.isAdmin(auth));
    }

    @GetMapping("/leave-requests/{id}/evidence")
    public ResponseEntity<FileSystemResource> evidence(@PathVariable Long id, @AuthenticationPrincipal String actor, Authentication auth) {
        var file = leaveRequests.evidence(id, Long.valueOf(actor), SessionController.isAdmin(auth));
        var headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment().filename(file.name(), StandardCharsets.UTF_8).build());
        headers.setContentType(MediaType.parseMediaType(file.contentType()));
        headers.set("X-Content-Type-Options", "nosniff");
        return new ResponseEntity<>(new FileSystemResource(file.path()), headers, HttpStatus.OK);
    }
}
