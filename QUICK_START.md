# IDM System - Быстрый старт

## Минимальная установка (для тестирования)

### 1. Установка зависимостей

```bash
# От root
cd /opt
git clone <your-repo> idm-system  # или скопируйте файлы
cd idm-system
chmod +x deployment/scripts/install.sh
./deployment/scripts/install.sh
```

### 2. Настройка PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE idm_db;
CREATE USER idm_user WITH ENCRYPTED PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE idm_db TO idm_user;
\q
```

Разрешить подключения:
```bash
sudo nano /var/lib/pgsql/15/data/pg_hba.conf
```

Добавить:
```
local   idm_db    idm_user                     md5
host    idm_db    idm_user    127.0.0.1/32     md5
```

Перезапустить:
```bash
sudo systemctl restart postgresql
```

### 3. Установка приложения

```bash
sudo -u idm bash
cd /opt/idm-system
./deployment/scripts/setup.sh
```

Отредактировать `.env`:
```bash
nano backend/.env
# Измените DATABASE_URL с правильным паролем
```

Инициализировать БД:
```bash
source venv/bin/activate
cd backend
python init_db.py
```

### 4. Запуск

#### Вариант А: Через SystemD (рекомендуется)

```bash
# От root
sudo cp deployment/systemd/idm-backend.service /etc/systemd/system/
sudo cp deployment/nginx/idm.conf /etc/nginx/conf.d/
sudo systemctl daemon-reload
sudo systemctl enable --now idm-backend
sudo systemctl enable --now nginx
sudo systemctl status idm-backend
```

#### Вариант Б: Вручную (для разработки)

Терминал 1 (Backend):
```bash
cd /opt/idm-system/backend
source ../venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Терминал 2 (Frontend):
```bash
cd /opt/idm-system/frontend
npm run dev
```

### 5. Доступ

- URL: http://YOUR_SERVER_IP (или http://idm.tcell.tj)
- Логин: `admin`
- Пароль: `admin123`

**⚠️ Сразу смените пароль!**

## Проверка

```bash
# Проверка backend
curl http://localhost:8000/api/health

# Логи
sudo journalctl -u idm-backend -f
sudo tail -f /var/log/idm/error.log

# Статус
sudo systemctl status idm-backend nginx postgresql
```

## Firewall

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## SSL (Let's Encrypt)

```bash
sudo dnf install certbot python3-certbot-nginx -y
sudo certbot --nginx -d idm.tcell.tj
```

## Backup

```bash
# Создать backup
sudo -u postgres pg_dump idm_db > /opt/backups/idm_$(date +%Y%m%d).sql

# Восстановить
sudo -u postgres psql idm_db < /opt/backups/idm_20250116.sql
```

## Troubleshooting

**Backend не стартует:**
```bash
sudo systemctl status idm-backend
sudo journalctl -u idm-backend -n 50
```

**Нет подключения к БД:**
```bash
# Проверить pg_hba.conf
sudo cat /var/lib/pgsql/15/data/pg_hba.conf

# Проверить подключение
psql -U idm_user -d idm_db -h localhost
```

**Frontend не отображается:**
```bash
# Проверить nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```
