# Architecture Decisions

## 1. Slot Race Condition
The system prevents double booking using three layers:
1. PostgreSQL transaction in `confirm-booking`.
2. `pg_advisory_xact_lock` keyed by `(pitchId, date, startTime)` to serialize competing confirms.
3. Partial unique index on confirmed bookings:
   - unique (`pitchId`, `bookingDate`, `startTime`) where `status='confirmed'`.

Result: concurrent booking attempts cannot produce two confirmed rows for the same slot.

## 2. Temporary Reservation (2 minutes)
- `POST /reserve-slot` sets Redis key with NX + EX 120 seconds.
- Key format: `reserve:{pitchId}:{date}:{startTime}` (time encoded safely for key parsing).
- Only one user can hold a slot at a time.
- If not confirmed, TTL expiry auto-releases slot.
- Redis keyspace expiry events publish `slot:released` over Socket.io.

## 3. Scalability for 10,000 concurrent availability checks
- Stateless API instances behind load balancer.
- Horizontal scaling of backend nodes.
- Redis for fast reservation state lookup.
- Socket.io Redis adapter for cross-instance event fan-out.
- PostgreSQL connection pooling and read replicas for high read throughput.
- Dynamic slot generation avoids large slot-table growth.

## 4. Socket.io Scaling Across Multiple Servers
- Use `@socket.io/redis-adapter`.
- Each API instance can emit events; Redis pub/sub broadcasts to all Socket instances.
- Use load balancer with sticky sessions for stable WebSocket connections.
- Clients subscribe to room per `pitchId + date` to reduce broadcast scope.

## Additional Notes
- Booking confirmation is idempotent for retried requests by same user.
- JWT logout is implemented via Redis token blacklist (using token `jti` with TTL).
- Hold ownership is validated at confirmation time.
