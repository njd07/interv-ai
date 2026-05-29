# Low-Level Design & OOP — Interview Knowledge Base

## Core Topics
SOLID — **S**ingle Responsibility (one reason to change), **O**pen/Closed (extend without modifying), **L**iskov Substitution (subtypes substitutable for base), **I**nterface Segregation (small focused interfaces), **D**ependency Inversion (depend on abstractions). Design Patterns — Creational: Singleton, Factory, Abstract Factory, Builder, Prototype. Structural: Adapter, Decorator, Facade, Proxy, Composite, Bridge, Flyweight. Behavioral: Observer, Strategy, Command, Iterator, State, Template Method, Chain of Responsibility, Mediator, Visitor, Memento. Composition over inheritance, UML class diagrams (association, aggregation, composition, inheritance, dependency), Interface segregation in practice (multiple narrow interfaces vs one fat), Manual dependency injection, GRASP, Law of Demeter, DRY/KISS/YAGNI.

## Interview Questions & Ideal Answers

### Q1. Design a parking lot
Entities: `ParkingLot`, `Floor`, `Spot` (interface) with subtypes `CompactSpot`, `LargeSpot`, `BikeSpot`, `HandicapSpot`. `Vehicle` (abstract) → `Car`, `Bike`, `Truck`. `Ticket` (id, entryTime, spotRef). `Payment` (interface) → `CashPayment`, `CardPayment`. Spot allocation = Strategy pattern. Concurrency: synchronize per floor or use atomic CAS on spot state.

### Q2. Implement Observer pattern (notification system)
`interface NotificationChannel { send(User u, String msg); }` with `EmailChannel`, `SmsChannel`, `PushChannel`. `NotificationCenter` keeps `Map<EventType, List<Subscriber>>`. On publish, iterate subscribers, route via preferred channel. Decouples publisher from delivery, satisfies OCP.

### Q3. Refactor a God class violating SRP
Identify reasons-to-change: e.g. `OrderManager` does pricing + inventory + email + DB. Split: `PricingService`, `InventoryService`, `EmailService`, `OrderRepository`. `OrderManager` becomes orchestrator depending on interfaces (DIP). Easier to test and evolve.

### Q4. Composition vs inheritance — when to use which?
Inheritance: "is-a" with stable hierarchy and Liskov substitutability. Composition: "has-a" — flexible, runtime swappable, no fragile-base-class problem. Modern preference: composition + interfaces. Example: inject `FlyBehavior` strategy instead of extending Duck.

### Q5. Strategy pattern — when to use it?
Family of interchangeable algorithms selected at runtime. E.g. `PaymentStrategy { pay(amount); }` with CreditCard, PayPal, UPI. Replaces if/else ladders. Satisfies OCP, avoids subclass explosion.

### Q6. Singleton — implement correctly in Java
Best: enum singleton — thread-safe, serialization-safe, reflection-safe. Classic: double-checked locking with volatile. Avoid singletons where DI/container scope works — they hurt testability and hide dependencies.

### Q7. Design Splitwise-like expense sharing
`Expense` (paidBy, amount, splitType, participants). `SplitStrategy` (EQUAL, EXACT, PERCENT) — Strategy pattern. `BalanceSheet` per user holds net debts. Settlement: model as graph, run min-cash-flow algorithm.

### Q8. Decorator pattern — example
Adding behavior without subclassing. `interface Coffee { cost(); }` → `SimpleCoffee`. `MilkDecorator` wraps Coffee, delegates and adds cost. Stackable. Used in java.io streams. Satisfies OCP.

### Q9. Design an elevator system
`Elevator` (currentFloor, direction, state, requestQueue). `ElevatorController` (Mediator) routes calls to optimal elevator using scheduling strategy (SCAN/LOOK, nearest-car). State machine per elevator. Thread-safe queues.

### Q10. Factory vs Abstract Factory
Factory Method: subclass decides which concrete product. Abstract Factory: interface for creating families of related products (e.g. `GuiFactory` with `createButton`, `createTextField`; platform-specific implementations). Use Abstract Factory when products must be consistent.

### Q11. Design an LRU Cache (OO model)
`LRUCache<K,V>` with `Map<K, Node>` and `DoublyLinkedList<Node>`. get: move to head, return. put: insert/update at head, evict tail if over capacity. O(1) all ops.

### Q12. State pattern — example
Model behavior that changes with state. `OrderState` interface with cancel/ship/deliver. Implementations: PlacedState, ShippedState, DeliveredState. Order delegates to current state. Replaces switch-on-state with polymorphism; OCP.

### Q13. Interface Segregation in practice
Bad: `Worker { work(); eat(); sleep(); }` forces `RobotWorker` to implement eat/sleep. Good: split into `Workable`, `Eatable`, `Sleepable`. Clients depend only on what they use.

### Q14. Design tic-tac-toe (generic board game)
`Board` (n×n grid), `Player` (name, symbol), `Game` (board, players, status). `WinChecker` (Strategy: pluggable for TTT, Connect4). Game loop: read → validate → place → check → swap. Computer player via `PlayerStrategy { chooseMove(board); }`.

### Q15. Chain of Responsibility — example
Pass request along chain until one handles it. Logger example: ConsoleLogger → FileLogger → EmailLogger. Each handles its level and optionally calls next. Used in middleware, filter chains, approval workflows.

### Q16. Design a library management system
Entities: `Library`, `Book` (ISBN, title, author, copies), `Member` (id, name, type), `BookCopy` (barcode, status), `Loan` (member, bookCopy, issueDate, dueDate, returnDate). `FineCalculator` strategy (per-day, flat, tiered). `SearchService` searches by title/author/ISBN. `ReservationQueue` when all copies lent out. Use Observer to notify when reserved book returned.

### Q17. Design a vending machine using State pattern
States: `IdleState`, `HasMoneyState`, `DispensingState`, `OutOfStockState`. `VendingMachine` context holds currentState, balance, inventory. Each state handles insertCoin, selectProduct, dispense, cancel differently. Transitions: Idle→HasMoney on coin insert, HasMoney→Dispensing on valid selection, Dispensing→Idle after dispense.

### Q18. Builder pattern — when and how?
When object has many optional parameters (telescoping constructor anti-pattern). `User.builder().name("X").email("Y").age(25).build()`. Builder validates in build(). Immutable result. Used in StringBuilder, OkHttp Request, Protocol Buffers. Better than setters because you get immutability + readability.

### Q19. Proxy pattern — types and examples
Control access to an object. Types: Virtual Proxy (lazy loading — load heavy image only when displayed), Protection Proxy (access control — check permissions before delegating), Remote Proxy (represent remote object locally — RMI/gRPC stub), Caching Proxy (cache results). All implement same interface as real subject.

### Q20. Design a movie ticket booking system
`Movie`, `Theater`, `Screen`, `Show` (movie+screen+time), `Seat` (row, number, type), `Booking` (user, show, seats, payment, status). Seat locking: temporary hold (5-10 min) with TTL in Redis to prevent double-booking during checkout. `PricingStrategy` for different seat types/times. Concurrency: optimistic locking on seat status.

### Q21. Template Method pattern — example
Define algorithm skeleton in base class, let subclasses override specific steps. `abstract class DataParser { final parse() { read(); process(); write(); } }`. Subclasses: `CSVParser`, `JSONParser`, `XMLParser` override read/process/write. Framework controls flow, extensions customize steps. Used in HttpServlet (doGet/doPost), JUnit test lifecycle.

### Q22. Design a file system (OOP model)
Composite pattern: `FileSystemEntry` (interface) with `File` and `Directory`. Directory contains List<FileSystemEntry> — supports nested directories naturally. Operations: `getSize()` (file: return size; directory: sum children), `search(name)`, `display(indent)`. Add `Permission` enum and owner for access control.

### Q23. Explain GRASP principles
General Responsibility Assignment Software Patterns. Key ones: Creator (who creates object? → the one that contains/uses it), Information Expert (assign responsibility to class with most info), Controller (handle system events via a controller object, not UI), Low Coupling, High Cohesion, Polymorphism (use polymorphism instead of type-checking), Pure Fabrication (create a service class when no natural domain object fits).

### Q24. Adapter pattern — when to use?
When you need to make incompatible interfaces work together. `interface MediaPlayer { play(String type, String file); }`. `AdvancedMediaPlayer` has playVlc() and playMp4(). `MediaAdapter implements MediaPlayer` and internally delegates to AdvancedMediaPlayer. Client code works with MediaPlayer interface uniformly. Used when integrating third-party libraries with different APIs.

### Q25. Design a social media post feed (OOP)
`User`, `Post` (text, media, timestamp, author), `Comment`, `Like`, `Feed`. Feed generation: `FeedStrategy` interface — `ChronologicalFeed`, `RankedFeed` (by engagement score). Observer pattern: followers notified on new post. `MediaHandler` strategy for different media types (image, video, link preview). Pagination via cursor.

### Q26. Flyweight pattern — when to use?
Minimize memory by sharing common state. Example: text editor — each character could be an object, but share the glyph (font, size, style) via Flyweight pool. Intrinsic state (shared): character appearance. Extrinsic state (unique): position in document. Factory maintains pool of flyweight objects. Used in String pool in Java, game tile rendering.

### Q27. Design a task management system (like Trello)
Entities: `Board`, `Column` (Todo, InProgress, Done), `Card` (title, description, assignees, labels, dueDate, attachments, comments). `CardState` pattern for workflow transitions. Observer: notify assignees on card updates. Command pattern for undo/redo of card moves. `FilterStrategy` for board views (by assignee, label, due date).

### Q28. Mediator pattern — when to use?
When many objects communicate in complex ways, introduce a mediator to centralize communication. Example: chat room — users don't reference each other, send messages through ChatRoom mediator. Reduces coupling from n*(n-1) to n connections. Used in UI frameworks (dialog mediates button/textfield interactions), air traffic control.

### Q29. Design a hotel booking system
`Hotel`, `Room` (type, price, amenities, floor), `Reservation` (guest, room, checkIn, checkOut, status). `AvailabilityService` checks room-date matrix. `PricingStrategy` (weekday/weekend/seasonal/dynamic). Double-booking prevention: database-level unique constraint on (room_id, date) or optimistic lock. `NotificationService` (Observer) for booking confirmations and reminders.

### Q30. Explain Dependency Inversion Principle with a real example
High-level modules should not depend on low-level modules; both should depend on abstractions. Bad: `OrderService` directly creates `MySQLOrderRepository`. Good: `OrderService` depends on `OrderRepository` interface; `MySQLOrderRepository` implements it. Wire via constructor injection. Benefits: swap implementations (PostgresRepo, MockRepo for tests), compile-time decoupling, testability.

## Grading Rubric (5 criteria, score each 0-10)
1. **OOP correctness** — Proper use of classes, interfaces, abstraction; no procedural-in-OOP.
2. **Pattern identification** — Did they name and correctly apply patterns where natural?
3. **Extensibility of design** — Can you add a new feature without modifying existing code (OCP)?
4. **Code structure** — Layered separation, naming, package organization, no god classes.
5. **Abstraction quality** — Right level of abstraction; not over- or under-engineered; clear contracts.
