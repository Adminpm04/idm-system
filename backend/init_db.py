#!/usr/bin/env python3
"""
Initialize database with default data
"""
from app.db.session import SessionLocal, engine, Base
from app.models import User, Role, Permission, System, AccessRole, SystemType, AccessLevel
from app.core.security import get_password_hash


def init_db():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Create permissions
        permissions_data = [
            # Users
            ("users:read", "View users", "users", "read"),
            ("users:create", "Create users", "users", "create"),
            ("users:update", "Update users", "users", "update"),
            ("users:delete", "Delete users", "users", "delete"),
            
            # Requests
            ("requests:read", "View requests", "requests", "read"),
            ("requests:create", "Create requests", "requests", "create"),
            ("requests:update", "Update requests", "requests", "update"),
            ("requests:approve", "Approve requests", "requests", "approve"),
            
            # Systems
            ("systems:read", "View systems", "systems", "read"),
            ("systems:create", "Create systems", "systems", "create"),
            ("systems:update", "Update systems", "systems", "update"),
            ("systems:delete", "Delete systems", "systems", "delete"),
            
            # Admin
            ("admin:roles", "Manage roles", "admin", "roles"),
            ("admin:permissions", "Manage permissions", "admin", "permissions"),
            ("admin:audit", "View audit logs", "admin", "audit"),
        ]
        
        permissions = []
        for name, desc, resource, action in permissions_data:
            if not db.query(Permission).filter(Permission.name == name).first():
                perm = Permission(name=name, description=desc, resource=resource, action=action)
                db.add(perm)
                permissions.append(perm)
                print(f"✓ Created permission: {name}")
        
        db.commit()
        
        # Create roles
        # Admin role with all permissions
        admin_role = db.query(Role).filter(Role.name == "Administrator").first()
        if not admin_role:
            all_permissions = db.query(Permission).all()
            admin_role = Role(
                name="Administrator",
                description="Full system access",
                is_system=True,
                permissions=all_permissions
            )
            db.add(admin_role)
            print("✓ Created Administrator role")
        
        # Manager role
        manager_role = db.query(Role).filter(Role.name == "Manager").first()
        if not manager_role:
            manager_perms = db.query(Permission).filter(
                Permission.name.in_([
                    "requests:read", "requests:approve", "users:read"
                ])
            ).all()
            manager_role = Role(
                name="Manager",
                description="Can approve access requests",
                is_system=True,
                permissions=manager_perms
            )
            db.add(manager_role)
            print("✓ Created Manager role")
        
        # Employee role
        employee_role = db.query(Role).filter(Role.name == "Employee").first()
        if not employee_role:
            employee_perms = db.query(Permission).filter(
                Permission.name.in_([
                    "requests:read", "requests:create", "systems:read"
                ])
            ).all()
            employee_role = Role(
                name="Employee",
                description="Regular employee access",
                is_system=True,
                permissions=employee_perms
            )
            db.add(employee_role)
            print("✓ Created Employee role")
        
        db.commit()
        
        # Create admin user
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                email="admin@tcell.tj",
                username="admin",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin123"),
                is_active=True,
                is_superuser=True,
                department="IT",
                position="System Administrator",
                roles=[admin_role]
            )
            db.add(admin_user)
            print("✓ Created admin user (username: admin, password: admin123)")
        
        # Create test manager
        manager_user = db.query(User).filter(User.username == "manager").first()
        if not manager_user:
            manager_user = User(
                email="manager@tcell.tj",
                username="manager",
                full_name="Test Manager",
                hashed_password=get_password_hash("manager123"),
                is_active=True,
                is_superuser=False,
                department="Operations",
                position="Department Manager",
                roles=[manager_role]
            )
            db.add(manager_user)
            db.flush()
            print("✓ Created manager user (username: manager, password: manager123)")
        
        # Create test employee
        employee_user = db.query(User).filter(User.username == "employee").first()
        if not employee_user:
            employee_user = User(
                email="employee@tcell.tj",
                username="employee",
                full_name="Test Employee",
                hashed_password=get_password_hash("employee123"),
                is_active=True,
                is_superuser=False,
                department="Operations",
                position="Specialist",
                manager_id=manager_user.id,
                roles=[employee_role]
            )
            db.add(employee_user)
            print("✓ Created employee user (username: employee, password: employee123)")
        
        db.commit()
        
        # Create example systems
        systems_data = [
            ("SAP ERP", "sap", "Enterprise resource planning system", SystemType.APPLICATION),
            ("Oracle DB", "oracle", "Production database", SystemType.DATABASE),
            ("VPN Access", "vpn", "Corporate VPN", SystemType.NETWORK),
            ("GitLab", "gitlab", "Source code repository", SystemType.APPLICATION),
        ]
        
        for name, code, desc, sys_type in systems_data:
            system = db.query(System).filter(System.code == code).first()
            if not system:
                system = System(
                    name=name,
                    code=code,
                    description=desc,
                    system_type=sys_type,
                    is_active=True,
                    owner_id=admin_user.id
                )
                db.add(system)
                db.flush()
                
                # Add access roles
                if code == "sap":
                    roles_data = [
                        ("Read Only", "sap_read", "View only access", AccessLevel.READ, 1),
                        ("User", "sap_user", "Standard user access", AccessLevel.WRITE, 2),
                        ("Administrator", "sap_admin", "Full admin access", AccessLevel.ADMIN, 3),
                    ]
                elif code == "oracle":
                    roles_data = [
                        ("Read Only", "oracle_read", "SELECT only", AccessLevel.READ, 1),
                        ("Developer", "oracle_dev", "DML access", AccessLevel.WRITE, 2),
                        ("DBA", "oracle_dba", "Full DBA rights", AccessLevel.ADMIN, 3),
                    ]
                elif code == "vpn":
                    roles_data = [
                        ("Basic VPN", "vpn_basic", "Standard VPN access", AccessLevel.WRITE, 1),
                        ("Admin VPN", "vpn_admin", "Administrative VPN", AccessLevel.ADMIN, 2),
                    ]
                else:
                    roles_data = [
                        ("Developer", "gitlab_dev", "Developer access", AccessLevel.WRITE, 1),
                        ("Maintainer", "gitlab_maint", "Maintainer access", AccessLevel.ADMIN, 2),
                    ]
                
                for role_name, role_code, role_desc, access_level, risk in roles_data:
                    access_role = AccessRole(
                        system_id=system.id,
                        name=role_name,
                        code=role_code,
                        description=role_desc,
                        access_level=access_level,
                        risk_level=risk,
                        is_active=True
                    )
                    db.add(access_role)
                
                print(f"✓ Created system: {name}")
        
        db.commit()
        
        print("\n" + "="*50)
        print("Database initialized successfully!")
        print("="*50)
        print("\nDefault users:")
        print("  Admin:    username='admin'    password='admin123'")
        print("  Manager:  username='manager'  password='manager123'")
        print("  Employee: username='employee' password='employee123'")
        print("\n⚠️  IMPORTANT: Change default passwords in production!")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
