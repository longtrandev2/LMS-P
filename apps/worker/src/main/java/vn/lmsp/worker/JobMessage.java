package vn.lmsp.worker;

public record JobMessage(int schema_version, String job_id, Long submission_id, Long question_id,
        Long question_version_id, String language, int grading_attempt, int priority) { }
