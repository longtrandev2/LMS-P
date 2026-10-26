FROM alpine:3.21
RUN apk add --no-cache python3 gcc g++ musl-dev openjdk21-jdk coreutils \
    && adduser -D -H -u 10001 grader \
    && mkdir -p /work /tmp \
    && chown -R grader:grader /work /tmp \
    && chmod 755 /work
USER 10001:10001
WORKDIR /work
CMD ["sleep", "infinity"]
