package vn.lmsp.service;

import java.time.LocalTime;
import java.util.Map;

/** Bảng tiết học cố định của trường: tiết → giờ bắt đầu, mỗi tiết 45 phút. */
public final class ClassPeriods {
    public static final int MAX_PERIOD = 12;
    private static final Map<Integer, LocalTime> START = Map.ofEntries(
            Map.entry(1, LocalTime.of(7, 0)), Map.entry(2, LocalTime.of(7, 55)), Map.entry(3, LocalTime.of(8, 50)),
            Map.entry(4, LocalTime.of(9, 55)), Map.entry(5, LocalTime.of(10, 50)), Map.entry(6, LocalTime.of(11, 45)),
            Map.entry(7, LocalTime.of(13, 0)), Map.entry(8, LocalTime.of(13, 55)), Map.entry(9, LocalTime.of(14, 50)),
            Map.entry(10, LocalTime.of(15, 45)), Map.entry(11, LocalTime.of(17, 30)), Map.entry(12, LocalTime.of(18, 25)));
    private ClassPeriods() { }
    public static LocalTime start(int period) { return START.get(period); }
    public static LocalTime end(int period) { return START.get(period).plusMinutes(45); }
}
