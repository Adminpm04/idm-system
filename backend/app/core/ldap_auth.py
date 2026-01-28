from ldap3 import Server, Connection, ALL, SUBTREE, Tls
from ldap3.core.exceptions import LDAPException, LDAPBindError
from typing import Optional, Dict, Any, List
import ssl
import uuid
from datetime import datetime
from app.core.config import settings


# AD userAccountControl flags
UAC_ACCOUNT_DISABLE = 0x0002
UAC_NORMAL_ACCOUNT = 0x0200


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
                object_guid = None
                if hasattr(entry, 'objectGUID') and entry.objectGUID:
                    try:
                        guid_bytes = entry.objectGUID.value
                        if isinstance(guid_bytes, bytes):
                            object_guid = str(uuid.UUID(bytes_le=guid_bytes))
                        else:
                            object_guid = str(guid_bytes)
                    except Exception:
                        pass

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
        """Search users in Active Directory"""
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
                object_guid = None
                if hasattr(entry, 'objectGUID') and entry.objectGUID:
                    try:
                        guid_bytes = entry.objectGUID.value
                        if isinstance(guid_bytes, bytes):
                            object_guid = str(uuid.UUID(bytes_le=guid_bytes))
                        else:
                            object_guid = str(guid_bytes)
                    except Exception:
                        pass

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

            return {
                'users': paginated_users,
                'total': len(users),
                'page': page,
                'limit': limit
            }

        except LDAPException as e:
            return {
                'users': [],
                'total': 0,
                'error': str(e)
            }

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user details by username from AD"""
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
                object_guid = None
                if hasattr(entry, 'objectGUID') and entry.objectGUID:
                    try:
                        guid_bytes = entry.objectGUID.value
                        if isinstance(guid_bytes, bytes):
                            object_guid = str(uuid.UUID(bytes_le=guid_bytes))
                        else:
                            object_guid = str(guid_bytes)
                    except Exception:
                        pass

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
        """Get all users from AD for full sync"""
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
                object_guid = None
                if hasattr(entry, 'objectGUID') and entry.objectGUID:
                    try:
                        guid_bytes = entry.objectGUID.value
                        if isinstance(guid_bytes, bytes):
                            object_guid = str(uuid.UUID(bytes_le=guid_bytes))
                        else:
                            object_guid = str(guid_bytes)
                    except Exception:
                        pass

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
            return users

        except LDAPException as e:
            print(f"LDAP sync error: {e}")
            return []


# Singleton instance
ldap_service = LDAPAuthService()
