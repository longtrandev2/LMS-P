package vn.lmsp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.lmsp.common.LmsException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;

/** Lưu trữ ảnh đại diện trong volume storage/avatars/{userId}.{ext} (FR-AUTH-03). */
@Service
public class AvatarStorage {
    private static final long MAX_BYTES = 2 * 1024 * 1024;
    private static final Set<String> ALLOWED = Set.of("jpg", "jpeg", "png", "webp");
    private final Path root;
    public AvatarStorage(@Value("${lms.storage-dir:./storage}") String root) {
        this.root = Path.of(root).toAbsolutePath().normalize();
    }
    /** Validate loại/kích thước rồi lưu; trả về path tương đối (avatars/...). */
    public String store(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) throw invalid("Cần chọn tệp ảnh");
        if (file.getSize() > MAX_BYTES) throw invalid("Ảnh đại diện vượt quá 2MB");
        String ext = extension(file.getOriginalFilename());
        if (!ALLOWED.contains(ext)) throw invalid("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP");
        String relative = "avatars/" + userId + "." + ("jpeg".equals(ext) ? "jpg" : ext);
        Path target = resolve(relative);
        try {
            Files.createDirectories(target.getParent());
            try (var input = file.getInputStream()) { Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING); }
        } catch (IOException error) { throw new LmsException("INTERNAL", "Không thể lưu ảnh đại diện", HttpStatus.INTERNAL_SERVER_ERROR, null); }
        return relative;
    }
    public void delete(String relative) {
        if (relative == null) return;
        try { Files.deleteIfExists(resolve(relative)); } catch (IOException ignored) { }
    }
    public Path resolve(String relative) {
        Path target = root.resolve(relative).normalize();
        if (!target.startsWith(root.resolve("avatars").normalize()))
            throw new LmsException("NOT_FOUND", "Không tìm thấy ảnh đại diện", HttpStatus.NOT_FOUND, null);
        return target;
    }
    private static String extension(String name) {
        String original = name == null ? "" : name;
        int dot = original.lastIndexOf('.');
        return dot < 0 ? "" : original.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
    private static LmsException invalid(String message) { return new LmsException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, null); }
}
