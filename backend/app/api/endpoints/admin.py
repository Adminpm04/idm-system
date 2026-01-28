from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.db.session import get_db
from app.schemas.user import RoleCreate, RoleUpdate, RoleResponse, PermissionResponse
from app.models import Role, Permission, User, AuditLog, AccessRequest
from app.api.deps import get_current_superuser, get_admin_reader, get_admin_writer

router = APIRouter()


@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_reader)
):
    """List all roles (read-only for demo users)"""
    roles = db.query(Role).all()
    return roles


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_in: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_writer)
):
    """Create new role"""
    if db.query(Role).filter(Role.name == role_in.name).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role name already exists"
        )
    
    role = Role(
        name=role_in.name,
        description=role_in.description
    )
    
    # Add permissions
    if role_in.permission_ids:
        permissions = db.query(Permission).filter(
            Permission.id.in_(role_in.permission_ids)
        ).all()
        role.permissions = permissions
    
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_in: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_writer)
):
    """Update an existing role"""
    role = db.query(Role).filter(Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Check if name is being changed to an existing name
    if role_in.name and role_in.name != role.name:
        existing = db.query(Role).filter(Role.name == role_in.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role name already exists"
            )
        role.name = role_in.name

    if role_in.description is not None:
        role.description = role_in.description

    # Update permissions
    if role_in.permission_ids is not None:
        permissions = db.query(Permission).filter(
            Permission.id.in_(role_in.permission_ids)
        ).all()
        role.permissions = permissions

    db.commit()
    db.refresh(role)
    return role


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_writer)
):
    """Delete a role"""
    role = db.query(Role).filter(Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Check if role is assigned to any users
    users_with_role = db.query(User).filter(User.roles.any(Role.id == role_id)).count()
    if users_with_role > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role. It is assigned to {users_with_role} user(s). Remove role from users first."
        )

    db.delete(role)
    db.commit()

    return {"message": "Role deleted successfully"}


@router.get("/permissions", response_model=List[PermissionResponse])
async def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_reader)
):
    """List all permissions (read-only for demo users)"""
    permissions = db.query(Permission).all()
    return permissions


@router.get("/audit-logs")
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_reader)
):
    """Get audit logs with full details"""
    # Загружаем логи с связанными данными
    logs = db.query(AuditLog).options(
        joinedload(AuditLog.user),
        joinedload(AuditLog.request).joinedload(AccessRequest.system),
        joinedload(AuditLog.request).joinedload(AccessRequest.target_user)
    ).order_by(
        AuditLog.created_at.desc()
    ).offset(skip).limit(limit).all()

    return logs


@router.get("/ldap/test")
async def test_ldap_connection(
    current_user: User = Depends(get_current_superuser)
):
    """Test LDAP/AD connection"""
    from app.core.ldap_auth import ldap_service
    from app.core.config import settings

    if not settings.LDAP_ENABLED:
        return {"success": False, "message": "LDAP is not enabled"}

    result = ldap_service.test_connection()
    return result


@router.post("/ldap/test")
async def test_ldap_connection_with_config(
    config: dict,
    current_user: User = Depends(get_current_superuser)
):
    """Test LDAP/AD connection with custom config"""
    from ldap3 import Server, Connection, ALL, Tls
    from ldap3.core.exceptions import LDAPException
    import ssl

    try:
        server_url = config.get('server', '')
        port = config.get('port', 389)
        use_ssl = config.get('use_ssl', False)
        bind_dn = config.get('bind_dn', '')
        bind_password = config.get('bind_password', '')
        base_dn = config.get('base_dn', '')
        timeout = config.get('timeout', 10)

        # Construct server URL with port
        if not server_url.startswith('ldap'):
            server_url = f"ldap://{server_url}"
        if ':' not in server_url.split('://')[-1]:
            server_url = f"{server_url}:{port}"

        if use_ssl:
            tls = Tls(validate=ssl.CERT_NONE)
            server = Server(server_url, use_ssl=True, tls=tls, get_info=ALL, connect_timeout=timeout)
        else:
            server = Server(server_url, get_info=ALL, connect_timeout=timeout)

        conn = Connection(
            server,
            user=bind_dn,
            password=bind_password,
            auto_bind=True,
            receive_timeout=timeout
        )

        # Try to count users
        conn.search(
            search_base=base_dn,
            search_filter="(&(objectClass=user)(objectCategory=person)(sAMAccountName=*))",
            search_scope='SUBTREE',
            attributes=['sAMAccountName'],
            paged_size=100
        )
        users_found = len(conn.entries)

        conn.unbind()

        return {
            'success': True,
            'message': 'Connection successful',
            'users_found': users_found
        }

    except LDAPException as e:
        return {
            'success': False,
            'message': str(e)
        }
    except Exception as e:
        return {
            'success': False,
            'message': str(e)
        }


@router.get("/ldap/config")
async def get_ldap_config(
    current_user: User = Depends(get_current_superuser)
):
    """Get current LDAP configuration (passwords masked)"""
    from app.core.config import settings

    # Parse server and port from LDAP_SERVER
    server_url = settings.LDAP_SERVER
    port = 389
    if server_url:
        if '://' in server_url:
            server_url = server_url.split('://')[1]
        if ':' in server_url:
            parts = server_url.rsplit(':', 1)
            server_url = parts[0]
            try:
                port = int(parts[1])
            except ValueError:
                pass

    return {
        'enabled': settings.LDAP_ENABLED,
        'server': server_url,
        'port': port,
        'use_ssl': settings.LDAP_USE_SSL,
        'base_dn': settings.LDAP_BASE_DN,
        'bind_dn': settings.LDAP_BIND_DN,
        'bind_password': '',  # Don't expose password
        'user_search_base': settings.LDAP_USER_SEARCH_BASE or '',
        'user_filter': settings.LDAP_USER_FILTER,
        'timeout': settings.LDAP_TIMEOUT,
        # Default attribute mappings
        'attr_email': 'mail',
        'attr_display_name': 'displayName',
        'attr_department': 'department',
        'attr_position': 'title',
        'attr_phone': 'telephoneNumber',
        'attr_groups': 'memberOf'
    }


@router.post("/ldap/config")
async def save_ldap_config(
    config: dict,
    current_user: User = Depends(get_current_superuser)
):
    """Save LDAP configuration to .env file"""
    import os

    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env')

    try:
        # Read current .env file
        env_lines = []
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                env_lines = f.readlines()

        # Build new LDAP settings
        server = config.get('server', '')
        port = config.get('port', 389)
        server_url = f"ldap://{server}:{port}"

        ldap_settings = {
            'LDAP_ENABLED': str(config.get('enabled', True)).lower(),
            'LDAP_SERVER': server_url,
            'LDAP_BASE_DN': config.get('base_dn', ''),
            'LDAP_BIND_DN': config.get('bind_dn', ''),
            'LDAP_USER_SEARCH_BASE': config.get('user_search_base', ''),
            'LDAP_USER_FILTER': config.get('user_filter', '(sAMAccountName={username})'),
            'LDAP_USE_SSL': str(config.get('use_ssl', False)).lower(),
            'LDAP_TIMEOUT': str(config.get('timeout', 10)),
        }

        # Only update password if provided
        if config.get('bind_password'):
            ldap_settings['LDAP_BIND_PASSWORD'] = config.get('bind_password')

        # Update or add LDAP settings in .env
        updated_keys = set()
        new_lines = []

        for line in env_lines:
            line_stripped = line.strip()
            if line_stripped and not line_stripped.startswith('#'):
                key = line_stripped.split('=')[0] if '=' in line_stripped else None
                if key and key in ldap_settings:
                    new_lines.append(f"{key}={ldap_settings[key]}\n")
                    updated_keys.add(key)
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)

        # Add any missing LDAP settings
        for key, value in ldap_settings.items():
            if key not in updated_keys:
                new_lines.append(f"{key}={value}\n")

        # Write updated .env
        with open(env_path, 'w') as f:
            f.writelines(new_lines)

        return {'success': True, 'message': 'Configuration saved. Restart required for changes to take effect.'}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save configuration: {str(e)}"
        )


@router.get("/ldap/users")
async def search_ldap_users(
    query: str = "",
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Search users in Active Directory"""
    from app.core.ldap_auth import ldap_service
    from app.core.config import settings

    if not settings.LDAP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LDAP is not enabled"
        )

    result = ldap_service.search_users(query, page, limit)

    if 'error' in result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result['error']
        )

    # Check which users are already synced to IDM
    for ad_user in result.get('users', []):
        username = ad_user.get('sAMAccountName')
        if username:
            local_user = db.query(User).filter(User.username == username).first()
            ad_user['synced'] = local_user is not None
            if local_user:
                ad_user['local_user_id'] = local_user.id

    return result


@router.post("/ldap/sync-user")
async def sync_ldap_user(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Sync a single user from AD to local database"""
    from app.core.ldap_auth import ldap_service
    from app.core.config import settings
    from datetime import datetime, timezone

    if not settings.LDAP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LDAP is not enabled"
        )

    username = data.get('username')
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required"
        )

    # Get user from AD
    ad_user = ldap_service.get_user_by_username(username)
    if not ad_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in Active Directory"
        )

    # Check if user already exists
    existing_user = db.query(User).filter(User.username == username).first()

    if existing_user:
        # Update existing user
        existing_user.email = ad_user.get('mail') or existing_user.email
        existing_user.full_name = ad_user.get('displayName') or existing_user.full_name
        existing_user.department = ad_user.get('department')
        existing_user.position = ad_user.get('title')
        existing_user.phone = ad_user.get('telephoneNumber')
        existing_user.auth_source = 'ldap'
        existing_user.ad_guid = ad_user.get('objectGUID')
        existing_user.ad_dn = ad_user.get('distinguishedName')
        existing_user.ad_manager_dn = ad_user.get('manager')
        existing_user.ad_disabled = ad_user.get('isDisabled', False)
        existing_user.last_ad_sync = datetime.now(timezone.utc)

        # Handle disabled users
        if ad_user.get('isDisabled'):
            existing_user.is_active = False
            existing_user.termination_date = datetime.now(timezone.utc)

        db.commit()
        return {'success': True, 'message': 'User updated', 'user_id': existing_user.id, 'disabled': ad_user.get('isDisabled', False)}
    else:
        # Create new user
        from app.core.security import get_password_hash
        import secrets

        new_user = User(
            username=username,
            email=ad_user.get('mail') or f"{username}@noemail.example.com",
            full_name=ad_user.get('displayName') or username,
            department=ad_user.get('department'),
            position=ad_user.get('title'),
            phone=ad_user.get('telephoneNumber'),
            auth_source='ldap',
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            is_active=not ad_user.get('isDisabled', False),
            ad_guid=ad_user.get('objectGUID'),
            ad_dn=ad_user.get('distinguishedName'),
            ad_manager_dn=ad_user.get('manager'),
            ad_disabled=ad_user.get('isDisabled', False),
            last_ad_sync=datetime.now(timezone.utc)
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {'success': True, 'message': 'User created', 'user_id': new_user.id, 'disabled': ad_user.get('isDisabled', False)}


@router.post("/ldap/sync-all")
async def sync_all_ldap_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Sync all AD users to local database with manager linking"""
    from app.core.ldap_auth import ldap_service
    from app.core.config import settings
    from app.core.security import get_password_hash
    from datetime import datetime, timezone
    import secrets

    if not settings.LDAP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LDAP is not enabled"
        )

    # Get all users from AD
    ad_users = ldap_service.get_all_users_for_sync()

    if not ad_users:
        return {
            'success': True,
            'synced': 0,
            'created': 0,
            'updated': 0,
            'disabled': 0,
            'total': 0,
            'errors': []
        }

    synced_count = 0
    created_count = 0
    updated_count = 0
    disabled_count = 0
    errors = []

    # First pass: Create/update all users
    for ad_user in ad_users:
        username = ad_user.get('sAMAccountName')
        if not username:
            continue

        try:
            existing_user = db.query(User).filter(User.username == username).first()
            is_disabled = ad_user.get('isDisabled', False)

            if existing_user:
                # Update existing user
                existing_user.email = ad_user.get('mail') or existing_user.email
                existing_user.full_name = ad_user.get('displayName') or existing_user.full_name
                existing_user.department = ad_user.get('department')
                existing_user.position = ad_user.get('title')
                existing_user.phone = ad_user.get('telephoneNumber')
                existing_user.auth_source = 'ldap'
                existing_user.ad_guid = ad_user.get('objectGUID')
                existing_user.ad_dn = ad_user.get('distinguishedName')
                existing_user.ad_manager_dn = ad_user.get('manager')
                existing_user.ad_disabled = is_disabled
                existing_user.last_ad_sync = datetime.now(timezone.utc)

                # Handle disabled/terminated users
                if is_disabled and existing_user.is_active:
                    existing_user.is_active = False
                    existing_user.termination_date = datetime.now(timezone.utc)
                    disabled_count += 1
                elif not is_disabled and not existing_user.is_active and not existing_user.termination_date:
                    # Re-enable if was disabled in AD but now enabled
                    existing_user.is_active = True

                updated_count += 1
            else:
                # Create new user
                new_user = User(
                    username=username,
                    email=ad_user.get('mail') or f"{username}@noemail.example.com",
                    full_name=ad_user.get('displayName') or username,
                    department=ad_user.get('department'),
                    position=ad_user.get('title'),
                    phone=ad_user.get('telephoneNumber'),
                    auth_source='ldap',
                    hashed_password=get_password_hash(secrets.token_urlsafe(32)),
                    is_active=not is_disabled,
                    ad_guid=ad_user.get('objectGUID'),
                    ad_dn=ad_user.get('distinguishedName'),
                    ad_manager_dn=ad_user.get('manager'),
                    ad_disabled=is_disabled,
                    last_ad_sync=datetime.now(timezone.utc)
                )
                db.add(new_user)
                created_count += 1

                if is_disabled:
                    disabled_count += 1

            synced_count += 1

        except Exception as e:
            errors.append(f"{username}: {str(e)}")

    db.commit()

    # Second pass: Link managers
    manager_linked = 0
    for ad_user in ad_users:
        username = ad_user.get('sAMAccountName')
        manager_dn = ad_user.get('manager')

        if not username or not manager_dn:
            continue

        try:
            user = db.query(User).filter(User.username == username).first()
            if user and not user.manager_id:
                # Find manager by DN
                manager = db.query(User).filter(User.ad_dn == manager_dn).first()
                if manager:
                    user.manager_id = manager.id
                    manager_linked += 1

        except Exception as e:
            pass  # Skip manager linking errors

    db.commit()

    return {
        'success': True,
        'synced': synced_count,
        'created': created_count,
        'updated': updated_count,
        'disabled': disabled_count,
        'managers_linked': manager_linked,
        'total': len(ad_users),
        'errors': errors[:10]
    }


@router.post("/ldap/link-managers")
async def link_managers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Link managers for all users based on AD manager DN"""
    from app.core.config import settings

    if not settings.LDAP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LDAP is not enabled"
        )

    # Get all users with manager DN but no manager linked
    users_with_manager_dn = db.query(User).filter(
        User.ad_manager_dn.isnot(None),
        User.manager_id.is_(None)
    ).all()

    linked_count = 0
    errors = []

    for user in users_with_manager_dn:
        try:
            manager = db.query(User).filter(User.ad_dn == user.ad_manager_dn).first()
            if manager:
                user.manager_id = manager.id
                linked_count += 1
        except Exception as e:
            errors.append(f"{user.username}: {str(e)}")

    db.commit()

    return {
        'success': True,
        'linked': linked_count,
        'total_checked': len(users_with_manager_dn),
        'errors': errors[:10]
    }


@router.get("/ldap/sync-status")
async def get_sync_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Get AD sync status statistics"""
    from app.core.config import settings
    from app.core.ldap_auth import ldap_service
    from sqlalchemy import func

    total_users = db.query(User).count()
    ldap_users = db.query(User).filter(User.auth_source == 'ldap').count()
    disabled_users = db.query(User).filter(User.ad_disabled == True).count()
    users_with_manager = db.query(User).filter(User.manager_id.isnot(None)).count()

    # Get last sync time
    last_sync = db.query(func.max(User.last_ad_sync)).scalar()

    # Get cache stats
    cache_stats = ldap_service.get_cache_stats()

    return {
        'ldap_enabled': settings.LDAP_ENABLED,
        'total_users': total_users,
        'ldap_users': ldap_users,
        'local_users': total_users - ldap_users,
        'disabled_users': disabled_users,
        'users_with_manager': users_with_manager,
        'last_sync': last_sync.isoformat() if last_sync else None,
        'cache': cache_stats
    }


@router.get("/ldap/cache-stats")
async def get_cache_stats(
    current_user: User = Depends(get_current_superuser)
):
    """Get LDAP cache statistics"""
    from app.core.ldap_auth import ldap_service

    return ldap_service.get_cache_stats()


@router.post("/ldap/clear-cache")
async def clear_ldap_cache(
    current_user: User = Depends(get_current_superuser)
):
    """Clear LDAP cache"""
    from app.core.ldap_auth import ldap_service

    ldap_service.clear_cache()

    return {
        'success': True,
        'message': 'LDAP cache cleared'
    }


# ============== DEMO USERS ==============

@router.get("/demo-users")
async def list_demo_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """List all demo users with their expiration status"""
    from datetime import datetime, timezone

    demo_users = db.query(User).filter(User.is_demo == True).all()

    result = []
    now = datetime.now(timezone.utc)

    for user in demo_users:
        is_expired = user.demo_expires_at and user.demo_expires_at < now
        remaining_minutes = 0
        if user.demo_expires_at and not is_expired:
            remaining = (user.demo_expires_at - now).total_seconds()
            remaining_minutes = max(0, int(remaining / 60))

        result.append({
            'id': user.id,
            'username': user.username,
            'full_name': user.full_name,
            'email': user.email,
            'is_active': user.is_active,
            'demo_expires_at': user.demo_expires_at.isoformat() if user.demo_expires_at else None,
            'is_expired': is_expired,
            'remaining_minutes': remaining_minutes,
            'created_at': user.created_at.isoformat() if user.created_at else None
        })

    return result


@router.post("/demo-users")
async def create_demo_user(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Create a demo user with expiration time"""
    from app.core.security import get_password_hash
    from datetime import datetime, timezone, timedelta

    username = data.get('username')
    password = data.get('password', 'demo123')
    full_name = data.get('full_name') or username
    email = data.get('email') or f'{username}@demo.example.com'
    minutes = data.get('minutes', 10)  # Default 10 minutes

    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required"
        )

    # Check if username exists
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Check if email exists
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    # Calculate expiration time
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=minutes)

    # Create demo user
    demo_user = User(
        username=username,
        email=email,
        full_name=full_name,
        hashed_password=get_password_hash(password),
        is_active=True,
        is_demo=True,
        demo_expires_at=expires_at,
        auth_source='local'
    )
    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)

    return {
        'id': demo_user.id,
        'username': demo_user.username,
        'full_name': demo_user.full_name,
        'email': demo_user.email,
        'password': password,  # Return password for display
        'demo_expires_at': expires_at.isoformat(),
        'minutes': minutes,
        'message': f'Demo user created. Access expires in {minutes} minutes.'
    }


@router.put("/demo-users/{user_id}/extend")
async def extend_demo_user(
    user_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Extend demo user expiration time"""
    from datetime import datetime, timezone, timedelta

    user = db.query(User).filter(User.id == user_id, User.is_demo == True).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo user not found"
        )

    minutes = data.get('minutes', 10)
    now = datetime.now(timezone.utc)

    # If already expired, extend from now; otherwise extend from current expiration
    base_time = max(now, user.demo_expires_at) if user.demo_expires_at else now
    user.demo_expires_at = base_time + timedelta(minutes=minutes)
    user.is_active = True  # Reactivate if was deactivated

    db.commit()

    return {
        'id': user.id,
        'username': user.username,
        'demo_expires_at': user.demo_expires_at.isoformat(),
        'message': f'Demo access extended by {minutes} minutes'
    }


@router.delete("/demo-users/{user_id}")
async def delete_demo_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Delete a demo user"""
    user = db.query(User).filter(User.id == user_id, User.is_demo == True).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo user not found"
        )

    db.delete(user)
    db.commit()

    return {'message': 'Demo user deleted'}


@router.post("/demo-users/cleanup")
async def cleanup_expired_demo_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Deactivate all expired demo users"""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    expired_users = db.query(User).filter(
        User.is_demo == True,
        User.is_active == True,
        User.demo_expires_at < now
    ).all()

    deactivated_count = 0
    for user in expired_users:
        user.is_active = False
        deactivated_count += 1

    db.commit()

    return {
        'deactivated': deactivated_count,
        'message': f'{deactivated_count} expired demo users deactivated'
    }
