from ldap3 import Server, Connection, ALL, SUBTREE, Tls
from ldap3.core.exceptions import LDAPException, LDAPBindError
from typing import Optional, Dict, Any
import ssl
from app.core.config import settings


class LDAPAuthService:
    """Service for authenticating users against Active Directory"""

    def __init__(self):
        self.server_url = settings.LDAP_SERVER
        self.base_dn = settings.LDAP_BASE_DN
        self.bind_dn = settings.LDAP_BIND_DN
        self.bind_password = settings.LDAP_BIND_PASSWORD
        self.user_search_base = settings.LDAP_USER_SEARCH_BASE or settings.LDAP_BASE_DN
        self.user_filter = settings.LDAP_USER_FILTER
        self.use_ssl = settings.LDAP_USE_SSL
        self.timeout = settings.LDAP_TIMEOUT

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
                attributes=['sAMAccountName', 'mail', 'displayName', 'department', 'title', 'memberOf']
            )

            user_data = None
            if conn.entries:
                entry = conn.entries[0]
                user_data = {
                    'username': str(entry.sAMAccountName) if hasattr(entry, 'sAMAccountName') else username,
                    'email': str(entry.mail) if hasattr(entry, 'mail') and entry.mail else f"{username}@{domain_parts[0]}.{domain_parts[1]}.{domain_parts[2]}" if len(domain_parts) >= 3 else None,
                    'full_name': str(entry.displayName) if hasattr(entry, 'displayName') and entry.displayName else username,
                    'department': str(entry.department) if hasattr(entry, 'department') and entry.department else None,
                    'title': str(entry.title) if hasattr(entry, 'title') and entry.title else None,
                    'groups': [str(g) for g in entry.memberOf] if hasattr(entry, 'memberOf') and entry.memberOf else [],
                }

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


# Singleton instance
ldap_service = LDAPAuthService()
