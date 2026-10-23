FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache curl && addgroup -S lms && adduser -S api -G lms
COPY --from=build /workspace/target/lms-api-1.0.0-SNAPSHOT.jar app.jar
USER api
EXPOSE 8000
ENTRYPOINT ["java", "-jar", "app.jar"]
