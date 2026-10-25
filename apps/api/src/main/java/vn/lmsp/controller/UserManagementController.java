package vn.lmsp.controller;

import jakarta.validation.Valid;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.lmsp.dto.UserManagementDtos.*;
import vn.lmsp.service.UserManagementService;
import vn.lmsp.service.UserAvatarService;

@RestController
@RequestMapping("/api/v1/users")
public class UserManagementController {
    private final UserManagementService service;
    private final UserAvatarService avatars;
    public UserManagementController(UserManagementService service,UserAvatarService avatars) { this.service=service; this.avatars=avatars; }
    @PatchMapping("/me") public UserView updateMe(@AuthenticationPrincipal String actor,@Valid @RequestBody UpdateMe body) {
        return service.updateMe(Long.valueOf(actor),body);
    }
    @PostMapping(value="/me/avatar",consumes="multipart/form-data")
    public vn.lmsp.dto.UserSummary uploadMyAvatar(@AuthenticationPrincipal String actor,@RequestParam("file") MultipartFile file) { return avatars.upload(Long.valueOf(actor),file); }
    @DeleteMapping("/me/avatar")
    public vn.lmsp.dto.UserSummary deleteMyAvatar(@AuthenticationPrincipal String actor) { return avatars.delete(Long.valueOf(actor)); }
    @GetMapping("/{id}/avatar")
    public ResponseEntity<FileSystemResource> avatar(@PathVariable Long id) {
        var file=avatars.get(id); HttpHeaders headers=new HttpHeaders(); headers.setContentType(MediaType.parseMediaType(file.contentType()));
        headers.setCacheControl("private, max-age=300"); return ResponseEntity.ok().headers(headers).body(new FileSystemResource(file.path()));
    }
    @GetMapping @PreAuthorize("hasRole('ADMIN')")
    public Page<UserView> list(@RequestParam(required=false) String role,@RequestParam(required=false) String status,
                               @RequestParam(required=false) String q,@RequestParam(required=false) String sort,@RequestParam(defaultValue="1") int page,
                               @RequestParam(defaultValue="20") int limit) {
        return service.list(role,status,q,sort,page,checkedLimit(limit));
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('ADMIN')")
    public UserWithTempPassword create(@Valid @RequestBody CreateUser body,@AuthenticationPrincipal String actor) { return service.create(body,Long.valueOf(actor)); }
    @PostMapping(value="/import",consumes="multipart/form-data") @PreAuthorize("hasRole('ADMIN')")
    public ImportResult importCsv(@RequestParam("file") MultipartFile file,@AuthenticationPrincipal String actor) throws java.io.IOException {
        return service.importCsv(new String(file.getBytes(),java.nio.charset.StandardCharsets.UTF_8),Long.valueOf(actor));
    }
    @PostMapping(value="/import/preview",consumes="multipart/form-data") @PreAuthorize("hasRole('ADMIN')")
    public ImportPreview previewImport(@RequestParam("file") MultipartFile file) throws java.io.IOException { return service.previewCsv(new String(file.getBytes(),java.nio.charset.StandardCharsets.UTF_8)); }
    @GetMapping("/export") @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> export(@RequestParam(required=false) String role,@RequestParam(required=false) String status,
                                         @RequestParam(required=false) String q,@RequestParam(required=false) String sort) {
        byte[] csv=service.exportCsv(role,status,q,sort).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename("users.csv").build().toString()).body(csv);
    }
    @GetMapping("/{id}") @PreAuthorize("hasRole('ADMIN')")
    public UserDetail get(@PathVariable Long id) { return service.get(id); }
    @PatchMapping("/{id}") @PreAuthorize("hasRole('ADMIN')")
    public UserWithTempPassword update(@PathVariable Long id,@Valid @RequestBody UpdateUser body,@AuthenticationPrincipal String actor) { return service.update(id,body,Long.valueOf(actor)); }
    @PostMapping("/{id}/revoke-sessions") @PreAuthorize("hasRole('ADMIN')")
    public java.util.Map<String,Integer> revokeSessions(@PathVariable Long id,@AuthenticationPrincipal String actor) {
        return java.util.Map.of("revoked",service.revokeSessions(id,Long.valueOf(actor)));
    }
    private int checkedLimit(int limit) { if(limit<1 || limit>100) throw new IllegalArgumentException("limit phải từ 1 đến 100"); return limit; }
}
