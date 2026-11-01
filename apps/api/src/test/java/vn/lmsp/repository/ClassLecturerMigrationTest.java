package vn.lmsp.repository;

import static org.assertj.core.api.Assertions.*;

import java.sql.DriverManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Separate empty disposable database; verifies upgrading an existing V21 class. */
@EnabledIfEnvironmentVariable(named = "LMS_MIGRATION_TEST_URL", matches = ".+")
class ClassLecturerMigrationTest {
    @Test void migratesExistingAssignmentWithoutLosingClassOrTeacher() throws Exception {
        String url = System.getenv("LMS_MIGRATION_TEST_URL");
        String user = System.getenv("LMS_TEST_DATABASE_USER"), password = System.getenv("LMS_TEST_DATABASE_PASSWORD");
        Flyway.configure().dataSource(url, user, password).target("21").load().migrate();
        try (var connection = DriverManager.getConnection(url, user, password); var sql = connection.createStatement()) {
            sql.executeUpdate("insert into users(id,email,password_hash,full_name,status,created_at,updated_at) "
                    + "values(901,'migration@test.local','hash','Teacher','active',now(),now())");
            sql.executeUpdate("insert into user_roles(user_id,role_id) values(901,2)");
            sql.executeUpdate("insert into courses(id,code,name,created_by,created_at) values(901,'MIG','Migration',901,now())");
            sql.executeUpdate("insert into classes(id,course_id,code,name,semester,lecturer_id,created_at) "
                    + "values(901,901,'MIG-A','Legacy class','2026.1',901,now())");
        }
        Flyway.configure().dataSource(url, user, password).load().migrate();
        try (var connection = DriverManager.getConnection(url, user, password); var sql = connection.createStatement()) {
            try (var rows = sql.executeQuery("select lecturer_id from class_lecturers where class_id=901")) {
                assertThat(rows.next()).isTrue(); assertThat(rows.getLong(1)).isEqualTo(901); assertThat(rows.next()).isFalse();
            }
            try (var rows = sql.executeQuery("select count(*) from information_schema.columns "
                    + "where table_schema=database() and table_name='classes' and column_name='lecturer_id'")) {
                rows.next(); assertThat(rows.getInt(1)).isZero();
            }
            assertThatThrownBy(() -> sql.executeUpdate("insert into class_lecturers values(901,901)"))
                    .isInstanceOf(java.sql.SQLException.class);
            sql.executeUpdate("delete from classes where id=901");
            try (var rows = sql.executeQuery("select count(*) from class_lecturers where class_id=901")) {
                rows.next(); assertThat(rows.getInt(1)).isZero();
            }
            try (var rows = sql.executeQuery("select count(*) from users where id=901")) {
                rows.next(); assertThat(rows.getInt(1)).isEqualTo(1);
            }
        }
    }
}
