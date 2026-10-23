package vn.lmsp.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.UserManagementDtos.*;
import vn.lmsp.enums.UserStatus;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import java.security.SecureRandom;
import java.util.*;

@Service
public class UserManagementService {
    private final UserRepository users; private final RoleRepository roles; private final RefreshTokenRepository tokens; private final PasswordEncoder passwords; private final AuditService audit;
    private final SecureRandom random=new SecureRandom(); private static final String ALPHABET="abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    public UserManagementService(UserRepository users,RoleRepository roles,RefreshTokenRepository tokens,PasswordEncoder passwords,AuditService audit) {
        this.users=users; this.roles=roles; this.tokens=tokens; this.passwords=passwords; this.audit=audit;
    }
    @Transactional(readOnly=true) public Page<UserView> list(String role,String status,String q,int page,int limit) {
        UserStatus value=status==null ? null : parseStatus(status);
        var result=users.search(blankNull(role),value,blankNull(q),PageRequest.of(page-1,limit));
        return new Page<>(result.getContent().stream().map(UserManagementService::view).toList(),result.getTotalElements(),page,limit);
    }
    @Transactional public UserWithTempPassword create(CreateUser input,Long actorId) {
        if(users.findByEmailIgnoreCase(input.email()).isPresent()) throw conflict("Email đã tồn tại");
        String temporary=input.password()==null ? generatePassword() : null;
        User user=new User(input.email(),passwords.encode(temporary==null ? input.password() : temporary),input.full_name(),input.student_code(),role("student"));
        user.setRoles(resolveRoles(input.role_names()));
        try { users.saveAndFlush(user); } catch(org.springframework.dao.DataIntegrityViolationException error) { throw conflict("Email hoặc mã sinh viên đã tồn tại"); }
        audit.record(actorId,"user.create","user",user.getId(),null,Map.of("email",user.getEmail(),"roles",input.role_names()));
        return new UserWithTempPassword(view(user),temporary);
    }
    @Transactional(readOnly=true) public UserView get(Long id) { return view(user(id)); }
    @Transactional public UserWithTempPassword update(Long id,UpdateUser input,Long actorId) {
        User user=user(id); Map<String,Object> old=snapshot(user); List<String> oldRoles=user.getRoles().stream().map(Role::getName).sorted().toList(); user.updateProfile(input.full_name(),null);
        if(input.student_code()!=null) user.setStudentCode(input.student_code().isBlank() ? null : input.student_code());
        if(input.status()!=null) { UserStatus next=parseStatus(input.status()); user.setStatus(next); if(next==UserStatus.locked) revoke(user); }
        if(input.role_names()!=null) user.setRoles(resolveRoles(input.role_names()));
        String temporary=null;
        if(input.reset_password()) { temporary=generatePassword(); user.setPasswordHash(passwords.encode(temporary)); revoke(user); }
        try { users.flush(); } catch(org.springframework.dao.DataIntegrityViolationException error) { throw conflict("Mã sinh viên đã tồn tại"); }
        Map<String,Object> next=snapshot(user); next.put("password_reset",input.reset_password()); next.put("sessions_revoked",input.reset_password() || "locked".equals(input.status()));
        audit.record(actorId,"user.update","user",user.getId(),old,next);
        if(input.role_names()!=null && !oldRoles.equals(user.getRoles().stream().map(Role::getName).sorted().toList())) audit.record(actorId,"role.assign","user",user.getId(),Map.of("roles",oldRoles),Map.of("roles",user.getRoles().stream().map(Role::getName).sorted().toList()));
        return new UserWithTempPassword(view(user),temporary);
    }
    @Transactional public UserView updateMe(Long id,UpdateMe input) {
        User user=user(id); Map<String,Object> old=snapshot(user); user.updateProfile(input.full_name(),null);
        if(input.new_password()!=null) {
            if(input.current_password()==null || !passwords.matches(input.current_password(),user.getPasswordHash())) throw invalid("Mật khẩu hiện tại không đúng");
            user.setPasswordHash(passwords.encode(input.new_password())); revoke(user);
        }
        audit.record(id,"user.update","user",id,old,snapshot(user));
        return view(user);
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
    private static String value(List<String> row,int index) { return index>=row.size()?"":row.get(index).trim(); }
    private static Map<String,Object> snapshot(User u) { Map<String,Object> value=new LinkedHashMap<>(); value.put("full_name",u.getFullName()); value.put("student_code",u.getStudentCode()); value.put("status",u.getStatus().name()); value.put("roles",u.getRoles().stream().map(Role::getName).sorted().toList()); return value; }
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
    private static UserView view(User u) { return new UserView(u.getId(),u.getEmail(),u.getFullName(),u.getStudentCode(),u.getStatus().name(),u.getLastLoginAt(),u.getCreatedAt(),u.getRoles().stream().map(Role::getName).sorted().toList()); }
    private static UserStatus parseStatus(String status) { try { return UserStatus.valueOf(status); } catch(Exception e) { throw invalid("Trạng thái không hợp lệ"); } }
    private static String blankNull(String value) { return value==null || value.isBlank() ? null : value; }
    private static LmsException invalid(String text) { return new LmsException("VALIDATION_ERROR",text,HttpStatus.BAD_REQUEST,null); }
    private static LmsException conflict(String text) { return new LmsException("CONFLICT",text,HttpStatus.CONFLICT,null); }
}
