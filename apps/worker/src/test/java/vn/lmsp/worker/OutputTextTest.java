package vn.lmsp.worker;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class OutputTextTest {
    @Test void keepsShortText() {
        assertEquals("abc", OutputText.truncate("abc", 3));
        assertNull(OutputText.truncate(null, 10));
        assertEquals("", OutputText.truncate("abc", 0));
    }

    @Test void neverSplitsMultiByteCharacters() {
        String text = "aế😀b"; // 1 + 3 + 4 + 1 byte
        assertEquals("a", OutputText.truncate(text, 2));
        assertEquals("a", OutputText.truncate(text, 3));
        assertEquals("aế", OutputText.truncate(text, 4));
        assertEquals("aế", OutputText.truncate(text, 7));
        assertEquals("aế😀", OutputText.truncate(text, 8));
    }

    @Test void cutsToEventLimit() {
        String text = "ư".repeat(3000); // 6000 byte
        String cut = OutputText.truncate(text, OutputText.EVENT_OUTPUT_BYTES);
        assertTrue(cut.getBytes(StandardCharsets.UTF_8).length <= 4096);
        assertEquals(2048, cut.length());
    }
}
