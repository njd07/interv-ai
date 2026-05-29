# Spring Boot — Interview Knowledge Base

## Core Topics
Spring IoC container, Dependency Injection (constructor vs field vs setter — constructor preferred for immutability and testability), Bean scopes (singleton, prototype, request, session), Bean lifecycle (instantiation → populate properties → BeanNameAware/BeanFactoryAware → BeanPostProcessor.before → @PostConstruct → InitializingBean.afterPropertiesSet → init-method → READY → @PreDestroy → DisposableBean.destroy), Stereotype annotations (@Component, @Service, @Repository, @Controller, @RestController), Spring MVC DispatcherServlet flow, REST API design (status codes 2xx/4xx/5xx, pagination with offset vs cursor, versioning via URI/header), Spring Data JPA / Hibernate (N+1 problem, FetchType.LAZY vs EAGER, @EntityGraph, JOIN FETCH, JPQL vs Criteria vs native), Spring Security (filter chain order, JWT auth flow, SecurityContextHolder), Actuator endpoints, Profiles (@Profile, spring.profiles.active), Exception handling (@ControllerAdvice, @ExceptionHandler), @Transactional propagation (REQUIRED, REQUIRES_NEW, NESTED, SUPPORTS, NEVER, MANDATORY) and isolation, Docker containerization, PostgreSQL + HikariCP connection pooling, AOP (@Aspect, @Around).

## Interview Questions & Ideal Answers

### Q1. Constructor vs field injection — which and why?
Constructor injection: fields can be `final`, dependencies are explicit and required, easy to write unit tests with `new MyService(mockDep)`, no need for reflection. Field injection is concise but hides dependencies, prevents immutability, and forces tests to use reflection or Spring context. Modern Spring favors constructor; with a single constructor `@Autowired` is implicit.

### Q2. N+1 query problem in Hibernate — explain and two fixes
N+1: loading a list of N parents then lazily fetching each child triggers N additional queries. Fix 1: `JOIN FETCH` in JPQL — `SELECT p FROM Post p JOIN FETCH p.comments`. Fix 2: `@EntityGraph(attributePaths="comments")` on the repository method. Fix 3: `@BatchSize(size=20)` on the collection to batch lazy loads.

### Q3. Spring Security JWT filter chain — walk through it
1. Request hits Spring's DelegatingFilterProxy → FilterChainProxy. 2. SecurityContextPersistenceFilter loads any existing context. 3. Custom `JwtAuthenticationFilter` (extends OncePerRequestFilter) reads `Authorization: Bearer <token>`, validates signature/expiry, builds `UsernamePasswordAuthenticationToken`, sets it on SecurityContextHolder. 4. ExceptionTranslationFilter catches AuthenticationException → 401. 5. FilterSecurityInterceptor checks AccessDecisionManager against URL/method rules. 6. Controller runs.

### Q4. @Transactional(propagation = REQUIRES_NEW) — when to use it?
Suspends the current transaction and starts a new independent one. Use when an inner operation must commit/rollback independently — e.g. audit log writes that should persist even if the parent business transaction rolls back. Beware: deadlocks if both tx touch same rows; pooled connection exhaustion since two connections are held.

### Q5. Difference between @Component, @Service, @Repository, @Controller?
All are @Component specializations; functionally equivalent for DI. Semantic meaning matters: @Service for business logic, @Repository for persistence (adds automatic JPA exception translation to DataAccessException), @Controller/@RestController for web layer. @RestController = @Controller + @ResponseBody.

### Q6. Bean lifecycle in Spring
Instantiation (constructor) → property population (DI) → Aware-interface callbacks → BeanPostProcessor.postProcessBeforeInitialization → @PostConstruct → InitializingBean.afterPropertiesSet → custom init-method → BPP.postProcessAfterInitialization → in use. On shutdown: @PreDestroy → DisposableBean.destroy → custom destroy-method.

### Q7. Bean scopes — singleton vs prototype gotcha
Singleton (default) = one instance per container. Prototype = new each `getBean`. Gotcha: injecting prototype into singleton — only one prototype instance is created (at singleton wiring time). Fix with `@Lookup`, `ObjectFactory<T>`, or `Provider<T>` to get a fresh instance per call.

### Q8. Optimistic vs pessimistic locking in JPA
Optimistic: add `@Version` column; on update Hibernate appends `WHERE version = ?` and increments — concurrent edit throws `OptimisticLockException`. Pessimistic: `entityManager.lock(entity, LockModeType.PESSIMISTIC_WRITE)` issues `SELECT ... FOR UPDATE`. Optimistic = high read concurrency, low contention. Pessimistic = critical sections, accept blocking.

### Q9. How do you build a Docker image for a Spring Boot app?
Multi-stage Dockerfile. Stage 1: maven:3.9-eclipse-temurin-17 → `mvn package -DskipTests`. Stage 2: eclipse-temurin:17-jre-alpine → `COPY --from=builder /app/target/*.jar app.jar` → `ENTRYPOINT ["java","-jar","app.jar"]`. Use Spring Boot's layered jars (`bootBuildImage` or `--layers`) so dependency layer caches separately from code layer.

### Q10. HikariCP — what is it and key tuning knobs?
HikariCP is Spring Boot's default JDBC connection pool — fastest, low-overhead. Key props: `maximumPoolSize` (rule of thumb: cores * 2 for OLTP), `minimumIdle` (often = max for steady load), `connectionTimeout` (30s default), `idleTimeout`, `maxLifetime` (less than DB-side timeout to avoid stale connections), `leakDetectionThreshold` for debugging.

### Q11. @ControllerAdvice — what and why
Cross-cutting controller behavior. Holds @ExceptionHandler methods to centralize error→ResponseEntity mapping (e.g. `MethodArgumentNotValidException` → 400 with field errors), @InitBinder for binding rules, @ModelAttribute for shared model data. Avoids try/catch in every controller and gives consistent error JSON shape.

### Q12. REST API versioning — options and tradeoffs
URI: `/api/v1/users` — most explicit, easy to cache, breaks REST purity. Header: `Accept: application/vnd.app.v1+json` — clean URLs, harder to test from a browser. Query param: `?version=1` — flexible but pollutes URL. Most production APIs use URI versioning for clarity.

### Q13. CSRF in REST APIs — needed?
For stateful sessions (cookies) yes — attackers can forge requests. For pure token-based REST APIs (Authorization header), CSRF is unnecessary because the browser doesn't auto-attach the bearer. Disable with `http.csrf(csrf -> csrf.disable())` and use JWT or OAuth2 access tokens.

### Q14. Spring Boot Actuator — what would you enable in prod?
`/health` (always), `/info` (build/version), `/metrics` and `/prometheus` for monitoring scrape, `/loggers` to change log levels at runtime. Restrict via `management.endpoints.web.exposure.include` and put behind separate port/auth (`management.server.port`). Don't expose `/env`, `/heapdump`, `/threaddump` publicly.

### Q15. How does Spring MVC dispatch a request?
1. HTTP request → DispatcherServlet (front controller). 2. HandlerMapping resolves URL → handler (controller method). 3. HandlerAdapter invokes it; arguments resolved via ArgumentResolvers (@PathVariable, @RequestBody using MessageConverters). 4. Controller returns a value; HandlerExceptionResolver catches exceptions. 5. ReturnValueHandler converts result (e.g. JSON via Jackson). 6. ViewResolver if returning a view name. 7. Response written.

### Q16. What is Spring AOP and how does @Around work?
Aspect-Oriented Programming separates cross-cutting concerns (logging, security, transactions). @Aspect class with @Around advice wraps target method execution. ProceedingJoinPoint.proceed() calls the actual method. You can add logic before/after, modify return value, or swallow exceptions. Spring uses JDK dynamic proxies (for interfaces) or CGLIB (for classes).

### Q17. What is Spring Boot auto-configuration?
Spring Boot scans classpath and automatically configures beans based on dependencies present. Uses @Conditional annotations (@ConditionalOnClass, @ConditionalOnMissingBean, etc.). Defined in META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports. Override by defining your own bean of the same type. Use `--debug` or actuator `/conditions` to see what was auto-configured.

### Q18. Explain @Async and its gotchas
@Async makes a method execute in a separate thread (from a TaskExecutor pool). Requires @EnableAsync on config class. Gotchas: (1) self-invocation doesn't work — calling @Async method from same class bypasses proxy; (2) return type must be void or Future/CompletableFuture; (3) exceptions in void methods are lost unless you configure AsyncUncaughtExceptionHandler; (4) configure a proper ThreadPoolTaskExecutor, don't rely on SimpleAsyncTaskExecutor.

### Q19. How does @Cacheable work in Spring?
Method result is cached by key (default: method params). On subsequent calls with same key, returns cached value without executing method. Requires @EnableCaching and a CacheManager bean (EhCache, Redis, Caffeine). Use @CacheEvict to remove entries, @CachePut to always execute and update cache. Beware: self-invocation bypasses proxy (same as @Async/@Transactional).

### Q20. Explain Spring Profiles and externalized configuration
Profiles activate environment-specific beans/config. Set via `spring.profiles.active=dev`. Config resolution order (highest priority first): command-line args → system properties → env vars → application-{profile}.yml → application.yml → @PropertySource. Use @Profile("dev") on beans, @ConditionalOnProperty for feature flags.

### Q21. What is the difference between JPA, Hibernate, and Spring Data JPA?
JPA = specification (javax.persistence API). Hibernate = an implementation of JPA (the ORM engine). Spring Data JPA = abstraction on top that provides repository interfaces with auto-implemented CRUD, query derivation from method names, @Query for custom JPQL, Specification API for dynamic queries. Spring Boot auto-configures Hibernate as the JPA provider.

### Q22. Explain pagination in Spring Data JPA
Use `Pageable` parameter in repository methods: `Page<User> findByActive(boolean active, Pageable pageable)`. Create with `PageRequest.of(page, size, Sort.by("name"))`. Returns Page with content, total elements, total pages. Offset-based. For cursor-based: use `Slice<T>` (no count query) or keyset pagination with WHERE id > lastId ORDER BY id LIMIT n.

### Q23. How do you handle validation in Spring Boot?
Add spring-boot-starter-validation. Use Jakarta Bean Validation annotations on DTOs: @NotNull, @Size, @Email, @Min, @Max, @Pattern. Add @Valid or @Validated on controller parameter. Validation errors throw MethodArgumentNotValidException → handle in @ControllerAdvice to return structured 400 response with field-level errors.

### Q24. What is the difference between @RequestParam, @PathVariable, and @RequestBody?
@RequestParam: query params (?key=val). @PathVariable: URL path segments (/users/{id}). @RequestBody: deserializes request body (JSON → POJO via Jackson). @RequestParam is optional by default (use required=true). @PathVariable is always required. @RequestBody uses HttpMessageConverter and triggers validation with @Valid.

### Q25. Explain Spring Boot's embedded server and how to switch to Undertow
Spring Boot embeds Tomcat by default (no WAR deployment needed). To switch: exclude spring-boot-starter-tomcat, add spring-boot-starter-undertow. Undertow is non-blocking, better for high-concurrency. Configure via `server.port`, `server.tomcat.threads.max`, `server.servlet.context-path`. For reactive apps, use Netty with spring-boot-starter-webflux.

### Q26. What are Spring Boot Starters?
Curated dependency descriptors that pull in all needed libraries. `spring-boot-starter-web` includes Tomcat, Spring MVC, Jackson. `spring-boot-starter-data-jpa` includes Hibernate, Spring Data JPA, HikariCP. `spring-boot-starter-security` includes Spring Security, filter chain. Starters follow convention-over-configuration — auto-config sets sane defaults.

### Q27. Explain the role of application.yml vs application.properties
Both serve the same purpose (externalized config). YAML supports hierarchical structure, lists, and multi-document (---). Properties is flat key=value. YAML is more readable for complex configs. Both support profile-specific files: application-dev.yml, application-prod.yml. Spring processes them with the same ConfigurationPropertySources.

### Q28. How does Spring handle circular dependencies?
Default (constructor injection): fails with BeanCurrentlyInCreationException — this is a design smell. Spring can resolve field/setter injection circular deps using a three-level cache (singletonObjects, earlySingletonObjects, singletonFactories) — injects a proxy/early reference. Best fix: refactor to break the cycle, extract shared logic into a third bean.

### Q29. What is @ConditionalOnProperty and when to use it?
Feature flag for beans. `@ConditionalOnProperty(name="feature.x.enabled", havingValue="true")` — bean only created when property matches. Useful for toggling features per environment, A/B testing backends, disabling components in tests. Combine with profiles for complex activation logic.

### Q30. Explain distributed tracing with Spring Boot (Micrometer + Zipkin)
Spring Boot 3 uses Micrometer Tracing (replaces Sleuth). Auto-instruments HTTP calls, message listeners, scheduled tasks with trace-id/span-id. Propagates via W3C Trace Context headers. Export traces to Zipkin/Jaeger/OTLP. Add spring-boot-starter-actuator + micrometer-tracing-bridge-brave + zipkin-reporter-brave. Visualize request flow across microservices.

## Grading Rubric (5 criteria, score each 0-10)
1. **Framework depth** — Beyond annotation names, does the candidate understand what happens at runtime?
2. **Real-world applicability** — Do answers reference production concerns (logging, monitoring, deployment)?
3. **Security awareness** — JWT validation, SQL injection, CSRF, secrets management, password hashing.
4. **Database optimization knowledge** — N+1, indexes, transaction boundaries, connection pooling.
5. **Deployment understanding** — Docker, profiles, externalized config, observability.
