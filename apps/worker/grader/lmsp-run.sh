#!/bin/sh
# Chạy một test trong sandbox: lmsp-run <giới hạn ms> <lệnh> [tham số...]
# - Trước và sau khi chạy: giết mọi tiến trình còn sót (trừ PID 1) và dọn /tmp.
# - stdout: stdout của chương trình (worker giới hạn 64 KiB → OLE).
# - stderr: tối đa 4 KiB stderr của chương trình, rồi dòng cuối
#   "LMSP <exit> <ms> <số lần oom_kill tăng> <memory_error 0|1>" để worker phân loại verdict.
limit_ms=$1
shift

clean() {
    kill -9 -1 2>/dev/null
    rm -rf /tmp/* /tmp/.[!.]* /tmp/..?* 2>/dev/null
}

oom_kills() {
    for file in /sys/fs/cgroup/memory.events /sys/fs/cgroup/memory/memory.oom_control; do
        if [ -r "$file" ]; then
            awk '$1 == "oom_kill" { print $2; found = 1; exit } END { if (!found) print 0 }' "$file"
            return
        fi
    done
    echo 0
}

clean
errfile=/tmp/.lmsp-stderr
seconds="$((limit_ms / 1000)).$(printf '%03d' $((limit_ms % 1000)))"
before=$(oom_kills)
start=$(date +%s%N)
/usr/bin/timeout --signal=KILL "${seconds}s" "$@" 2>"$errfile"
code=$?
end=$(date +%s%N)
kill -9 -1 2>/dev/null
after=$(oom_kills)

memory_error=0
if grep -Eq 'java\.lang\.OutOfMemoryError|^MemoryError' "$errfile" 2>/dev/null; then memory_error=1; fi
head -c 4096 "$errfile" >&2 2>/dev/null
rm -rf /tmp/* /tmp/.[!.]* /tmp/..?* 2>/dev/null
printf '\nLMSP %s %s %s %s\n' "$code" "$(( (end - start) / 1000000 ))" "$(( ${after:-0} - ${before:-0} ))" \
    "$memory_error" >&2
