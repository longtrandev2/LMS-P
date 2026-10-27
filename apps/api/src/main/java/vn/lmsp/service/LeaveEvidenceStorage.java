package vn.lmsp.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import vn.lmsp.common.LmsException;

/** Tệp minh chứng đơn xin nghỉ dưới `storage/leave-requests/{class_id}/` — pdf/jpg/png/webp/doc/docx, ≤ 5 MB. */
@Component
public class LeaveEvidenceStorage {
    public static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final String FOLDER = "leave-requests";
    private static final Map<String, String> TYPES = Map.of(
            ".pdf", "application/pdf", ".jpg", "image/jpeg", ".jpeg", "image/jpeg", ".png", "image/png",
            ".webp", "image/webp", ".doc", "application/msword",
            ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    private final Path root;

    public record StoredEvidence(String path, String name, int size, String type) { }

    public LeaveEvidenceStorage(@Value("${lms.storage-dir:./storage}") String root) {
        this.root = Path.of(root).toAbsolutePath().normalize();
    }

    public StoredEvidence store(Long classId, MultipartFile file) {
        if (file == null || file.isEmpty()) throw ScheduleErrors.invalid("Cần một tệp minh chứng");
        if (file.getSize() > MAX_BYTES) throw ScheduleErrors.invalid("Tệp minh chứng tối đa 5 MB");
        String name = safeName(file.getOriginalFilename());
        String ext = extension(name);
        String type = TYPES.get(ext);
        if (type == null) throw ScheduleErrors.invalid("Tệp minh chứng chỉ hỗ trợ PDF, JPG, PNG, WEBP, DOC hoặc DOCX");
        byte[] bytes;
        try { bytes = file.getBytes(); } catch (IOException error) { throw storageError(); }
        if (bytes.length > MAX_BYTES) throw ScheduleErrors.invalid("Tệp minh chứng tối đa 5 MB");
        if (!matchesSignature(ext, bytes)) throw ScheduleErrors.invalid("Nội dung tệp không khớp định dạng " + ext);
        String relative = FOLDER + "/" + classId + "/" + UUID.randomUUID() + ext;
        Path target = root.resolve(relative).normalize();
        if (!target.startsWith(root.resolve(FOLDER))) throw ScheduleErrors.invalid("Đường dẫn tệp không hợp lệ");
        try { Files.createDirectories(target.getParent()); Files.write(target, bytes); }
        catch (IOException error) { throw storageError(); }
        deleteOnRollback(target);
        return new StoredEvidence(relative, name, bytes.length, type);
    }

    public Path resolve(String relative) {
        Path file = root.resolve(relative).normalize();
        if (!file.startsWith(root.resolve(FOLDER)) || !Files.isRegularFile(file))
            throw ScheduleErrors.notFound("Không tìm thấy tệp minh chứng");
        return file;
    }

    /** Tên gốc an toàn: bỏ thư mục, ký tự điều khiển, dấu nháy; tối đa 255 ký tự. */
    static String safeName(String original) {
        String name = Objects.requireNonNullElse(original, "");
        name = name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1);
        name = name.replaceAll("[\\p{Cntrl}\"<>|:*?]", "").trim();
        if (name.isEmpty() || name.startsWith(".")) name = "minh-chung" + name;
        if (name.length() > 255) {
            String ext = extension(name);
            name = name.substring(0, 255 - ext.length()) + ext;
        }
        return name;
    }

    static String extension(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot).toLowerCase(Locale.ROOT);
    }

    static boolean matchesSignature(String ext, byte[] b) {
        return switch (ext) {
            case ".pdf" -> startsWith(b, "%PDF".getBytes(StandardCharsets.US_ASCII));
            case ".jpg", ".jpeg" -> startsWith(b, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});
            case ".png" -> startsWith(b, new byte[]{(byte) 0x89, 'P', 'N', 'G'});
            case ".webp" -> startsWith(b, "RIFF".getBytes(StandardCharsets.US_ASCII)) && b.length >= 12
                    && Arrays.equals(Arrays.copyOfRange(b, 8, 12), "WEBP".getBytes(StandardCharsets.US_ASCII));
            case ".doc" -> startsWith(b, new byte[]{(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0});
            case ".docx" -> startsWith(b, new byte[]{'P', 'K', 0x03, 0x04});
            default -> false;
        };
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        return data.length >= prefix.length && Arrays.equals(Arrays.copyOf(data, prefix.length), prefix);
    }

    private static void deleteOnRollback(Path file) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) try { Files.deleteIfExists(file); } catch (IOException ignored) { }
            }
        });
    }

    private static LmsException storageError() {
        return new LmsException("STORAGE_ERROR", "Không thể lưu tệp minh chứng", HttpStatus.INTERNAL_SERVER_ERROR, null);
    }
}
