package vn.lmsp.worker;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.Test;

class OutputCheckerTest {
    private final OutputChecker token = OutputChecker.of("token", null);
    private final OutputChecker line = OutputChecker.of("line", null);

    @Test void defaultsToTokenAndEpsilon() {
        var checker = OutputChecker.of(null, null);
        assertEquals(OutputChecker.Mode.TOKEN, checker.mode());
        assertEquals(1e-6, checker.epsilon());
        assertEquals(1e-6, OutputChecker.of("float", Double.NaN).epsilon());
        assertEquals(1e-3, OutputChecker.of("float", 1e-3).epsilon());
        assertThrows(IllegalArgumentException.class, () -> OutputChecker.of("exact", null));
    }

    @Test void tokenIgnoresAllWhitespaceLayout() {
        assertTrue(token.accepts("1 2\r\n3\t4\n\n", "1\n2 3 4"));
        assertTrue(token.accepts("  7  ", "7"));
        assertTrue(token.accepts("", "\n \t"));
        assertFalse(token.accepts("1 2", "12"));
        assertFalse(token.accepts("1 2 3", "1 2"));
        assertFalse(token.accepts("Yes", "YES"));
        assertEquals(List.of("a", "b"), OutputChecker.tokens("\u000Ba\fb\r"));
    }

    @Test void lineNormalizesCrlfTrailingSpacesAndBlankTail() {
        assertTrue(line.accepts("a b\r\nc  \r\n\r\n\n", "a b\nc"));
        assertTrue(line.accepts("x\t \n", "x"));
        assertTrue(line.accepts("", "\n\n"));
        assertFalse(line.accepts("a  b", "a b"));
        assertFalse(line.accepts(" a", "a"));
        assertFalse(line.accepts("a\n\nb", "a\nb"));
        assertFalse(line.accepts("a b", "a\nb"));
    }

    @Test void floatUsesAbsoluteOrRelativeTolerance() {
        var checker = OutputChecker.of("float", 1e-6);
        assertTrue(checker.accepts("3.1415930", "3.1415926"));
        assertFalse(checker.accepts("3.1416", "3.1415926"));
        assertTrue(checker.accepts("1000000.5", "1000000"));
        assertFalse(checker.accepts("1000002", "1000000"));
        assertTrue(checker.accepts("1e3 -0.0", "1000 0"));
        assertTrue(checker.accepts(".5\n2.", "0.5 2"));
    }

    @Test void floatComparesNonNumbersAsStrings() {
        var checker = OutputChecker.of("float", 1e-6);
        assertTrue(checker.accepts("Case #1: 2.0000001", "Case #1: 2"));
        assertFalse(checker.accepts("case #1: 2", "Case #1: 2"));
        assertFalse(checker.accepts("1 2", "1"));
    }

    @Test void nanInfinityAndOddFormatsAreNotFiniteNumbers() {
        var checker = OutputChecker.of("float", 1e-6);
        assertNull(OutputChecker.finiteNumber("NaN"));
        assertNull(OutputChecker.finiteNumber("Infinity"));
        assertNull(OutputChecker.finiteNumber("-Infinity"));
        assertNull(OutputChecker.finiteNumber("1e999"));
        assertNull(OutputChecker.finiteNumber("1d"));
        assertNull(OutputChecker.finiteNumber("0x1p3"));
        assertTrue(checker.accepts("NaN", "NaN"));
        assertFalse(checker.accepts("NaN", "0"));
        assertFalse(checker.accepts("Infinity", "1e999"));
        assertFalse(checker.accepts("1d", "1"));
    }
}
