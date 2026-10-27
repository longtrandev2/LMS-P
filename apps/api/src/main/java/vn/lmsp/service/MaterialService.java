package vn.lmsp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.MaterialDtos.*;
import vn.lmsp.enums.EnrollmentStatus;
import vn.lmsp.enums.ClassStatus;
import vn.lmsp.mapper.MaterialMapper;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.nio.file.*;
import java.util.*;

@Service
public class MaterialService {
    private static final Map<String,String> TYPES=Map.of(".pdf","pdf",".doc","doc",".docx","doc",".ppt","slide",".pptx","slide",".zip","archive");
    private final MaterialRepository materials; private final ClassRepository classes; private final EnrollmentRepository enrollments;
    private final UserRepository users; private final NotificationService notifications; private final Path root; private final long maxBytes;
    private final AuditService audit;
    private final MaterialMapper mapper;
    private final ClassSessionRepository sessions;
    public MaterialService(MaterialRepository materials, ClassRepository classes, EnrollmentRepository enrollments,
                          UserRepository users, NotificationService notifications,AuditService audit, MaterialMapper mapper,
                          ClassSessionRepository sessions,
                          @Value("${lms.storage-dir:./storage}") String root, @Value("${lms.upload.max-mb:20}") int maxMb) {
        this.materials=materials; this.classes=classes; this.enrollments=enrollments; this.users=users; this.sessions=sessions;
        this.notifications=notifications; this.audit=audit; this.mapper=mapper; this.root=Path.of(root).toAbsolutePath().normalize(); this.maxBytes=maxMb*1024L*1024L;
    }
    @Transactional(readOnly=true) public Page list(Long classId, Long userId, boolean privileged, int page, int limit) {
        LmsClass clazz=clazz(classId); checkAccess(clazz, userId, privileged);
        var result=materials.findByLmsClass_IdOrderByCreatedAtDescIdDesc(classId, PageRequest.of(page-1,limit));
        return new Page(result.getContent().stream().map(mapper::toView).toList(), result.getTotalElements(), page, limit);
    }
    @Transactional public Item createLink(Long classId, Long actorId, String title, String description, String url, Long sessionId) {
        LmsClass clazz=clazz(classId); checkOwner(clazz, actorId);
        if(title==null || title.isBlank() || url==null || !(url.startsWith("https://") || url.startsWith("http://"))) throw invalid("Tiêu đề hoặc liên kết không hợp lệ");
        checkSession(classId, sessionId);
        Material draft=new Material(clazz,title,description,"link",url,0,user(actorId)); draft.assignSession(sessionId);
        Material item=materials.save(draft);
        audit.record(actorId,"material.create","material",item.getId(),null,Map.of("title",title,"type","link","class_id",classId,"url",url));
        notifyStudents(clazz,item); return mapper.toView(item);
    }
    @Transactional public Item upload(Long classId, Long actorId, String title, String description, MultipartFile file, Long sessionId) {
        LmsClass clazz=clazz(classId); checkOwner(clazz,actorId);
        if(title==null || title.isBlank() || file==null || file.isEmpty()) throw invalid("Cần tiêu đề và tệp học liệu");
        checkSession(classId, sessionId);
        if(file.getSize()>maxBytes) throw invalid("Tệp vượt quá giới hạn " + (maxBytes/1024/1024) + "MB");
        String original=Objects.requireNonNullElse(file.getOriginalFilename(), "");
        String ext=original.lastIndexOf('.')<0 ? "" : original.substring(original.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        if(!TYPES.containsKey(ext)) throw invalid("Định dạng chỉ hỗ trợ PDF, DOC/DOCX, PPT/PPTX hoặc ZIP");
        String name=UUID.randomUUID()+ext; Path folder=root.resolve("materials").resolve(classId.toString()).normalize(); Path target=folder.resolve(name).normalize();
        try { Files.createDirectories(folder); file.transferTo(target); }
        catch(Exception error) { throw new LmsException("STORAGE_ERROR","Không thể lưu tệp học liệu",HttpStatus.INTERNAL_SERVER_ERROR,null); }
        Material draft=new Material(clazz,title,description,TYPES.get(ext),"materials/"+classId+"/"+name,file.getSize(),user(actorId));
        draft.assignSession(sessionId); Material item=materials.save(draft);
        audit.record(actorId,"material.create","material",item.getId(),null,Map.of("title",title,"type",TYPES.get(ext),"class_id",classId,"size_bytes",file.getSize()));
        notifyStudents(clazz,item); return mapper.toView(item);
    }
    @Transactional(readOnly=true) public Material download(Long id, Long userId, boolean privileged) {
        Material m=material(id); checkAccess(clazz(m.getClassId()),userId,privileged);
        if(m.getType().equals("link")) throw invalid("Học liệu dạng liên kết không có tệp để tải");
        Path base=root.resolve("materials").normalize(); Path target=root.resolve(m.getFilePath()).normalize();
        if(!target.startsWith(base) || !Files.isRegularFile(target)) throw new LmsException("NOT_FOUND","Không tìm thấy tệp học liệu",HttpStatus.NOT_FOUND,null);
        return m;
    }
    public Path resolveDownloadPath(Material material) { return root.resolve(material.getFilePath()).normalize(); }
    /** sessionSet=true: gán `sessionId` (null = gỡ khỏi buổi); false: giữ nguyên. */
    @Transactional public Item update(Long id, Long actorId, String title, String description, boolean sessionSet, Long sessionId) {
        Material m=material(id); checkOwner(clazz(m.getClassId()),actorId);
        if(title!=null && (title.isBlank() || title.length()>200)) throw invalid("Tiêu đề không hợp lệ");
        if(sessionSet) checkSession(m.getClassId(), sessionId);
        Map<String,Object> old=mapper.toAuditValue(m); m.update(title,description); if(sessionSet) m.assignSession(sessionId);
        Map<String,Object> next=mapper.toAuditValue(m);
        audit.record(actorId,"material.update","material",id,old,next); return mapper.toView(m);
    }
    @Transactional public void delete(Long id, Long actorId) {
        Material m=material(id); checkOwner(clazz(m.getClassId()),actorId); materials.delete(m);
        audit.record(actorId,"material.delete","material",id,Map.of("title",m.getTitle(),"type",m.getType()),null);
        if(m.getFilePath()!=null && !m.getType().equals("link")) {
            Path file=root.resolve(m.getFilePath()).normalize();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { try { Files.deleteIfExists(file); } catch(Exception ignored) { } }
            });
        }
    }
    private void notifyStudents(LmsClass clazz, Material m) {
        for(Enrollment e:enrollments.findAllByLmsClass_IdAndStatusOrderByStudent_Id(clazz.getId(),EnrollmentStatus.active))
            notifications.create(e.getStudent().getId(),"material.created","Học liệu mới: "+m.getTitle(),m.getDescription(),Map.of("material_id",m.getId(),"class_id",clazz.getId()));
    }
    private void checkAccess(LmsClass c, Long userId, boolean privileged) {
        if (!privileged && c.getStatus() == ClassStatus.locked) throw new LmsException("CLASS_LOCKED","Lớp học đang bị khóa",HttpStatus.FORBIDDEN,null);
        if(privileged || c.getLecturerId().equals(userId) || enrollments.existsByLmsClass_IdAndStudent_IdAndStatus(c.getId(),userId,EnrollmentStatus.active)) return;
        throw new LmsException("ENROLLMENT_REQUIRED","Bạn chưa tham gia lớp học",HttpStatus.FORBIDDEN,null);
    }
    private void checkSession(Long classId, Long sessionId) {
        if(sessionId==null) return;
        ClassSession s=sessions.findById(sessionId).orElseThrow(()->invalid("Không tìm thấy buổi học"));
        if(!s.getClassId().equals(classId)) throw invalid("Buổi học không thuộc lớp này");
    }
    private void checkOwner(LmsClass c, Long actorId) { if(!c.getLecturerId().equals(actorId)) throw new LmsException("FORBIDDEN","Chỉ giảng viên phụ trách lớp mới được quản lý học liệu",HttpStatus.FORBIDDEN,null); }
    private LmsClass clazz(Long id) { return classes.findById(id).orElseThrow(()->new LmsException("NOT_FOUND","Không tìm thấy lớp học",HttpStatus.NOT_FOUND,null)); }
    private Material material(Long id) { return materials.findById(id).orElseThrow(()->new LmsException("NOT_FOUND","Không tìm thấy học liệu",HttpStatus.NOT_FOUND,null)); }
    private User user(Long id) { return users.findById(id).orElseThrow(()->new LmsException("NOT_FOUND","Không tìm thấy người dùng",HttpStatus.NOT_FOUND,null)); }
    private static LmsException invalid(String message) { return new LmsException("VALIDATION_ERROR",message,HttpStatus.BAD_REQUEST,null); }
}
