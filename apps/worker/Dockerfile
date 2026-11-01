FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,id=lmsp-maven,target=/root/.m2,sharing=locked mvn -B package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache docker-cli
COPY --from=build /workspace/target/lms-worker-1.0.0-SNAPSHOT.jar app.jar
# Docker socket access is deliberately isolated to this trusted worker service.
ENTRYPOINT ["java", "-jar", "app.jar"]
