import os
import smtplib
from email.mime.text import MIMEText
from config import SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, ENV

def send_email(to: str, subject: str, body: str):
    """
    Отправка электронного письма.
    В режиме разработки (dev) письма не отправляются, а выводятся в консоль.
    """
    if ENV == "dev":
        print("\n" + "="*50)
        print(f"SIMULATED EMAIL TO: {to}")
        print(f"SUBJECT: {subject}")
        print("-"*50)
        print(body)
        print("="*50 + "\n")
        return
    
    # Создание сообщения
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to

    # Отправка через SMTP сервер
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)

def send_welcome_email(email: str):
    """Отправка приветственного письма новому клиенту"""
    subject = "Добро пожаловать на Gert.pro! 🎉"
    body = f"""Привет!
Поздравляем с успешной регистрацией на Gert.pro! 
Ваш логин: {email}
Вы можете ознакомиться с нашими тарифами..."""
    
    send_email(email, subject, body)

def send_talent_portrait_report(email: str, report_url: str, report_type: str = "respondent"):
    if report_type == "respondent":
        subject = "Ваш результат исследования Портрет талантов готов"
        body = f"""Здравствуйте!

Ваш результат исследования "Портрет талантов" готов.

Вы можете ознакомиться с ним по ссылке: {report_url}

С уважением,
Команда платформы Gert.pro
"""
    else:
        subject = "Результат исследования Портрет талантов"
        body = f"""Здравствуйте!

Результат исследования "Портрет талантов" для сотрудника готов.

Вы можете ознакомиться с отчетом по ссылке: {report_url}

С уважением,
Команда платформы Gert.pro
"""
    
    send_email(email, subject, body)