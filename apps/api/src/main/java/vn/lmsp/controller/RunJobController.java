package vn.lmsp.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.lmsp.dto.RunDtos.RunJobView;
import vn.lmsp.service.RunJobService;

/** Kết quả run job — chỉ người tạo job (giảng viên hoặc sinh viên) và admin. */
@RestController
@RequestMapping("/api/v1/run-jobs")
@RequiredArgsConstructor
public class RunJobController {
    private final RunJobService service;

    @GetMapping("/{id}")
    public RunJobView get(@PathVariable String id, @AuthenticationPrincipal String actor, Authentication auth) {
        boolean admin = auth.getAuthorities().stream().anyMatch(item -> item.getAuthority().equals("ROLE_ADMIN"));
        return service.view(id, Long.valueOf(actor), admin);
    }
}
