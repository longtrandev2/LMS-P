package vn.lmsp.model;

import jakarta.persistence.*;
import vn.lmsp.enums.UserStatus;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 255)
    private String email;
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;
    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;
    @Column(name = "student_code", unique = true, length = 20)
    private String studentCode;
    @Column(length = 20)
    private String phone;
    @Column(name = "avatar_path", length = 255)
    private String avatarPath;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private UserStatus status = UserStatus.active;
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    protected User() { }
    public User(String email, String passwordHash, String fullName, String studentCode, Role role) {
        this.email = email; this.passwordHash = passwordHash; this.fullName = fullName;
        this.studentCode = studentCode; this.roles.add(role);
    }
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
    public Long getId() { return id; }
    public String getEmail() { return email; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public String getFullName() { return fullName; }
    public String getStudentCode() { return studentCode; }
    public String getPhone() { return phone; }
    public String getAvatarPath() { return avatarPath; }
    public UserStatus getStatus() { return status; }
    public String getPasswordHash() { return passwordHash; }
    public Set<Role> getRoles() { return roles; }
    public void setLastLoginAt(LocalDateTime value) { lastLoginAt = value; }
    public void updateProfile(String fullName, String studentCode) { if(fullName!=null) this.fullName=fullName; if(studentCode!=null) this.studentCode=studentCode; }
    public void updatePersonalProfile(String fullName, String phone) {
        if (fullName != null) this.fullName = fullName;
        if (phone != null) this.phone = phone.isBlank() ? null : phone.trim();
    }
    public void setAvatarPath(String value) { avatarPath = value; }
    public void setPasswordHash(String value) { passwordHash=value; }
    public void setStatus(UserStatus value) { status=value; }
    public void setStudentCode(String value) { studentCode=value; }
    public void setRoles(Set<Role> values) { roles.clear(); roles.addAll(values); }
}
