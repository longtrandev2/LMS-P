package vn.lmsp.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.lmsp.dto.UserManagementDtos.*;
import vn.lmsp.service.UserManagementService;

@RestController
@RequestMapping("/api/v1/users")
public class UserManagementController {
    private final UserManagementService service;
    public UserManagementController(UserManagementService service) { this.service=service; }
    @PatchMapping("/me") public UserView updateMe(@AuthenticationPrincipal String actor,@Valid @RequestBody UpdateMe body) {
        return service.updateMe(Long.valueOf(actor),body);
    }
    @GetMapping @PreAuthorize("hasRole('ADMIN')")
    public Page<UserView> list(@RequestParam(required=false) String role,@RequestParam(required=false) String status,
                               @RequestParam(required=false) String q,@RequestParam(defaultValue="1") int page,
                               @RequestParam(defaultValue="20") int limit) {
        return service.list(role,status,q,page,checkedLimit(limit));
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public UserWithTempPassword create(@Valid @RequestBody CreateUser body,@AuthenticationPrincipal String actor) { return service.create(body,Long.valueOf(actor)); }
    @PostMapping(value="/import",consumes="multipart/form-data") @PreAuthorize("hasRole('ADMIN')")
    public ImportResult importCsv(@RequestParam("file") MultipartFile file,@AuthenticationPrincipal String actor) throws java.io.IOException {
        return service.importCsv(new String(file.getBytes(),java.nio.charset.StandardCharsets.UTF_8),Long.valueOf(actor));
    }
    @GetMapping("/{id}") @PreAuthorize("hasRole('ADMIN')")
    public UserView get(@PathVariable Long id) { return service.get(id); }
    @PatchMapping("/{id}") @PreAuthorize("hasRole('ADMIN')")
    public UserWithTempPassword update(@PathVariable Long id,@RequestBody UpdateUser body,@AuthenticationPrincipal String actor) { return service.update(id,body,Long.valueOf(actor)); }
    @PostMapping("/{id}/revoke-sessions") @PreAuthorize("hasRole('ADMIN')")
    public java.util.Map<String,Integer> revokeSessions(@PathVariable Long id,@AuthenticationPrincipal String actor) {
        return java.util.Map.of("revoked",service.revokeSessions(id,Long.valueOf(actor)));
    }
    private int checkedLimit(int limit) { if(limit<1 || limit>100) throw new IllegalArgumentException("limit phải từ 1 đến 100"); return limit; }
}
