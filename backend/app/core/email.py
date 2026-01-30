import smtplib
import secrets
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


def generate_2fa_code() -> str:
    """Generate a cryptographically secure 6-digit 2FA code"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))


def send_2fa_email(to_email: str, code: str, username: str) -> bool:
    """Send 2FA code via email"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'IDM System - Код подтверждения: {code}'
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = to_email

        # HTML email body
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 30px; border-radius: 10px;">
                <h2 style="color: #1a3d7a; margin-bottom: 20px;">IDM System - Двухфакторная аутентификация</h2>
                <p>Здравствуйте, <strong>{username}</strong>!</p>
                <p>Ваш код подтверждения для входа в систему:</p>
                <div style="background: #1a3d7a; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
                    {code}
                </div>
                <p style="color: #666;">Код действителен в течение <strong>{settings.TWOFA_CODE_EXPIRE_MINUTES} минут</strong>.</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Если вы не запрашивали этот код, проигнорируйте это сообщение.
                </p>
            </div>
        </body>
        </html>
        """

        # Plain text fallback
        text = f"""
        IDM System - Двухфакторная аутентификация

        Здравствуйте, {username}!

        Ваш код подтверждения: {code}

        Код действителен в течение {settings.TWOFA_CODE_EXPIRE_MINUTES} минут.
        """

        part1 = MIMEText(text, 'plain', 'utf-8')
        part2 = MIMEText(html, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)

        # Send email
        if settings.SMTP_PASSWORD:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())
            return True
        else:
            # If no SMTP password, log the code (for testing)
            print(f"[2FA] Code for {username}: {code} (email not sent - no SMTP password)")
            return True

    except Exception as e:
        print(f"[2FA] Error sending email: {e}")
        return False
