package vn.lmsp.controller;

import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.lmsp.dto.MaterialDtos.*;
import vn.lmsp.model.Material;
import vn.lmsp.service.MaterialService;
import java.nio.file.Path;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1")
public class MaterialController {
    private final MaterialService service;
    public MaterialController(MaterialService service) { this.service=service; }
    @GetMapping("/classes/{classId}/materials")
    public Page list(@PathVariable Long classId, @AuthenticationPrincipal String actor, Authentication auth,
                     @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int limit) {
        return service.list(classId,Long.valueOf(actor),privileged(auth),page,checkedLimit(limit));
    }
    @PostMapping(value="/classes/{classId}/materials",consumes=MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Item createLink(@PathVariable Long classId,@AuthenticationPrincipal String actor,@RequestBody LinkInput input) {
        return service.createLink(classId,Long.valueOf(actor),input.title(),input.description(),input.url());
    }
    @PostMapping(value="/classes/{classId}/materials",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Item upload(@PathVariable Long classId,@AuthenticationPrincipal String actor,
                       @RequestParam String title,@RequestParam(required=false) String description,@RequestParam MultipartFile file) {
        return service.upload(classId,Long.valueOf(actor),title,description,file);
    }
    @GetMapping("/materials/{id}/download")
    public ResponseEntity<FileSystemResource> download(@PathVariable Long id,@AuthenticationPrincipal String actor,Authentication auth) {
        Material material=service.download(id,Long.valueOf(actor),privileged(auth));
        Path path=service.resolveDownloadPath(material);
        var headers=new HttpHeaders(); headers.setContentDisposition(ContentDisposition.attachment().filename(material.getTitle()+extension(material.getFilePath())).build());
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM); return new ResponseEntity<>(new FileSystemResource(path),headers,HttpStatus.OK);
    }
    @PatchMapping("/materials/{id}") public Item update(@PathVariable Long id,@AuthenticationPrincipal String actor,@RequestBody UpdateInput input) {
        return service.update(id,Long.valueOf(actor),input.title(),input.description());
    }
    @DeleteMapping("/materials/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id,@AuthenticationPrincipal String actor) { service.delete(id,Long.valueOf(actor)); }
    private boolean privileged(Authentication auth) { return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_LECTURER")); }
    private int checkedLimit(int limit) { if(limit<1 || limit>100) throw new IllegalArgumentException("limit phải từ 1 đến 100"); return limit; }
    private String extension(String path) { int dot=Objects.requireNonNullElse(path,"").lastIndexOf('.'); return dot<0 ? "" : path.substring(dot); }
    public record LinkInput(String title,String description,String url) { }
    public record UpdateInput(String title,String description) { }
}
