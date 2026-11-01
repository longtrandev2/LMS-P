package vn.lmsp.service;

import static org.assertj.core.api.Assertions.*;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class LeaveEvidenceStorageTest {
    @TempDir Path root;

    private static final int FIVE_MB = 5 * 1024 * 1024;
    private LeaveEvidenceStorage storage() { return new LeaveEvidenceStorage(root.toString(), vn.lmsp.support.TestSettings.defaults()); }
    private static MockMultipartFile file(String name, byte[] content) {
        return new MockMultipartFile("evidence", name, "application/octet-stream", content);
    }

    @Test void storesValidPdfUnderClassFolderWithSafeOriginalName() throws Exception {
        var stored = storage().store(3L, file("..\\..\\giay kham.pdf", "%PDF-1.7 test".getBytes()));
        assertThat(stored.path()).startsWith("leave-requests/3/").endsWith(".pdf");
        assertThat(stored.name()).isEqualTo("giay kham.pdf");
        assertThat(stored.type()).isEqualTo("application/pdf");
        Path saved = storage().resolve(stored.path());
        assertThat(Files.readString(saved)).isEqualTo("%PDF-1.7 test");
    }

    @Test void acceptsImageAndWordSignatures() {
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 1, 2};
        byte[] webp = "RIFF0000WEBPVP8 ".getBytes();
        byte[] docx = {'P', 'K', 3, 4, 0};
        assertThat(storage().store(3L, file("a.png", png)).type()).isEqualTo("image/png");
        assertThat(storage().store(3L, file("a.webp", webp)).type()).isEqualTo("image/webp");
        assertThat(storage().store(3L, file("a.DOCX", docx)).type()).contains("wordprocessingml");
    }

    @Test void rejectsLargeUnknownOrMismatchedFiles() {
        byte[] big = new byte[FIVE_MB + 1];
        big[0] = '%'; big[1] = 'P'; big[2] = 'D'; big[3] = 'F';
        assertThatThrownBy(() -> storage().store(3L, file("big.pdf", big))).hasMessageContaining("5 MB");
        assertThatThrownBy(() -> storage().store(3L, file("run.exe", "MZ".getBytes()))).hasMessageContaining("chỉ hỗ trợ");
        assertThatThrownBy(() -> storage().store(3L, file("fake.jpg", "%PDF".getBytes()))).hasMessageContaining("không khớp");
        assertThatThrownBy(() -> storage().store(3L, file("empty.pdf", new byte[0]))).hasMessageContaining("Cần một tệp");
        assertThatThrownBy(() -> storage().store(3L, null)).hasMessageContaining("Cần một tệp");
    }

    @Test void exactlyFiveMegabytesIsAllowed() {
        byte[] max = new byte[FIVE_MB];
        max[0] = '%'; max[1] = 'P'; max[2] = 'D'; max[3] = 'F';
        assertThat(storage().store(3L, file("max.pdf", max)).size()).isEqualTo(max.length);
    }

    @Test void resolveRefusesPathsOutsideTheEvidenceFolder() {
        assertThatThrownBy(() -> storage().resolve("../secret.txt")).hasMessageContaining("Không tìm thấy");
        assertThatThrownBy(() -> storage().resolve("materials/3/a.pdf")).hasMessageContaining("Không tìm thấy");
    }

    @Test void safeNameStripsDirectoriesAndControlCharacters() {
        assertThat(LeaveEvidenceStorage.safeName("/etc/\"pass\"\n.pdf")).isEqualTo("pass.pdf");
        assertThat(LeaveEvidenceStorage.safeName(".pdf")).isEqualTo("minh-chung.pdf");
        assertThat(LeaveEvidenceStorage.safeName("a".repeat(300) + ".pdf")).hasSize(255).endsWith(".pdf");
    }
}
