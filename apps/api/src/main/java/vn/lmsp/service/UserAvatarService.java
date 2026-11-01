package vn.lmsp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import vn.lmsp.common.LmsException;
import vn.lmsp.dto.UserSummary;
import vn.lmsp.mapper.UserMapper;
import vn.lmsp.model.User;
import vn.lmsp.repository.UserRepository;
import java.nio.file.*;
import java.util.Map;
import java.util.UUID;

@Service
public class UserAvatarService {
    public record AvatarFile(Path path,String contentType) { }
    private record ImageType(String extension,String contentType) { }
    private final UserMapper mapper;
    private final UserRepository users; private final AuditService audit; private final Path root;
    public UserAvatarService(UserRepository users,AuditService audit,UserMapper mapper,@Value("${lms.storage-dir:./storage}") String root) {
        this.users=users; this.audit=audit; this.mapper=mapper; this.root=Path.of(root).toAbsolutePath().normalize();
    }
    @Transactional public UserSummary upload(Long userId,MultipartFile upload) {
        if(upload==null || upload.isEmpty() || upload.getSize()>2*1024*1024) throw invalid("Ảnh đại diện phải có dung lượng tối đa 2MB");
        try {
            byte[] bytes=upload.getBytes(); ImageType type=imageType(bytes);
            if(type==null) throw invalid("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP");
            User user=user(userId); String old=user.getAvatarPath();
            String relative="avatars/"+userId+"-"+UUID.randomUUID()+type.extension(); Path target=root.resolve(relative).normalize();
            if(!target.startsWith(root.resolve("avatars").normalize())) throw invalid("Đường dẫn ảnh không hợp lệ");
            Files.createDirectories(target.getParent()); Files.write(target,bytes,StandardOpenOption.CREATE_NEW);
            user.setAvatarPath(relative); users.flush();
            audit.record(userId,"user.avatar.update","user",userId,null,Map.of("avatar_path",relative));
            deleteAfterCommit(old); return mapper.toSummary(user);
        } catch(LmsException error) { throw error; }
        catch(Exception error) { throw new LmsException("STORAGE_ERROR","Không thể lưu ảnh đại diện",HttpStatus.INTERNAL_SERVER_ERROR,null); }
    }
    @Transactional public UserSummary delete(Long userId) {
        User user=user(userId); String old=user.getAvatarPath();
        if(old!=null) { user.setAvatarPath(null); users.flush(); audit.record(userId,"user.avatar.delete","user",userId,Map.of("avatar_path",old),null); deleteAfterCommit(old); }
        return mapper.toSummary(user);
    }
    @Transactional(readOnly=true) public AvatarFile get(Long userId) {
        String relative=user(userId).getAvatarPath();
        if(relative==null) throw new LmsException("NOT_FOUND","Người dùng chưa có ảnh đại diện",HttpStatus.NOT_FOUND,null);
        Path avatars=root.resolve("avatars").normalize(); Path file=root.resolve(relative).normalize();
        if(!file.startsWith(avatars) || !Files.isRegularFile(file)) throw new LmsException("NOT_FOUND","Không tìm thấy ảnh đại diện",HttpStatus.NOT_FOUND,null);
        String name=file.getFileName().toString(); String contentType=name.endsWith(".png")?"image/png":name.endsWith(".webp")?"image/webp":"image/jpeg";
        return new AvatarFile(file,contentType);
    }
    private User user(Long id) { return users.findById(id).orElseThrow(()->new LmsException("NOT_FOUND","Không tìm thấy người dùng",HttpStatus.NOT_FOUND,null)); }
    private void deleteAfterCommit(String relative) {
        if(relative==null) return; Path old=root.resolve(relative).normalize();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { try { if(old.startsWith(root.resolve("avatars").normalize())) Files.deleteIfExists(old); } catch(Exception ignored) { } }
        });
    }
    private static ImageType imageType(byte[] b) {
        if(b.length>=3 && (b[0]&255)==255 && (b[1]&255)==216 && (b[2]&255)==255) return new ImageType(".jpg","image/jpeg");
        if(b.length>=8 && (b[0]&255)==137 && b[1]=='P' && b[2]=='N' && b[3]=='G') return new ImageType(".png","image/png");
        if(b.length>=12 && new String(b,0,4).equals("RIFF") && new String(b,8,4).equals("WEBP")) return new ImageType(".webp","image/webp");
        return null;
    }
    private static LmsException invalid(String message) { return new LmsException("VALIDATION_ERROR",message,HttpStatus.BAD_REQUEST,null); }
}
