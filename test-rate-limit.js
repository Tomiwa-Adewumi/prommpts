// Simple test to verify rate limiting works
const { checkRateLimit, RATE_LIMITS } = require('./src/lib/rate-limit.ts');

console.log('Testing Rate Limiter...\n');

// Test 1: Check initial request is allowed
const testUserId = 'test-user-123';
const config = RATE_LIMITS.prompt.free; // 10 requests per hour

console.log(`Test 1: Initial request for user ${testUserId}`);
let result = checkRateLimit({
    type: 'prompt',
    identifier: testUserId,
    limit: config.limit,
    windowMs: config.windowMs
});
console.log(`Allowed: ${result.allowed}, Remaining: ${result.remaining}/${config.limit}`);

// Test 2: Exhaust rate limit
console.log('\nTest 2: Exhausting rate limit...');
for (let i = 1; i < config.limit; i++) {
    result = checkRateLimit({
        type: 'prompt',
        identifier: testUserId,
        limit: config.limit,
        windowMs: config.windowMs
    });
    console.log(`Request ${i + 1}: Allowed: ${result.allowed}, Remaining: ${result.remaining}`);
}

// Test 3: Try one more request (should be blocked)
console.log('\nTest 3: Request after limit exhausted');
result = checkRateLimit({
    type: 'prompt',
    identifier: testUserId,
    limit: config.limit,
    windowMs: config.windowMs
});
console.log(`Allowed: ${result.allowed}, Remaining: ${result.remaining}`);
console.log(`Reset time: ${new Date(result.resetTime).toLocaleTimeString()}`);

// Test 4: Different user should be allowed
const testUserId2 = 'test-user-456';
console.log(`\nTest 4: Different user ${testUserId2}`);
result = checkRateLimit({
    type: 'prompt',
    identifier: testUserId2,
    limit: config.limit,
    windowMs: config.windowMs
});
console.log(`Allowed: ${result.allowed}, Remaining: ${result.remaining}/${config.limit}`);

console.log('\n✅ Rate limiting tests completed');