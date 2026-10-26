package vn.lmsp.controller;

import jakarta.validation.Valid;
import org.springframework.core.io.FileSystemResource;
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
import java.nio.file.Path;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/users")
public class UserManagementController {
    private final UserManagementService service;
    public UserManagementController(UserManagementService service) { this.service=service; }
    @PatchMapping("/me") public UserView updateMe(@AuthenticationPrincipal String actor,@Valid @RequestBody UpdateMe body) {
        return service.updateMe(Long.valueOf(actor),body);
    }
    @PostMapping(value="/me/avatar",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserView uploadAvatar(@AuthenticationPrincipal String actor,@RequestParam("file") MultipartFile file) {
        return service.uploadAvatar(Long.valueOf(actor),file);
    }
    @DeleteMapping("/me/avatar") public UserView deleteAvatar(@AuthenticationPrincipal String actor) {
        return service.deleteAvatar(Long.valueOf(actor));
    }
    /** Serve ảnh đại diện (yêu cầu đăng nhập; 404 nếu chưa có). */
    @GetMapping("/{id}/avatar") public ResponseEntity<FileSystemResource> avatar(@PathVariable Long id) {
        Path path=service.avatarFile(id);
        var headers=new HttpHeaders(); headers.setContentType(contentType(path));
        return new ResponseEntity<>(new FileSystemResource(path),headers,HttpStatus.OK);
    }
    @GetMapping @PreAuthorize("hasRole('ADMIN')")
    public Page<UserView> list(@RequestParam(required=false) String role,@RequestParam(required=false) String status,
                               @RequestParam(required=false) String q,@RequestParam(required=false) String sort,
                               @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int limit) {
        return service.list(role,status,q,sort,page,checkedLimit(limit));
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
    private static MediaType contentType(Path path) {
        String name=path.getFileName().toString().toLowerCase(Locale.ROOT);
        if(name.endsWith(".png")) return MediaType.IMAGE_PNG;
        if(name.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.IMAGE_JPEG;
    }
    private int checkedLimit(int limit) { if(limit<1 || limit>100) throw new IllegalArgumentException("limit phải từ 1 đến 100"); return limit; }
}
