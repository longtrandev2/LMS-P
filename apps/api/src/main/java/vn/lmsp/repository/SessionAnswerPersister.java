package vn.lmsp.repository;

import vn.lmsp.model.SessionAnswer;

/**
 * Thêm câu trả lời mới bằng `persist`: khóa ghép `@IdClass` gồm hai `@ManyToOne` nên `save()` của Spring Data luôn coi
 * bản ghi là "đã có" và đi đường `merge`.
 */
public interface SessionAnswerPersister {
    void persist(SessionAnswer answer);
}
