FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S lms && adduser -S worker -G lms
COPY --from=build /workspace/target/lms-worker-1.0.0-SNAPSHOT.jar app.jar
USER worker
ENTRYPOINT ["java", "-jar", "app.jar"]
