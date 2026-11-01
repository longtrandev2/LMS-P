CREATE TEMPORARY TABLE tmp_course_bank_merge AS
SELECT id AS bank_id, MIN(id) OVER (PARTITION BY course_id) AS canonical_bank_id
FROM question_banks
WHERE course_id IS NOT NULL;

ALTER TABLE tmp_course_bank_merge ADD PRIMARY KEY (bank_id);

CREATE TEMPORARY TABLE tmp_course_bank_target_map AS
SELECT bank_id, canonical_bank_id FROM tmp_course_bank_merge;

ALTER TABLE tmp_course_bank_target_map ADD PRIMARY KEY (bank_id);

CREATE TEMPORARY TABLE tmp_question_category_merge AS
SELECT category.id AS category_id, MIN(target.id) AS canonical_category_id
FROM question_categories category
JOIN tmp_course_bank_merge bank_map ON bank_map.bank_id = category.bank_id
JOIN question_categories target ON target.name = category.name
JOIN tmp_course_bank_target_map target_bank_map
  ON target_bank_map.bank_id = target.bank_id
 AND target_bank_map.canonical_bank_id = bank_map.canonical_bank_id
GROUP BY category.id;

ALTER TABLE tmp_question_category_merge ADD PRIMARY KEY (category_id);

UPDATE questions question
JOIN tmp_question_category_merge category_map ON category_map.category_id = question.category_id
SET question.category_id = category_map.canonical_category_id;

DELETE category
FROM question_categories category
JOIN tmp_question_category_merge category_map ON category_map.category_id = category.id
WHERE category_map.category_id <> category_map.canonical_category_id;

DELETE bank
FROM question_banks bank
JOIN tmp_course_bank_merge bank_map ON bank_map.bank_id = bank.id
WHERE bank_map.bank_id <> bank_map.canonical_bank_id;

DROP TEMPORARY TABLE tmp_question_category_merge;
DROP TEMPORARY TABLE tmp_course_bank_target_map;
DROP TEMPORARY TABLE tmp_course_bank_merge;

ALTER TABLE question_banks
  DROP INDEX ix_question_banks_course,
  ADD UNIQUE KEY uq_question_banks_course (course_id);
