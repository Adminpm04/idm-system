# IDM System (Identity & Access Management)

Система управления доступами с полным циклом согласования заявок.

## Возможности

✅ **Управление заявками на доступ**
- Создание, редактирование, отправка заявок
- Статусы: Draft → Submitted → In Review → Approved/Rejected → Implemented
- Временные доступы с авто-отзывом
- Полная прозрачность процесса для инициатора

✅ **Цепочки согласований**
- Многоуровневое согласование
- Настраиваемые роли согласующих
- Автоматическая маршрутизация заявок

✅ **Аудит и прозрачность**
- Полная история всех действий
- Кто, когда, что одобрил/отклонил
- Комментарии на каждом этапе

✅ **Переутверждение доступов (Recertification)**
- Периодическая проверка актуальности доступов
- Уведомления руководителям
- Автоматический отзыв просроченных доступов

✅ **Административная панель**
- Управление пользователями, ролями, правами
- Управление системами и типами доступа
- Настройка цепочек согласования

## Технологический стек

**Backend:**
- Python 3.11+
- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic (миграции)
- JWT аутентификация

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Axios
- React Router

**Deployment:**
- Nginx (reverse proxy)
- Gunicorn/Uvicorn
- SystemD

## Установка на Oracle Linux 9.5

### 1. Установка зависимостей

```bash
# Обновление системы
sudo dnf update -y

# Python 3.11
sudo dnf install python3.11 python3.11-pip python3.11-devel -y

# PostgreSQL 15
sudo dnf install postgresql15-server postgresql15-contrib -y
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

# Node.js 20 (для frontend)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install nodejs -y

# Nginx
sudo dnf install nginx -y
sudo systemctl enable nginx

# Git
sudo dnf install git -y

# Build tools
sudo dnf groupinstall "Development Tools" -y
sudo dnf install gcc libpq-devel -y
```

### 2. Настройка PostgreSQL

```bash
# Переключиться на пользователя postgres
sudo -u postgres psql

# В psql выполнить:
CREATE DATABASE idm_db;
CREATE USER idm_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE idm_db TO idm_user;
\q

# Разрешить подключение
sudo nano /var/lib/pgsql/15/data/pg_hba.conf
# Добавить строку:
# local   idm_db          idm_user                                md5
# host    idm_db          idm_user        127.0.0.1/32            md5

sudo systemctl restart postgresql
```

### 3. Установка Backend

```bash
# Клонирование/копирование проекта
cd /opt
sudo mkdir idm-system
sudo chown $USER:$USER idm-system
cd idm-system

# Создание виртуального окружения
python3.11 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install --upgrade pip
pip install -r backend/requirements.txt

# Настройка переменных окружения
cp backend/.env.example backend/.env
nano backend/.env
# Изменить DATABASE_URL и SECRET_KEY

# Инициализация БД (миграции)
cd backend
alembic upgrade head

# Создание первого суперпользователя
python -c "
from app.db.session import SessionLocal
from app.models import User
from app.core.security import get_password_hash

db = SessionLocal()
user = User(
    email='admin@tcell.tj',
    username='admin',
    full_name='System Administrator',
    hashed_password=get_password_hash('admin123'),
    is_active=True,
    is_superuser=True
)
db.add(user)
db.commit()
print('Superuser created!')
"

# Тестовый запуск
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4. Установка Frontend

```bash
cd /opt/idm-system/frontend

# Установка зависимостей
npm install

# Настройка API endpoint
nano .env
# Добавить:
# VITE_API_URL=http://localhost:8000/api

# Сборка для production
npm run build

# Результат в папке dist/
```

### 5. Настройка Nginx

```bash
sudo nano /etc/nginx/conf.d/idm.conf
```

```nginx
server {
    listen 80;
    server_name idm.tcell.tj;

    # Frontend
    location / {
        root /opt/idm-system/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Проверка конфига
sudo nginx -t

# Перезапуск
sudo systemctl restart nginx
```

### 6. SystemD Service для Backend

```bash
sudo nano /etc/systemd/system/idm-backend.service
```

```ini
[Unit]
Description=IDM System Backend
After=network.target postgresql.service

[Service]
Type=notify
User=idm
Group=idm
WorkingDirectory=/opt/idm-system/backend
Environment="PATH=/opt/idm-system/venv/bin"
ExecStart=/opt/idm-system/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/idm/access.log \
    --error-logfile /var/log/idm/error.log

Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Создание пользователя
sudo useradd -r -s /bin/false idm
sudo chown -R idm:idm /opt/idm-system

# Создание папки для логов
sudo mkdir /var/log/idm
sudo chown idm:idm /var/log/idm

# Запуск сервиса
sudo systemctl daemon-reload
sudo systemctl enable idm-backend
sudo systemctl start idm-backend
sudo systemctl status idm-backend
```

### 7. Firewall

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 8. SSL (опционально с Let's Encrypt)

```bash
sudo dnf install certbot python3-certbot-nginx -y
sudo certbot --nginx -d idm.tcell.tj
```

## Первый запуск

1. Откройте http://idm.tcell.tj
2. Войдите с учетными данными:
   - Username: `admin`
   - Password: `admin123`
3. **Обязательно смените пароль!**

## Структура проекта

```
idm-system/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── endpoints/
│   │   │       ├── auth.py
│   │   │       ├── users.py
│   │   │       ├── systems.py
│   │   │       ├── requests.py
│   │   │       └── admin.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── crud/
│   │   ├── db/
│   │   │   └── session.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── system.py
│   │   │   ├── request.py
│   │   │   └── recertification.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── system.py
│   │   │   └── request.py
│   │   ├── services/
│   │   └── main.py
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   └── App.jsx
│   ├── public/
│   └── package.json
└── deployment/
    ├── nginx/
    └── systemd/
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токена
- `GET /api/auth/me` - Текущий пользователь

### Users
- `GET /api/users` - Список пользователей
- `POST /api/users` - Создать пользователя
- `GET /api/users/{id}` - Детали пользователя
- `PUT /api/users/{id}` - Обновить пользователя
- `DELETE /api/users/{id}` - Удалить пользователя

### Systems
- `GET /api/systems` - Список систем
- `POST /api/systems` - Создать систему
- `GET /api/systems/{id}` - Детали системы
- `PUT /api/systems/{id}` - Обновить систему

### Access Requests
- `GET /api/requests` - Список заявок
- `POST /api/requests` - Создать заявку
- `GET /api/requests/{id}` - Детали заявки
- `POST /api/requests/{id}/submit` - Отправить на согласование
- `POST /api/requests/{id}/approve` - Согласовать
- `POST /api/requests/{id}/reject` - Отклонить
- `POST /api/requests/{id}/comments` - Добавить комментарий

### Admin
- `GET /api/admin/roles` - Управление ролями
- `GET /api/admin/permissions` - Управление правами
- `GET /api/admin/audit-logs` - Журнал аудита
- `GET /api/admin/statistics` - Статистика

## Branding (Орибёнбонк)

Цвета бренда:
- Primary: `#16306C` (темно-синий)
- Secondary: `#F9BF3F` (золотой)

## Безопасность

- JWT токены с истечением срока
- Bcrypt для хеширования паролей
- HTTPS обязателен для production
- CORS настроен для разрешенных доменов
- SQL injection защита через SQLAlchemy ORM
- XSS защита на уровне React

## Мониторинг

```bash
# Логи backend
sudo journalctl -u idm-backend -f

# Логи nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Статус сервисов
sudo systemctl status idm-backend nginx postgresql
```

## Бэкап

```bash
# Бэкап БД
sudo -u postgres pg_dump idm_db > idm_backup_$(date +%Y%m%d).sql

# Восстановление
sudo -u postgres psql idm_db < idm_backup_20250116.sql
```

## Поддержка

Для вопросов и проблем обращайтесь к системному администратору.

## Лицензия

Internal use only - Tcell
