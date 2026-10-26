package vn.lmsp.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.SplittableRandom;

/**
 * Trộn đề ổn định theo seed — docs/assessment-spec.md §6.1. Seed = 8 byte đầu SHA-256 của
 * "{assignment_id}:{student_id}:{n}". Mỗi danh sách dùng một "muối" riêng để hoán vị độc lập nhau.
 */
public final class PaperShuffler {
    private final long seed;

    public PaperShuffler(long seed) { this.seed = seed; }

    public static PaperShuffler of(Long assignmentId, Long studentId, int n) {
        return new PaperShuffler(seed(assignmentId, studentId, n));
    }

    public static long seed(Long assignmentId, Long studentId, int n) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((assignmentId + ":" + studentId + ":" + n).getBytes(StandardCharsets.UTF_8));
            return ByteBuffer.wrap(digest, 0, 8).getLong();
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 unavailable", error);
        }
    }

    /** Hoán vị Fisher–Yates; cùng seed + muối luôn cho cùng kết quả. */
    public <T> List<T> permute(List<T> items, long salt) {
        List<T> result = new ArrayList<>(items);
        SplittableRandom random = new SplittableRandom(seed ^ (salt * 0x9E3779B97F4A7C15L));
        for (int i = result.size() - 1; i > 0; i--) Collections.swap(result, i, random.nextInt(i + 1));
        return result;
    }

    /**
     * Như {@link #permute} nhưng nếu `correctPrefix` phần tử đầu trùng thứ tự đúng thì xoay vòng 1 vị trí
     * (matching cột phải, ordering).
     */
    public <T> List<T> permuteAvoidingIdentity(List<T> items, int correctPrefix, long salt) {
        List<T> result = permute(items, salt);
        int prefix = Math.min(correctPrefix, items.size());
        if (items.size() > 1 && result.subList(0, prefix).equals(items.subList(0, prefix)))
            Collections.rotate(result, 1);
        return result;
    }
}
