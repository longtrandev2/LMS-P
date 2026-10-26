FROM alpine:3.21
# Ngôn ngữ chấm (docs/assessment-spec.md §4): Python 3.12, gcc C17, g++ C++20, Java 21.
RUN apk add --no-cache python3 gcc g++ musl-dev openjdk21-jdk coreutils \
    && python3 -c 'import sys; assert sys.version_info[:2] == (3, 12), sys.version' \
    && java -version 2>&1 | grep -q 'version "21' \
    && printf 'int main(void){return 0;}\n' | gcc -std=c17 -O2 -x c -o /dev/null - \
    && printf '#include <ranges>\nint main(){return 0;}\n' | g++ -std=c++20 -O2 -x c++ -o /dev/null - \
    && adduser -D -H -u 10001 grader \
    && mkdir -p /work /tmp \
    && chown -R grader:grader /work /tmp \
    && chmod 755 /work
COPY lmsp-run.sh /usr/local/bin/lmsp-run
RUN sed -i 's/\r$//' /usr/local/bin/lmsp-run && chmod 755 /usr/local/bin/lmsp-run
USER 10001:10001
WORKDIR /work
CMD ["sleep", "infinity"]
