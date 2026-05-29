# System Design — Interview Knowledge Base

## Core Topics
Horizontal vs vertical scaling, Stateless services + sticky sessions, Load balancers (L4 TCP vs L7 HTTP, round-robin, least-connections, consistent hash), CDN (edge caching, push vs pull), Caching (Redis, Memcached; cache-aside, read-through, write-through, write-behind, TTL, cache stampede, cache eviction LRU/LFU), Databases — SQL (ACID) vs NoSQL (BASE), Sharding strategies (range, hash, geo, directory), Replication (master-slave, multi-master, async vs sync, replica lag), CAP theorem (pick 2 — most systems are AP or CP), PACELC, Consistent hashing (ring + virtual nodes for rebalance), Message queues (Kafka — partitioned append-only log, exactly-once via idempotent producer + transactional consumer; RabbitMQ — exchange/queue/binding, push model), Rate limiting (token bucket, leaky bucket, sliding window, fixed window with sketch), API Gateway (auth, rate-limit, routing, request transformation), Microservices vs Monolith (network cost, deployment independence, observability complexity), Event-driven and CQRS, Service discovery (client-side via Eureka vs server-side via Consul/k8s DNS), Circuit breaker (Hystrix/Resilience4j states: closed→open→half-open), Bulkhead, Retry with exponential backoff + jitter, Idempotency keys.

## Interview Questions & Ideal Answers

### Q1. Design a URL shortener (TinyURL)
Functional: long→short, short→long redirect, custom alias optional. Scale: 100M URLs/day → ~1200 writes/s, 10× reads. Short code: base62 of a 64-bit counter (Snowflake-style ID). Storage: NoSQL (Cassandra/DynamoDB) sharded by short_code hash. Read path: edge CDN + Redis cache (LRU, hot URLs); cache hit ratio >95%. Redirect with HTTP 301 (permanent) or 302 (tracks clicks). Analytics async via Kafka.

### Q2. Design Twitter home timeline
Two strategies. Fan-out on write (push): when user tweets, copy tweet ID to each follower's timeline in Redis. Cheap reads, expensive writes for celebrities. Fan-out on read (pull): at read time, fetch latest from each followee and merge. Hybrid: push for normal users, pull for celebrities; merge at read time.

### Q3. Distributed rate limiter across 50 API nodes
Centralized Redis with Lua script implementing token bucket atomically: GET current tokens, refill, deduct 1, SET. Lua ensures atomicity. For higher scale, partition by user-id hash across Redis nodes. Alternative: local sliding-window counters synced via gossip — eventually consistent but fast.

### Q4. CAP theorem in practice
Under network partition you choose Consistency or Availability. CP example: banking ledger refuses writes on partition (HBase). AP example: shopping cart accepts writes both sides, reconciles later (DynamoDB, Cassandra). PACELC extends: Else when no partition, Latency vs Consistency tradeoff.

### Q5. Consistent hashing — why and how
Naïve hash-mod-N rehashes ~all keys when N changes. Consistent hashing maps servers and keys onto a ring. Each key goes to next server clockwise. Adding/removing a server only moves ~K/N keys. Virtual nodes (100+ per server) smooth load distribution.

### Q6. Kafka vs RabbitMQ — when to pick which?
Kafka: distributed append-only log, partitioned, retention by time/size, consumers track offsets — built for high-throughput event streaming and replay. RabbitMQ: traditional broker, push model, complex routing, per-message ack. Pick Kafka for event streams (millions msg/s, replayable). Pick RabbitMQ for task distribution and RPC.

### Q7. Database sharding — strategies and pitfalls
Range (id ranges per shard): simple, hot-shard risk. Hash (hash(id) % N): even distribution, resharding painful. Geo: locality wins. Directory (lookup service): flexible, SPOF. Pitfalls: cross-shard joins, distributed transactions, rebalance cost, hot keys.

### Q8. Design a chat application (1-on-1 + group)
WebSocket via API Gateway → connection-manager tracking user→connection in Redis. Message flow: client → gateway → message service → write to Cassandra (partition by chat_id) → Kafka → fan-out to recipients' sockets or push notification. End-to-end encryption via Signal protocol.

### Q9. Cache invalidation strategies
TTL-only — simplest, accepts staleness. Write-through — write to DB and cache atomically; consistent but slower. Write-behind — write to cache, async to DB; fastest, can lose data. Cache-aside (most common) — read: cache miss → DB → set cache; write: delete cache entry. Use stampede protection: probabilistic early refresh or request coalescing.

### Q10. Idempotency in payment systems
Client generates unique Idempotency-Key UUID per operation. Server stores key→response in Redis with TTL (24h). On retry with same key, return cached response without re-charging. Combine with at-least-once delivery for safe payment webhook processing.

### Q11. Circuit breaker pattern
Wraps remote calls. States: CLOSED (calls pass, count failures), OPEN (fail-fast for cooldown), HALF-OPEN (allow probe; success → CLOSED, failure → OPEN). Prevents cascading failure. Configure thresholds (e.g. open after 50% errors in 20 calls). Combine with bulkheads and timeouts.

### Q12. Design a notification system
Producers → Kafka topic per channel (email/SMS/push). Per-channel worker reads topic, checks user prefs, dedupes via Redis, throttles per user, calls vendor (SendGrid/Twilio/FCM) with retry. Persist delivery status. User preferences control opt-in/out, quiet hours, batching.

### Q13. ACID vs BASE
ACID (RDBMS): Atomic, Consistent, Isolated, Durable — per-transaction guarantees. BASE (NoSQL): Basically Available, Soft state, Eventually consistent — sacrifices immediate consistency for partition tolerance and throughput. Real systems mix: SQL for financial data, NoSQL for activity feeds.

### Q14. How would you scale reads on a relational DB?
1. Read replicas (async replication) — route writes to primary, reads to replicas. 2. Caching layer (Redis). 3. Materialized views for expensive aggregates. 4. Query optimization: indexes, EXPLAIN, denormalization. 5. Sharding when single primary saturates.

### Q15. Microservices — when is it the wrong choice?
Wrong when: small team (<15 devs), unclear domain boundaries, low traffic, tight cross-service transactions. Monolith first, extract services when scaling pain or team-autonomy pain emerges. Cost: network latency, distributed tracing, deployment complexity.

### Q16. Design a file storage service (like Google Drive)
Upload: client → API gateway → chunk file (e.g. 4MB chunks) → upload chunks to blob store (S3) with multipart upload → store metadata (file_id, chunks, owner, permissions) in PostgreSQL. Download: serve via CDN with signed URLs. Sync: client maintains local file hash tree, compares with server, uploads/downloads deltas. Use WebSocket for real-time sync notifications.

### Q17. Design a search autocomplete system
Pre-compute top queries by prefix using a Trie stored in Redis/memory. Update Trie from Kafka stream of search logs (aggregate hourly). On keystroke: client sends prefix → API returns top-10 from Trie. For personalization: merge global Trie results with user's recent searches. Use CDN to cache popular prefixes. Debounce client requests (100-200ms).

### Q18. How does a CDN work? When would you NOT use one?
CDN caches content at edge PoPs close to users. Pull CDN: first request goes to origin, edge caches for TTL. Push CDN: you upload to edges proactively. Don't use for: dynamic/personalized content, very small audience (no geographic spread), real-time data (WebSocket), content requiring auth per-request. Use cache-busting (versioned URLs) for updates.

### Q19. Design a web crawler
Seed URLs → Frontier (priority queue, politeness per domain). Worker pool: dequeue URL → DNS resolve → fetch (respect robots.txt, rate limit per domain) → parse HTML → extract links → dedupe (Bloom filter) → add new URLs to Frontier. Store pages in blob store, index metadata in Elasticsearch. Use consistent hashing to partition domains across crawler nodes.

### Q20. Explain event-driven architecture and CQRS
Event-driven: services communicate via events (Kafka/EventBridge) instead of synchronous calls. Loose coupling, better scalability. CQRS (Command Query Responsibility Segregation): separate write model (normalized, handles commands) from read model (denormalized, optimized for queries). Read model updated by consuming events from write side. Eventual consistency.

### Q21. Design a ride-sharing service (like Uber)
Location: drivers send GPS pings → store in Redis GeoSet. Ride request: find nearby drivers via GEORADIUS → dispatch to nearest available. Matching service: consider ETA, driver rating, vehicle type. Trip: track via WebSocket. Pricing: surge based on supply/demand ratio per geo-cell. Store trips in Cassandra. Payment via idempotent charge API.

### Q22. How do you handle distributed transactions?
Options: (1) 2PC (Two-Phase Commit) — coordinator asks all to prepare, then commit. Blocking, slow. (2) Saga pattern — sequence of local transactions with compensating actions on failure. Choreography (events) or orchestration (central coordinator). (3) Outbox pattern — write to business table + outbox table in same DB tx, async publisher reads outbox. Avoid distributed tx when possible.

### Q23. Design an API rate limiter — algorithms comparison
Token Bucket: tokens refill at fixed rate, request takes a token. Allows bursts. Leaky Bucket: fixed output rate, excess queued/dropped. Smooth output. Fixed Window: count per time window, reset at boundary. Edge burst issue. Sliding Window Log: timestamp per request, count in window. Accurate but memory heavy. Sliding Window Counter: hybrid — interpolate between current and previous window counts.

### Q24. What is service mesh and when to use it?
Service mesh (Istio/Linkerd) provides infrastructure-layer capabilities: mTLS between services, traffic management (canary, circuit breaking), observability (distributed tracing, metrics), retries. Sidecar proxy (Envoy) runs alongside each service. Use when: many microservices, need consistent security/observability without changing app code. Overhead: latency, complexity, resource usage.

### Q25. Design a social media news feed
Write path: user posts → write to Posts table + fan-out (push post ID to followers' feed cache in Redis, skip celebrities). Read path: merge cached feed (push model) with pull from followed celebrities. Ranking: ML model scores posts by engagement likelihood. Pagination: cursor-based (last_post_id). Media: store in S3, serve via CDN.

### Q26. Explain database replication — sync vs async
Synchronous: primary waits for replica ACK before committing. Strong consistency, higher latency. Async: primary commits immediately, replica applies later. Lower latency, risk of data loss on primary crash. Semi-sync: wait for at least one replica. Read-your-writes: route reads to primary for the writing user for a few seconds.

### Q27. Design a job scheduler (like cron at scale)
Store jobs in DB (job_id, schedule, handler, next_run, state). Scheduler: poll for due jobs, claim via optimistic lock (UPDATE SET state='RUNNING' WHERE state='PENDING' AND next_run <= now), execute. For scale: partition jobs by hash across scheduler nodes. Use Redis sorted set (score=next_run) for fast due-job lookup. Dead-letter queue for failed jobs. Idempotent handlers.

### Q28. How do you handle hot partitions/keys?
Detect: monitor per-partition metrics. Solutions: (1) add random suffix to hot key to spread across shards (e.g. key_0..key_9), aggregate on read. (2) Local caching for read-hot keys. (3) Rate-limit writes to hot keys. (4) Redesign data model to avoid hot key (e.g. time-bucket instead of single counter). (5) Use DAX/ElastiCache in front of DynamoDB.

### Q29. Design a metrics/monitoring system (like Prometheus)
Pull model: Prometheus scrapes /metrics endpoints from targets at fixed intervals. Store in TSDB (time-series DB) with label-based indexing. Query via PromQL. Alert rules: evaluate expressions, fire alerts to Alertmanager → routes to PagerDuty/Slack. Visualization: Grafana. For scale: remote-write to Thanos/Cortex for long-term storage + cross-cluster queries.

### Q30. Explain load balancing algorithms and when to use each
Round Robin: simple, fair for homogeneous servers. Weighted Round Robin: for heterogeneous capacity. Least Connections: routes to server with fewest active connections — good for varying request durations. IP Hash / Consistent Hash: session affinity without cookies. Random: surprisingly effective at scale. L4 (TCP) vs L7 (HTTP): L7 can route based on URL/headers, do SSL termination, inject headers.

## Grading Rubric (5 criteria, score each 0-10)
1. **Scalability reasoning** — Numbers: QPS, storage, bandwidth, growth projection.
2. **Trade-off articulation** — Did they discuss alternatives and explicitly justify the choice?
3. **Data model design** — Schema, sharding key, indexes, access patterns.
4. **Bottleneck identification** — Where does the system break? How is it monitored?
5. **Real system knowledge** — References to real systems (Kafka, Redis, Cassandra) used appropriately.
