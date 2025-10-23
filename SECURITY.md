# Security Guide

## Overview

Version 2.0 includes comprehensive security features for production deployment. This guide explains each security measure and how to configure them.

## Security Features

### 1. CORS (Cross-Origin Resource Sharing)

**Purpose**: Control which domains can access your API.

**Configuration** (`.env`):

```bash
# Allow specific domains (production)
CORS_ORIGIN=https://myapp.com,https://app.example.com

# Allow all domains (development only)
CORS_ORIGIN=
```

**How it works**:

- If `CORS_ORIGIN` is empty → all origins allowed (dev mode)
- If `CORS_ORIGIN` has values → only listed domains can access API
- Comma-separated for multiple domains
- No credentials/cookies allowed for security

**Example**:

```bash
# Single domain
CORS_ORIGIN=https://myapp.com

# Multiple domains
CORS_ORIGIN=https://myapp.com,https://staging.myapp.com,https://admin.myapp.com
```

**Logs**:

```
[CORS] Allowed origins: https://myapp.com, https://app.example.com
```

---

### 2. Helmet - Security Headers

**Purpose**: Set HTTP headers that protect against common attacks.

**Headers Set**:

- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - Enables XSS filter
- `Strict-Transport-Security` - Forces HTTPS (when enabled)
- `X-Download-Options: noopen` - Prevents file execution
- `X-Permitted-Cross-Domain-Policies: none` - Blocks Flash/PDF

**Disabled Features**:

- `contentSecurityPolicy` - We set our own (see below)
- `crossOriginEmbedderPolicy` - Allows external images/videos

**No configuration needed** - works automatically.

---

### 3. Content-Security-Policy (CSP)

**Purpose**: Prevent XSS (Cross-Site Scripting) attacks.

**Policy**:

```
default-src 'self';                    # Only load from same origin
img-src 'self' data: https:;           # Images: same origin, data URIs, HTTPS
media-src 'self' https:;               # Videos: same origin, HTTPS
script-src 'self';                     # Scripts: only from same origin
style-src 'self' 'unsafe-inline';      # Styles: same origin + inline
object-src 'none';                     # No Flash, Java, etc.
```

**What's allowed**:

- ✅ Images from MiniMax CDN (https://)
- ✅ Videos from MiniMax (https://)
- ✅ Inline styles (for UI components)
- ✅ Local scripts and assets

**What's blocked**:

- ❌ External scripts
- ❌ `eval()` and inline scripts
- ❌ Plugins (Flash, Java, etc.)
- ❌ Unsafe content

**Testing**:

- Check browser console for CSP violations
- Adjust policy if needed for your setup

---

### 4. Rate Limiting

**Purpose**: Prevent abuse and DoS attacks.

**Limits**:

| Endpoint Type | Limit       | Window   | Action         |
| ------------- | ----------- | -------- | -------------- |
| `/api/*`      | 60 requests | 1 minute | Block with 429 |
| `/demo/*`     | 10 requests | 1 minute | Block with 429 |

**Response when exceeded**:

```json
{
  "error": "Too many requests, please try again later.",
  "status_code": 1002
}
```

**Headers Included**:

- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: When limit resets

**Example**:

```
RateLimit-Limit: 60
RateLimit-Remaining: 45
RateLimit-Reset: 1730000000
```

**Adjusting Limits** (`server.js`):

```javascript
// API rate limit
const apiLimiter = rateLimit({
  windowMs: 60_000, // Time window (1 min)
  max: 60, // Max requests
  // ... rest
})

// Demo rate limit
const demoLimiter = rateLimit({
  windowMs: 60_000,
  max: 10, // Stricter for demos
  // ... rest
})
```

---

### 5. Health Check Endpoint

**Purpose**: Monitor server status for load balancers and monitoring tools.

**Endpoint**: `GET /healthz`

**Response**:

```json
{
  "ok": true,
  "time": "2025-10-22T16:30:00.000Z",
  "uptime": 3600.5,
  "version": "2.0.0"
}
```

**Fields**:

- `ok` - Server is healthy (always true if responding)
- `time` - Current server timestamp (ISO 8601)
- `uptime` - Server uptime in seconds
- `version` - Application version

**Usage**:

```bash
# Check server health
curl http://localhost:8000/healthz

# Use in load balancer
HealthCheck: /healthz
ExpectedStatus: 200
ExpectedBody: "ok":true
```

**Not Rate Limited**: Health checks are exempt from rate limiting.

---

## Production Deployment Checklist

### Before Deployment

- [ ] Set `CORS_ORIGIN` to your production domain(s)
- [ ] Use HTTPS (required for security headers)
- [ ] Set strong `MINIMAX_API_KEY`
- [ ] Configure firewall rules
- [ ] Set up monitoring on `/healthz`

### .env Configuration

```bash
# Production Example
MINIMAX_API_KEY=sk-prod-key-here
PUBLIC_BASE_URL=https://api.yourapp.com
PORT=8000
CORS_ORIGIN=https://yourapp.com,https://www.yourapp.com

# Staging Example
MINIMAX_API_KEY=sk-staging-key-here
PUBLIC_BASE_URL=https://staging-api.yourapp.com
PORT=8000
CORS_ORIGIN=https://staging.yourapp.com
```

### HTTPS Setup

**Required for**:

- Strict-Transport-Security header
- Secure cookies (if added later)
- Modern browser features

**Options**:

1. Use reverse proxy (nginx, Apache)
2. Use cloud provider SSL (AWS ALB, CloudFlare)
3. Use Let's Encrypt certificates

---

## Security Best Practices

### API Key Security

**DO**:

- ✅ Store in `.env` file
- ✅ Never commit to git (use .gitignore)
- ✅ Rotate keys regularly
- ✅ Use different keys for dev/staging/prod

**DON'T**:

- ❌ Hard-code in source files
- ❌ Share keys in plain text
- ❌ Use same key everywhere
- ❌ Commit `.env` to repository

### CORS Configuration

**Development**:

```bash
# Allow all (easy testing)
CORS_ORIGIN=
```

**Staging**:

```bash
# Allow staging domains
CORS_ORIGIN=https://staging.myapp.com
```

**Production**:

```bash
# Restrict to production domains only
CORS_ORIGIN=https://myapp.com,https://www.myapp.com,https://app.myapp.com
```

### Rate Limiting

**Adjust based on usage**:

- High traffic app? Increase limits
- Public demo? Keep strict limits
- Authenticated users? Consider per-user limits

**Monitor**:

- Check logs for rate limit hits
- Adjust if legitimate users affected
- Block IPs that abuse repeatedly

---

## Monitoring

### Health Check Setup

**Kubernetes**:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 30
```

**Docker Compose**:

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:8000/healthz']
  interval: 30s
  timeout: 10s
  retries: 3
```

**Nginx Upstream**:

```nginx
upstream backend {
  server localhost:8000 max_fails=3 fail_timeout=30s;

  # Health check
  check interval=3000 rise=2 fall=3 timeout=1000;
  check_http_send "GET /healthz HTTP/1.0\r\n\r\n";
  check_http_expect_alive http_2xx;
}
```

### Logging

**Security Events Logged**:

- CORS violations
- Rate limit exceeded
- API errors
- Failed requests

**Log Locations**:

- Console output (stdout)
- Add file logging for production:

```javascript
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})
```

---

## Testing Security

### Test CORS

```bash
# Should succeed (if origin allowed)
curl -H "Origin: https://myapp.com" http://localhost:8000/api/job/test

# Should fail (if origin not in list)
curl -H "Origin: https://evil.com" http://localhost:8000/api/job/test
```

### Test Rate Limiting

```bash
# Send 61 requests quickly
for i in {1..61}; do
  curl http://localhost:8000/api/job/test
done
# Request 61 should return 429
```

### Test CSP

Open browser console and check for CSP violations:

```
Content-Security-Policy: ... violated
```

### Test Health Check

```bash
# Should return 200 OK
curl -i http://localhost:8000/healthz
```

---

## Common Issues

### CORS Errors

**Symptom**: `Access-Control-Allow-Origin` errors in browser

**Solutions**:

1. Add your domain to `CORS_ORIGIN`
2. Check domain spelling (include https://)
3. No trailing slashes in domain
4. Restart server after changing `.env`

### Rate Limit False Positives

**Symptom**: Legitimate users getting 429 errors

**Solutions**:

1. Increase limits in `server.js`
2. Implement per-user limits (requires auth)
3. Whitelist IPs if needed
4. Use Redis for distributed rate limiting

### CSP Blocking Resources

**Symptom**: Images/videos not loading

**Solutions**:

1. Check if resource is HTTPS
2. Add domain to CSP policy if needed
3. Check browser console for CSP violations
4. Adjust policy in `server.js:50-55`

---

## Additional Security Measures

### Consider Adding

1. **Authentication**
   - JWT tokens
   - API keys per user
   - OAuth 2.0

2. **Input Validation**
   - Sanitize user inputs
   - Validate file uploads
   - Check prompt length/content

3. **Logging & Monitoring**
   - Winston for file logging
   - Sentry for error tracking
   - Prometheus for metrics

4. **Database Security**
   - If adding persistence
   - SQL injection prevention
   - Encrypted connections

5. **File Upload Security**
   - If allowing uploads
   - Virus scanning
   - File type validation
   - Size limits

---

## Support

For security issues or questions:

- Review MiniMax API docs: https://platform.minimax.io/docs
- Check logs for detailed errors
- Test with `test-image-api.js` script

**Report Security Vulnerabilities**:

- Do NOT create public GitHub issues
- Email security concerns privately
- Include reproduction steps
