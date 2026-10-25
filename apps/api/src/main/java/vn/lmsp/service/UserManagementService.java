package vn.lmsp.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.UserManagementDtos.*;
import vn.lmsp.enums.UserStatus;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.mapper.UserMapper;
import vn.lmsp.mapper.AcademicsMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import java.security.SecureRandom;
import java.util.*;

@Service
public class UserManagementService {
    private final UserRepository users; private final RoleRepository roles; private final RefreshTokenRepository tokens;
    private final PasswordEncoder passwords; private final AuditService audit; private final EnrollmentRepository enrollments;
    private final ClassRepository classes;
    private final UserMapper mapper;
    private final AcademicsMapper academicsMapper;
    private final SecureRandom random=new SecureRandom(); private static final String ALPHABET="abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    public UserManagementService(UserRepository users,RoleRepository roles,RefreshTokenRepository tokens,PasswordEncoder passwords,
                                 AuditService audit,EnrollmentRepository enrollments,ClassRepository classes,
                                 UserMapper mapper,AcademicsMapper academicsMapper) {
        this.users=users; this.roles=roles; this.tokens=tokens; this.passwords=passwords; this.audit=audit;
        this.enrollments=enrollments; this.classes=classes; this.mapper=mapper; this.academicsMapper=academicsMapper;
    }
    @Transactional(readOnly=true) public Page<UserView> list(String role,String status,String q,String sort,int page,int limit) {
        UserStatus value=status==null ? null : parseStatus(status);
        var result=users.search(blankNull(role),value,blankNull(q),PageRequest.of(page-1,limit,userSort(sort)));
        return new Page<>(result.getContent().stream().map(mapper::toView).toList(),result.getTotalElements(),page,limit);
    }
    @Transactional public UserWithTempPassword create(CreateUser input,Long actorId) {
        if(users.findByEmailIgnoreCase(input.email()).isPresent()) throw conflict("Email đã tồn tại");
        String temporary=input.password()==null ? generatePassword() : null;
        User user=new User(input.email(),passwords.encode(temporary==null ? input.password() : temporary),input.full_name(),input.student_code(),role("student"));
        user.setRoles(resolveRoles(input.role_names()));
        try { users.saveAndFlush(user); } catch(org.springframework.dao.DataIntegrityViolationException error) { throw conflict("Email hoặc mã sinh viên đã tồn tại"); }
        audit.record(actorId,"user.create","user",user.getId(),null,Map.of("email",user.getEmail(),"roles",input.role_names()));
        return new UserWithTempPassword(mapper.toView(user),temporary);
    }
    @Transactional(readOnly=true) public UserDetail get(Long id) {
        User target=user(id);
        var enrolled=enrollments.findAllByStudent_IdAndStatusOrderByLmsClass_Id(id,EnrollmentStatus.active).stream()
                .map(e -> academicsMapper.toClassReference(e.getLmsClass())).toList();
        var teaching=target.getRoles().stream().anyMatch(r -> r.getName().equals("lecturer"))
                ? classes.findAllByLecturer_IdOrderByIdDesc(id).stream().map(academicsMapper::toClassReference).toList()
                : List.<ClassReference>of();
        return new UserDetail(mapper.toView(target),enrolled,teaching);
    }
    @Transactional public UserWithTempPassword update(Long id,UpdateUser input,Long actorId) {
        if(input.full_name()!=null && input.full_name().isBlank()) throw invalid("Họ tên không được để trống");
        User user=user(id); Map<String,Object> old=mapper.toAuditValue(user); List<String> oldRoles=user.getRoles().stream().map(Role::getName).sorted().toList(); user.updateProfile(input.full_name(),null);
        if(input.student_code()!=null) user.setStudentCode(input.student_code().isBlank() ? null : input.student_code());
        String lockReason=null;
        if(input.status()!=null) {
            UserStatus nextStatus=parseStatus(input.status());
            if(nextStatus==UserStatus.locked && user.getStatus()!=UserStatus.locked) {
                lockReason=input.lock_reason()==null ? "" : input.lock_reason().trim();
                if(lockReason.isBlank()) throw invalid("Cần nhập lý do khóa tài khoản");
            }
            user.setStatus(nextStatus); if(nextStatus==UserStatus.locked) revoke(user);
        }
        if(input.role_names()!=null) user.setRoles(resolveRoles(input.role_names()));
        String temporary=null;
        if(input.reset_password()) { temporary=generatePassword(); user.setPasswordHash(passwords.encode(temporary)); revoke(user); }
        try { users.flush(); } catch(org.springframework.dao.DataIntegrityViolationException error) { throw conflict("Mã sinh viên đã tồn tại"); }
        Map<String,Object> next=mapper.toAuditValue(user); next.put("password_reset",input.reset_password()); next.put("sessions_revoked",input.reset_password() || "locked".equals(input.status()));
        if(lockReason!=null) next.put("lock_reason",lockReason);
        audit.record(actorId,"user.update","user",user.getId(),old,next);
        if(input.role_names()!=null && !oldRoles.equals(user.getRoles().stream().map(Role::getName).sorted().toList())) audit.record(actorId,"role.assign","user",user.getId(),Map.of("roles",oldRoles),Map.of("roles",user.getRoles().stream().map(Role::getName).sorted().toList()));
        return new UserWithTempPassword(mapper.toView(user),temporary);
    }
    @Transactional public UserView updateMe(Long id,UpdateMe input) {
        if(input.full_name()!=null && input.full_name().isBlank()) throw invalid("Họ tên không được để trống");
        User user=user(id); Map<String,Object> old=mapper.toAuditValue(user); user.updatePersonalProfile(input.full_name(),input.phone());
        if(input.new_password()!=null) {
            if(input.old_password()==null || !passwords.matches(input.old_password(),user.getPasswordHash())) throw invalid("Mật khẩu hiện tại không đúng");
            user.setPasswordHash(passwords.encode(input.new_password())); revoke(user);
        }
        audit.record(id,"user.update","user",id,old,mapper.toAuditValue(user));
        return mapper.toView(user);
    }
    @Transactional public int revokeSessions(Long id,Long actorId) {
        user(id); var active=tokens.findAllByUser_IdAndRevokedAtIsNull(id); active.forEach(RefreshToken::revoke);
        audit.record(actorId,"user.sessions.revoke","user",id,null,Map.of("revoked_count",active.size())); return active.size();
    }
    @Transactional public ImportResult importCsv(String content,Long actorId) {
        String[] lines=content.replace("\uFEFF","").split("\\R",-1);
        if(lines.length==0) throw invalid("CSV rỗng");
        List<String> headers=parseCsvLine(lines[0]);
        if(!headers.containsAll(List.of("email","full_name","student_code","role"))) throw invalid("CSV cần các cột email, full_name, student_code, role");
        int emailIndex=headers.indexOf("email"), nameIndex=headers.indexOf("full_name"), codeIndex=headers.indexOf("student_code"), roleIndex=headers.indexOf("role");
        List<String> skipped=new ArrayList<>(); List<ImportRowError> errors=new ArrayList<>(); List<TempPassword> tempPasswords=new ArrayList<>(); int created=0;
        for(int i=1;i<lines.length;i++) {
            if(lines[i].isBlank()) continue;
            try {
                List<String> row=parseCsvLine(lines[i]); String email=value(row,emailIndex), name=value(row,nameIndex), code=value(row,codeIndex), roleName=value(row,roleIndex);
                if(email.isBlank()) continue;
                if(!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) { errors.add(new ImportRowError(i+1,"email không hợp lệ")); continue; }
                if(name.isBlank()) { errors.add(new ImportRowError(i+1,"thiếu họ tên")); continue; }
                if(!List.of("student","lecturer","admin").contains(roleName)) { errors.add(new ImportRowError(i+1,"role không hợp lệ: "+roleName)); continue; }
                if(users.findByEmailIgnoreCase(email).isPresent()) { skipped.add(email); continue; }
                if(!code.isBlank() && users.existsByStudentCode(code)) { errors.add(new ImportRowError(i+1,"mã sinh viên đã tồn tại")); continue; }
                String password=generatePassword(); User imported=new User(email,passwords.encode(password),name,code.isBlank()?null:code,role(roleName));
                users.saveAndFlush(imported); tempPasswords.add(new TempPassword(email,password)); created++;
                audit.record(actorId,"user.create","user",imported.getId(),null,Map.of("email",email,"roles",List.of(roleName),"imported",true));
            } catch(IllegalArgumentException error) { errors.add(new ImportRowError(i+1,error.getMessage())); }
        }
        return new ImportResult(created,skipped,errors,tempPasswords);
    }
    @Transactional(readOnly=true) public ImportPreview previewCsv(String content) {
        String[] lines=content.replace("\uFEFF","").split("\\R",-1);
        if(lines.length==0 || lines[0].isBlank()) throw invalid("CSV rỗng");
        List<String> headers=parseCsvLine(lines[0]);
        if(!headers.containsAll(List.of("email","full_name","student_code","role"))) throw invalid("CSV cần các cột email, full_name, student_code, role");
        int emailIndex=headers.indexOf("email"), nameIndex=headers.indexOf("full_name"), codeIndex=headers.indexOf("student_code"), roleIndex=headers.indexOf("role");
        Set<String> seenEmails=new HashSet<>(), seenCodes=new HashSet<>();
        List<ImportRowError> errors=new ArrayList<>(); List<DuplicateRow> duplicates=new ArrayList<>(); int valid=0;
        for(int i=1;i<lines.length;i++) {
            if(lines[i].isBlank()) continue;
            try {
                List<String> row=parseCsvLine(lines[i]); String email=value(row,emailIndex), name=value(row,nameIndex), code=value(row,codeIndex), roleName=value(row,roleIndex);
                String reason=null; boolean duplicateEmail=false, duplicateCode=false;
                if(!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) reason="email không hợp lệ";
                else if(name.isBlank()) reason="thiếu họ tên";
                else if(!List.of("student","lecturer","admin").contains(roleName)) reason="role không hợp lệ: "+roleName;
                else {
                    duplicateEmail=users.findByEmailIgnoreCase(email).isPresent() || !seenEmails.add(email.toLowerCase(Locale.ROOT));
                    duplicateCode=!code.isBlank() && (users.existsByStudentCode(code) || !seenCodes.add(code));
                    if(duplicateEmail || duplicateCode) reason=duplicateEmail ? "email bị trùng" : "mã sinh viên bị trùng";
                }
                if(duplicateEmail || duplicateCode) duplicates.add(new DuplicateRow(i+1,duplicateEmail?email:null,duplicateCode?code:null));
                if(reason==null) valid++; else errors.add(new ImportRowError(i+1,reason));
            } catch(IllegalArgumentException error) { errors.add(new ImportRowError(i+1,error.getMessage())); }
        }
        return new ImportPreview(valid,errors,duplicates);
    }
    @Transactional(readOnly=true) public String exportCsv(String role,String status,String q,String sort) {
        UserStatus value=status==null ? null : parseStatus(status);
        StringBuilder csv=new StringBuilder("\uFEFFemail,full_name,student_code,phone,roles,status,created_at,last_login_at\r\n");
        var page=users.search(blankNull(role),value,blankNull(q),PageRequest.of(0,500,userSort(sort)));
        while(true) {
            page.getContent().forEach(u -> csv.append(csvCell(u.getEmail())).append(',').append(csvCell(u.getFullName())).append(',')
                    .append(csvCell(u.getStudentCode())).append(',').append(csvCell(u.getPhone())).append(',')
                    .append(csvCell(u.getRoles().stream().map(Role::getName).sorted().reduce((a,b)->a+"|"+b).orElse(""))).append(',')
                    .append(csvCell(u.getStatus().name())).append(',').append(csvCell(u.getCreatedAt().toString())).append(',')
                    .append(csvCell(u.getLastLoginAt()==null?"":u.getLastLoginAt().toString())).append("\r\n"));
            if(!page.hasNext()) break;
            page=users.search(blankNull(role),value,blankNull(q),page.nextPageable());
        }
        return csv.toString();
    }
    private static String value(List<String> row,int index) { return index>=row.size()?"":row.get(index).trim(); }
    private static List<String> parseCsvLine(String line) {
        List<String> cells=new ArrayList<>(); StringBuilder cell=new StringBuilder(); boolean quoted=false;
        for(int i=0;i<line.length();i++) { char c=line.charAt(i);
            if(c=='"' && quoted && i+1<line.length() && line.charAt(i+1)=='"') { cell.append('"'); i++; }
            else if(c=='"') quoted=!quoted;
            else if(c==',' && !quoted) { cells.add(cell.toString()); cell.setLength(0); }
            else cell.append(c);
        }
        if(quoted) throw new IllegalArgumentException("CSV có dấu ngoặc kép chưa đóng");
        cells.add(cell.toString()); return cells;
    }
    private void revoke(User user) { tokens.findAllByUser_IdAndRevokedAtIsNull(user.getId()).forEach(RefreshToken::revoke); }
    private User user(Long id) { return users.findWithRolesById(id).orElseThrow(()->new LmsException("NOT_FOUND","Không tìm thấy người dùng",HttpStatus.NOT_FOUND,null)); }
    private Role role(String name) { return roles.findByName(name).orElseThrow(()->invalid("Vai trò không tồn tại: "+name)); }
    private Set<Role> resolveRoles(List<String> names) {
        if(names==null || names.isEmpty()) throw invalid("Cần ít nhất một vai trò");
        Set<String> distinct=new HashSet<>(names); if(distinct.size()!=names.size()) throw invalid("Vai trò bị trùng");
        Set<Role> resolved=new HashSet<>(); for(String name:distinct) resolved.add(role(name)); return resolved;
    }
    private String generatePassword() { StringBuilder value=new StringBuilder(); for(int i=0;i<12;i++) value.append(ALPHABET.charAt(random.nextInt(ALPHABET.length()))); return value.toString(); }
    private static Sort userSort(String value) {
        if(value==null || value.isBlank()) return Sort.by(Sort.Direction.DESC,"createdAt");
        boolean descending=value.startsWith("-"); String field=descending?value.substring(1):value;
        String property=switch(field) { case "full_name" -> "fullName"; case "last_login_at" -> "lastLoginAt"; case "created_at" -> "createdAt"; default -> throw invalid("Trường sắp xếp không hợp lệ"); };
        return Sort.by(descending?Sort.Direction.DESC:Sort.Direction.ASC,property);
    }
    private static String csvCell(String value) {
        if(value==null) return ""; String safe=value.matches("^[=+@\\-\\t\\r].*") ? "'"+value : value;
        return "\""+safe.replace("\"","\"\"")+"\"";
    }
    private static UserStatus parseStatus(String status) { try { return UserStatus.valueOf(status); } catch(Exception e) { throw invalid("Trạng thái không hợp lệ"); } }
    private static String blankNull(String value) { return value==null || value.isBlank() ? null : value; }
    private static LmsException invalid(String text) { return new LmsException("VALIDATION_ERROR",text,HttpStatus.BAD_REQUEST,null); }
    private static LmsException conflict(String text) { return new LmsException("CONFLICT",text,HttpStatus.CONFLICT,null); }
}
