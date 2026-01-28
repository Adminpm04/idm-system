from ldap3 import Server, Connection, ALL, SUBTREE, Tls
from ldap3.core.exceptions import LDAPException, LDAPBindError
from typing import Optional, Dict, Any, List
import ssl
import uuid
import hashlib
import threading
from datetime import datetime
from cachetools import TTLCache
from app.core.config import settings


# AD userAccountControl flags
UAC_ACCOUNT_DISABLE = 0x0002
UAC_NORMAL_ACCOUNT = 0x0200

# Cache configuration
CACHE_TTL = 300  # 5 minutes
CACHE_MAXSIZE = 500  # Maximum cached items


def normalize_guid(guid_value) -> Optional[str]:
    """Convert objectGUID to a normalized 36-character UUID string"""
    if guid_value is None:
        return None
    try:
        if isinstance(guid_value, bytes):
            # Convert bytes to UUID
            return str(uuid.UUID(bytes_le=guid_value))
        else:
            # String - strip curly braces if present
            guid_str = str(guid_value).strip('{}')
            # Validate it's a proper UUID format
            return str(uuid.UUID(guid_str))
    except Exception:
        return None


class LDAPCache:
    """Thread-safe cache for LDAP queries"""

    def __init__(self, ttl: int = CACHE_TTL, maxsize: int = CACHE_MAXSIZE):
        self._search_cache = TTLCache(maxsize=maxsize, ttl=ttl)
        self._user_cache = TTLCache(maxsize=maxsize, ttl=ttl)
        self._all_users_cache = TTLCache(maxsize=10, ttl=ttl)
        self._lock = threading.RLock()
        self._stats = {
            'hits': 0,
            'misses': 0,
            'search_hits': 0,
            'search_misses': 0,
            'user_hits': 0,
            'user_misses': 0,
        }

    def _make_search_key(self, query: str, page: int, limit: int, include_disabled: bool) -> str:
        """Create a cache key for search queries"""
        return hashlib.md5(f"{query}:{page}:{limit}:{include_disabled}".encode()).hexdigest()

    def get_search(self, query: str, page: int, limit: int, include_disabled: bool) -> Optional[Dict]:
        """Get cached search results"""
        key = self._make_search_key(query, page, limit, include_disabled)
        with self._lock:
            result = self._search_cache.get(key)
            if result is not None:
                self._stats['hits'] += 1
                self._stats['search_hits'] += 1
            else:
                self._stats['misses'] += 1
                self._stats['search_misses'] += 1
            return result

    def set_search(self, query: str, page: int, limit: int, include_disabled: bool, result: Dict):
        """Cache search results"""
        key = self._make_search_key(query, page, limit, include_disabled)
        with self._lock:
            self._search_cache[key] = result

    def get_user(self, username: str) -> Optional[Dict]:
        """Get cached user data"""
        with self._lock:
            result = self._user_cache.get(username.lower())
            if result is not None:
                self._stats['hits'] += 1
                self._stats['user_hits'] += 1
            else:
                self._stats['misses'] += 1
                self._stats['user_misses'] += 1
            return result

    def set_user(self, username: str, data: Dict):
        """Cache user data"""
        with self._lock:
            self._user_cache[username.lower()] = data

    def get_all_users(self) -> Optional[List]:
        """Get cached all users list"""
        with self._lock:
            return self._all_users_cache.get('all_users')

    def set_all_users(self, users: List):
        """Cache all users list"""
        with self._lock:
            self._all_users_cache['all_users'] = users

    def clear(self):
        """Clear all caches"""
        with self._lock:
            self._search_cache.clear()
            self._user_cache.clear()
            self._all_users_cache.clear()

    def clear_user(self, username: str):
        """Clear specific user from cache"""
        with self._lock:
            self._user_cache.pop(username.lower(), None)

    def get_stats(self) -> Dict:
        """Get cache statistics"""
        with self._lock:
            total = self._stats['hits'] + self._stats['misses']
            hit_rate = (self._stats['hits'] / total * 100) if total > 0 else 0
            return {
                **self._stats,
                'hit_rate': round(hit_rate, 2),
                'search_cache_size': len(self._search_cache),
                'user_cache_size': len(self._user_cache),
                'total_requests': total,
            }


class LDAPAuthService:
    """Service for authenticating users against Active Directory with caching"""

    def __init__(self):
        self.server_url = settings.LDAP_SERVER
        self.base_dn = settings.LDAP_BASE_DN
        self.bind_dn = settings.LDAP_BIND_DN
        self.bind_password = settings.LDAP_BIND_PASSWORD
        self.user_search_base = settings.LDAP_USER_SEARCH_BASE or settings.LDAP_BASE_DN
        self.user_filter = settings.LDAP_USER_FILTER
        self.use_ssl = settings.LDAP_USE_SSL
        self.timeout = settings.LDAP_TIMEOUT
        self.cache = LDAPCache()

    def _get_server(self) -> Server:
        """Create LDAP server connection object"""
        if self.use_ssl:
            tls = Tls(validate=ssl.CERT_NONE)
            return Server(self.server_url, use_ssl=True, tls=tls, get_info=ALL, connect_timeout=self.timeout)
        return Server(self.server_url, get_info=ALL, connect_timeout=self.timeout)

    def _get_user_dn(self, username: str) -> Optional[str]:
        """Search for user DN by username using service account"""
        try:
            server = self._get_server()
            conn = Connection(
                server,
                user=self.bind_dn,
                password=self.bind_password,
                auto_bind=True,
                receive_timeout=self.timeout
            )

            search_filter = self.user_filter.format(username=username)
            conn.search(
                search_base=self.user_search_base,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=['distinguishedName', 'sAMAccountName', 'mail', 'displayName', 'department', 'title']
            )

            if conn.entries:
                entry = conn.entries[0]
                conn.unbind()
                return str(entry.entry_dn)

            conn.unbind()
            return None

        except LDAPException as e:
            print(f"LDAP search error: {e}")
            return None

    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user against Active Directory.
        Returns user attributes if successful, None if failed.
        Note: Authentication is never cached for security reasons.
        """
        if not settings.LDAP_ENABLED:
            return None

        try:
            server = self._get_server()

            # Try to bind with UPN format first (user@domain)
            if '@' not in username:
                # Extract domain from base_dn (DC=corp,DC=orien,DC=tj -> corp.orien.tj)
                domain_parts = [part.split('=')[1] for part in self.base_dn.split(',') if part.startswith('DC=')]
                domain = '.'.join(domain_parts)
                user_principal_name = f"{username}@{domain}"
            else:
                user_principal_name = username
                username = username.split('@')[0]

            # Attempt to bind as the user
            conn = Connection(
                server,
                user=user_principal_name,
                password=password,
                auto_bind=True,
                receive_timeout=self.timeout
            )

            # If bind successful, search for user attributes
            search_filter = self.user_filter.format(username=username)
            conn.search(
                search_base=self.user_search_base,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=[
                    'sAMAccountName', 'mail', 'displayName', 'department', 'title',
                    'memberOf', 'manager', 'telephoneNumber', 'objectGUID',
                    'distinguishedName', 'userAccountControl'
                ]
            )

            user_data = None
            if conn.entries:
                entry = conn.entries[0]

                # Check if account is disabled
                uac = int(entry.userAccountControl.value) if hasattr(entry, 'userAccountControl') and entry.userAccountControl else 0
                is_disabled = bool(uac & UAC_ACCOUNT_DISABLE)

                # Get objectGUID as string
                object_guid = normalize_guid(entry.objectGUID.value) if hasattr(entry, 'objectGUID') and entry.objectGUID else None

                user_data = {
                    'username': str(entry.sAMAccountName) if hasattr(entry, 'sAMAccountName') else username,
                    'email': str(entry.mail) if hasattr(entry, 'mail') and entry.mail else f"{username}@{domain_parts[0]}.{domain_parts[1]}.{domain_parts[2]}" if len(domain_parts) >= 3 else None,
                    'full_name': str(entry.displayName) if hasattr(entry, 'displayName') and entry.displayName else username,
                    'department': str(entry.department) if hasattr(entry, 'department') and entry.department else None,
                    'title': str(entry.title) if hasattr(entry, 'title') and entry.title else None,
                    'phone': str(entry.telephoneNumber) if hasattr(entry, 'telephoneNumber') and entry.telephoneNumber else None,
                    'groups': [str(g) for g in entry.memberOf] if hasattr(entry, 'memberOf') and entry.memberOf else [],
                    'manager_dn': str(entry.manager) if hasattr(entry, 'manager') and entry.manager else None,
                    'object_guid': object_guid,
                    'distinguished_name': str(entry.distinguishedName) if hasattr(entry, 'distinguishedName') else None,
                    'is_disabled': is_disabled,
                }

                # Update user cache after successful auth
                self.cache.set_user(username, user_data)

            conn.unbind()
            return user_data

        except LDAPBindError as e:
            print(f"LDAP bind failed for user {username}: {e}")
            return None
        except LDAPException as e:
            print(f"LDAP error for user {username}: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error during LDAP auth for {username}: {e}")
            return None

    def test_connection(self) -> Dict[str, Any]:
        """Test LDAP connection with service account"""
        try:
            server = self._get_server()
            conn = Connection(
                server,
                user=self.bind_dn,
                password=self.bind_password,
                auto_bind=True,
                receive_timeout=self.timeout
            )
            server_info = str(server.info) if server.info else "Connected"
            conn.unbind()
            return {
                'success': True,
                'message': 'LDAP connection successful',
                'server_info': server_info[:500]
            }
        except LDAPException as e:
            return {
                'success': False,
                'message': f'LDAP connection failed: {str(e)}'
            }

    def search_users(self, query: str = "", page: int = 1, limit: int = 20, include_disabled: bool = True) -> Dict[str, Any]:
        """Search users in Active Directory with caching"""

        # Check cache first
        cached = self.cache.get_search(query, page, limit, include_disabled)
        if cached is not None:
            cached['from_cache'] = True
            return cached

        try:
            server = self._get_server()
            conn = Connection(
                server,
                user=self.bind_dn,
                password=self.bind_password,
                auto_bind=True,
                receive_timeout=self.timeout
            )

            # Build search filter
            if query:
                search_filter = f"(&(objectClass=user)(objectCategory=person)(|(sAMAccountName=*{query}*)(displayName=*{query}*)(mail=*{query}*)))"
            else:
                search_filter = "(&(objectClass=user)(objectCategory=person)(sAMAccountName=*))"

            # Search with pagination
            conn.search(
                search_base=self.user_search_base,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=[
                    'sAMAccountName', 'mail', 'displayName', 'department',
                    'title', 'telephoneNumber', 'distinguishedName', 'memberOf',
                    'userAccountControl', 'manager', 'objectGUID', 'whenChanged'
                ],
                paged_size=1000,
                paged_cookie=None
            )

            users = []
            for entry in conn.entries:
                # Check if account is disabled
                uac = int(entry.userAccountControl.value) if hasattr(entry, 'userAccountControl') and entry.userAccountControl else 0
                is_disabled = bool(uac & UAC_ACCOUNT_DISABLE)

                if not include_disabled and is_disabled:
                    continue

                # Get objectGUID
                object_guid = normalize_guid(entry.objectGUID.value) if hasattr(entry, 'objectGUID') and entry.objectGUID else None

                users.append({
                    'sAMAccountName': str(entry.sAMAccountName) if hasattr(entry, 'sAMAccountName') and entry.sAMAccountName else None,
                    'mail': str(entry.mail) if hasattr(entry, 'mail') and entry.mail else None,
                    'displayName': str(entry.displayName) if hasattr(entry, 'displayName') and entry.displayName else None,
                    'department': str(entry.department) if hasattr(entry, 'department') and entry.department else None,
                    'title': str(entry.title) if hasattr(entry, 'title') and entry.title else None,
                    'telephoneNumber': str(entry.telephoneNumber) if hasattr(entry, 'telephoneNumber') and entry.telephoneNumber else None,
                    'distinguishedName': str(entry.distinguishedName) if hasattr(entry, 'distinguishedName') and entry.distinguishedName else None,
                    'memberOf': [str(g) for g in entry.memberOf] if hasattr(entry, 'memberOf') and entry.memberOf else [],
                    'manager': str(entry.manager) if hasattr(entry, 'manager') and entry.manager else None,
                    'objectGUID': object_guid,
                    'isDisabled': is_disabled,
                    'whenChanged': str(entry.whenChanged) if hasattr(entry, 'whenChanged') and entry.whenChanged else None,
                })

            conn.unbind()

            # Simple pagination (skip entries based on page)
            start = (page - 1) * limit
            end = start + limit
            paginated_users = users[start:end] if start < len(users) else []

            result = {
                'users': paginated_users,
                'total': len(users),
                'page': page,
                'limit': limit,
                'from_cache': False
            }

            # Cache the result
            self.cache.set_search(query, page, limit, include_disabled, result)

            return result

        except LDAPException as e:
            return {
                'users': [],
                'total': 0,
                'error': str(e),
                'from_cache': False
            }

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user details by username from AD with caching"""

        # Check cache first
        cached = self.cache.get_user(username)
        if cached is not None:
            return cached

        try:
            server = self._get_server()
            conn = Connection(
                server,
                user=self.bind_dn,
                password=self.bind_password,
                auto_bind=True,
                receive_timeout=self.timeout
            )

            search_filter = self.user_filter.format(username=username)
            conn.search(
                search_base=self.user_search_base,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=[
                    'sAMAccountName', 'mail', 'displayName', 'department',
                    'title', 'telephoneNumber', 'distinguishedName', 'memberOf',
                    'userAccountControl', 'whenCreated', 'whenChanged', 'manager', 'objectGUID'
                ]
            )

            if conn.entries:
                entry = conn.entries[0]

                # Check if account is disabled
                uac = int(entry.userAccountControl.value) if hasattr(entry, 'userAccountControl') and entry.userAccountControl else 0
                is_disabled = bool(uac & UAC_ACCOUNT_DISABLE)

                # Get objectGUID
                object_guid = normalize_guid(entry.objectGUID.value) if hasattr(entry, 'objectGUID') and entry.objectGUID else None

                user_data = {
                    'sAMAccountName': str(entry.sAMAccountName) if hasattr(entry, 'sAMAccountName') and entry.sAMAccountName else None,
                    'mail': str(entry.mail) if hasattr(entry, 'mail') and entry.mail else None,
                    'displayName': str(entry.displayName) if hasattr(entry, 'displayName') and entry.displayName else None,
                    'department': str(entry.department) if hasattr(entry, 'department') and entry.department else None,
                    'title': str(entry.title) if hasattr(entry, 'title') and entry.title else None,
                    'telephoneNumber': str(entry.telephoneNumber) if hasattr(entry, 'telephoneNumber') and entry.telephoneNumber else None,
                    'distinguishedName': str(entry.distinguishedName) if hasattr(entry, 'distinguishedName') and entry.distinguishedName else None,
                    'memberOf': [str(g) for g in entry.memberOf] if hasattr(entry, 'memberOf') and entry.memberOf else [],
                    'manager': str(entry.manager) if hasattr(entry, 'manager') and entry.manager else None,
                    'objectGUID': object_guid,
                    'isDisabled': is_disabled,
                }
                conn.unbind()

                # Cache the user data
                self.cache.set_user(username, user_data)

                return user_data

            conn.unbind()
            return None

        except LDAPException as e:
            print(f"LDAP search error: {e}")
            return None

    def get_user_by_dn(self, dn: str) -> Optional[Dict[str, Any]]:
        """Get user details by distinguished name from AD"""
        try:
            server = self._get_server()
            conn = Connection(
                server,
                user=self.bind_dn,
                password=self.bind_password,
                auto_bind=True,
                receive_timeout=self.timeout
            )

            conn.search(
                search_base=dn,
                search_filter="(objectClass=*)",
                search_scope='BASE',
                attributes=['sAMAccountName', 'mail', 'displayName', 'department', 'title']
            )

            if conn.entries:
                entry = conn.entries[0]
                user_data = {
                    'sAMAccountName': str(entry.sAMAccountName) if hasattr(entry, 'sAMAccountName') and entry.sAMAccountName else None,
                    'mail': str(entry.mail) if hasattr(entry, 'mail') and entry.mail else None,
                    'displayName': str(entry.displayName) if hasattr(entry, 'displayName') and entry.displayName else None,
                    'department': str(entry.department) if hasattr(entry, 'department') and entry.department else None,
                    'title': str(entry.title) if hasattr(entry, 'title') and entry.title else None,
                }
                conn.unbind()
                return user_data

            conn.unbind()
            return None

        except LDAPException as e:
            print(f"LDAP search by DN error: {e}")
            return None

    def get_all_users_for_sync(self) -> List[Dict[str, Any]]:
        """Get all users from AD for full sync with caching"""

        # Check cache first
        cached = self.cache.get_all_users()
        if cached is not None:
            return cached

        try:
            server = self._get_server()
            conn = Connection(
                server,
                user=self.bind_dn,
                password=self.bind_password,
                auto_bind=True,
                receive_timeout=self.timeout
            )

            search_filter = "(&(objectClass=user)(objectCategory=person)(sAMAccountName=*))"

            conn.search(
                search_base=self.user_search_base,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=[
                    'sAMAccountName', 'mail', 'displayName', 'department',
                    'title', 'telephoneNumber', 'distinguishedName', 'memberOf',
                    'userAccountControl', 'manager', 'objectGUID'
                ],
                paged_size=1000
            )

            users = []
            for entry in conn.entries:
                # Check if account is disabled
                uac = int(entry.userAccountControl.value) if hasattr(entry, 'userAccountControl') and entry.userAccountControl else 0
                is_disabled = bool(uac & UAC_ACCOUNT_DISABLE)

                # Get objectGUID
                object_guid = normalize_guid(entry.objectGUID.value) if hasattr(entry, 'objectGUID') and entry.objectGUID else None

                users.append({
                    'sAMAccountName': str(entry.sAMAccountName) if hasattr(entry, 'sAMAccountName') and entry.sAMAccountName else None,
                    'mail': str(entry.mail) if hasattr(entry, 'mail') and entry.mail else None,
                    'displayName': str(entry.displayName) if hasattr(entry, 'displayName') and entry.displayName else None,
                    'department': str(entry.department) if hasattr(entry, 'department') and entry.department else None,
                    'title': str(entry.title) if hasattr(entry, 'title') and entry.title else None,
                    'telephoneNumber': str(entry.telephoneNumber) if hasattr(entry, 'telephoneNumber') and entry.telephoneNumber else None,
                    'distinguishedName': str(entry.distinguishedName) if hasattr(entry, 'distinguishedName') and entry.distinguishedName else None,
                    'manager': str(entry.manager) if hasattr(entry, 'manager') and entry.manager else None,
                    'objectGUID': object_guid,
                    'isDisabled': is_disabled,
                })

            conn.unbind()

            # Cache the result
            self.cache.set_all_users(users)

            return users

        except LDAPException as e:
            print(f"LDAP sync error: {e}")
            return []

    def clear_cache(self):
        """Clear all LDAP caches"""
        self.cache.clear()

    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        return self.cache.get_stats()


# Singleton instance
ldap_service = LDAPAuthService()
