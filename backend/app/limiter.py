from slowapi import Limiter
from slowapi.util import get_remote_address

# Global Limiter instance to be imported by main and all sub-routers
limiter = Limiter(key_func=get_remote_address)
