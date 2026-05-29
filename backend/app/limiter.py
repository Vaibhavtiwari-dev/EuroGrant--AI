from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

# Trusted proxy IPs — configure these to match your reverse-proxy (nginx/cloudflare/traefik)
# Only IPs in this set will have their X-Forwarded-For header used.
TRUSTED_PROXY_IPS: set[str] = {
    "127.0.0.1",
    "::1",
    # Add your proxy IPs here, e.g. "10.0.0.5", "172.16.0.0/16" (note: CIDR needs handling)
}


def get_real_ip(request: Request) -> str:
    """
    Resolve the real client IP, using X-Forwarded-For only when the direct
    socket peer is a known/trusted proxy. This prevents IP spoofing (MED-04).
    """
    remote_ip = get_remote_address(request)

    # If the direct client is a trusted proxy, honour its X-Forwarded-For header
    if remote_ip in TRUSTED_PROXY_IPS:
        forwarded_for = request.headers.get("X-Forwarded-For", "")
        if forwarded_for:
            # Take the left-most (original client) IP in the chain
            return forwarded_for.split(",")[0].strip()

    # Otherwise return the actual direct socket address
    return remote_ip


# Global Limiter instance to be imported by main and all sub-routers
limiter = Limiter(key_func=get_real_ip)
