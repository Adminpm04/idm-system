# IDM System - Структура проекта

## Основные компоненты

### Backend (Python/FastAPI)
- **Фреймворк**: FastAPI 0.109.0
- **БД**: PostgreSQL 15
- **ORM**: SQLAlchemy 2.0
- **Аутентификация**: JWT (python-jose)
- **Миграции**: Alembic

### Frontend (React)
- **Библиотека**: React 18
- **Сборщик**: Vite 5
- **Стили**: Tailwind CSS 3
- **Маршрутизация**: React Router 6
- **HTTP клиент**: Axios

### Deployment
- **Web-сервер**: Nginx
- **WSGI**: Gunicorn + Uvicorn workers
- **Process manager**: SystemD
- **OS**: Oracle Linux 9.5

## Структура директорий

```
idm-system/
│
├── backend/                      # Backend приложение
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py          # Зависимости (auth, permissions)
│   │   │   └── endpoints/
│   │   │       ├── auth.py      # Аутентификация
│   │   │       ├── users.py     # Управление пользователями
│   │   │       ├── systems.py   # Системы и роли доступа
│   │   │       ├── requests.py  # Заявки на доступ
│   │   │       └── admin.py     # Админ-панель
│   │   ├── core/
│   │   │   ├── config.py        # Конфигурация
│   │   │   └── security.py      # JWT, хеширование
│   │   ├── crud/                # CRUD операции (optional)
│   │   ├── db/
│   │   │   └── session.py       # БД сессия
│   │   ├── models/
│   │   │   ├── user.py          # User, Role, Permission
│   │   │   ├── system.py        # System, AccessRole, ApprovalChain
│   │   │   ├── request.py       # AccessRequest, Approval, Comment
│   │   │   └── recertification.py  # Recertification
│   │   ├── schemas/
│   │   │   ├── user.py          # Pydantic schemas для users
│   │   │   ├── system.py        # Schemas для систем
│   │   │   └── request.py       # Schemas для заявок
│   │   ├── services/            # Бизнес-логика (optional)
│   │   └── main.py              # FastAPI app
│   ├── alembic/
│   │   ├── versions/            # Миграции БД
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── tests/                   # Тесты
│   ├── requirements.txt         # Python зависимости
│   ├── alembic.ini
│   ├── .env.example
│   └── init_db.py               # Инициализация БД

│
├── frontend/                     # Frontend приложение
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Общие компоненты
│   │   │   ├── admin/           # Админ компоненты
│   │   │   ├── requests/        # Компоненты заявок
│   │   │   └── dashboard/       # Дашборд
│   │   ├── pages/               # Страницы
│   │   ├── services/
│   │   │   └── api.js           # API клиент
│   │   ├── store/               # State management (optional)
│   │   ├── utils/               # Утилиты
│   │   ├── App.jsx              # Главный компонент
│   │   ├── main.jsx             # Entry point
│   │   └── index.css            # Стили
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env

│
├── deployment/                   # Деплой конфигурации
│   ├── nginx/
│   │   └── idm.conf             # Nginx конфиг
│   ├── systemd/
│   │   └── idm-backend.service  # SystemD сервис
│   └── scripts/
│       ├── install.sh           # Установка зависимостей
│       └── setup.sh             # Настройка приложения

│
├── docs/                         # Документация
├── README.md                     # Главная документация
├── QUICK_START.md               # Быстрый старт
├── PROJECT_STRUCTURE.md         # Этот файл
└── .gitignore

```

## Основные модели данных

### User (Пользователь)
- id, email, username, full_name, hashed_password
- is_active, is_superuser
- department, position, manager_id
- roles (many-to-many с Role)

### Role (Роль)
- id, name, description, is_system
- permissions (many-to-many с Permission)

### Permission (Право)
- id, name, description
- resource, action (напр. "requests", "approve")

### System (Система)
- id, name, code, description
- system_type (application/database/network/cloud)
- owner_id
- access_roles (one-to-many с AccessRole)

### AccessRole (Роль доступа в системе)
- id, system_id, name, code
- access_level (read/write/admin/full)
- risk_level (1-3)

### ApprovalChain (Цепочка согласования)
- id, system_id, access_role_id
- step_number, approver_role, approver_user_id
- is_required

### AccessRequest (Заявка на доступ)
- id, request_number, requester_id, target_user_id
- system_id, access_role_id
- request_type, status, purpose
- is_temporary, valid_from, valid_until
- current_step
- approvals (one-to-many с Approval)
- comments (one-to-many с RequestComment)

### Approval (Согласование)
- id, request_id, step_number
- approver_id, approver_role
- status, decision_date, comment

### AccessRecertification (Переутверждение)
- id, user_id, system_id, access_role_id
- reviewer_id, status, due_date

## API Endpoints

### Auth
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/auth/me

### Users
- GET /api/users
- POST /api/users
- GET /api/users/{id}
- PUT /api/users/{id}
- POST /api/users/{id}/change-password

### Systems
- GET /api/systems
- POST /api/systems
- GET /api/systems/{id}
- PUT /api/systems/{id}
- GET /api/systems/{id}/roles
- POST /api/systems/{id}/roles

### Requests
- GET /api/requests/my-requests
- GET /api/requests/my-approvals
- GET /api/requests/statistics
- POST /api/requests
- GET /api/requests/{id}
- POST /api/requests/{id}/submit
- POST /api/requests/{id}/approve
- POST /api/requests/{id}/comments

### Admin
- GET /api/admin/roles
- POST /api/admin/roles
- GET /api/admin/permissions
- GET /api/admin/audit-logs

## Branding

**Цвета Орибёнбонк:**
- Primary: `#16306C` (темно-синий)
- Secondary: `#F9BF3F` (золотой)

**Используется в:**
- Tailwind config: `primary` и `secondary`
- CSS классы: `.text-primary`, `.bg-secondary`
- Логотип и заголовки

## Технические особенности

### Безопасность
- JWT аутентификация с refresh токенами
- Bcrypt для паролей (10 раундов)
- HTTPS обязателен для production
- CORS настроен
- SQL injection защита (SQLAlchemy ORM)
- XSS защита (React)

### Performance
- Gunicorn с 4 workers
- PostgreSQL connection pooling
- Frontend code splitting (Vite)
- Static assets caching (nginx)

### Мониторинг
- SystemD журналирование
- Access/Error логи nginx
- Application логи в /var/log/idm/

### Backup
- PostgreSQL pg_dump
- Конфигурационные файлы
- Frontend build artifacts

## Процесс разработки

### Backend разработка
```bash
cd backend
source ../venv/bin/activate
uvicorn app.main:app --reload
```

### Frontend разработка
```bash
cd frontend
npm run dev
```

### Миграции БД
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Тесты
```bash
cd backend
pytest
```

## Production checklist

- [ ] Изменить SECRET_KEY
- [ ] Сменить пароли по умолчанию
- [ ] Настроить HTTPS (Let's Encrypt)
- [ ] Настроить firewall
- [ ] Настроить backup (cron)
- [ ] Настроить мониторинг
- [ ] Настроить email уведомления (optional)
- [ ] Отключить DEBUG режим
- [ ] Настроить логирование
- [ ] Настроить fail2ban (optional)

## Поддержка

Контакт: Системный администратор Tcell
