"""Email Sender Utility
Sends emails via Gmail SMTP using an App Password.
Supports optional PDF attachment (tailored resume).
"""
import os
import smtplib
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from dotenv import load_dotenv

load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def send_email(
    to: str,
    subject: str,
    body: str,
    pdf_base64: str = "",
    attachment_filename: str = "tailored_resume.pdf",
) -> dict:
    """
    Send an email via Gmail SMTP.

    Args:
        to:                  Recipient email address.
        subject:             Email subject line.
        body:                Plain-text email body.
        pdf_base64:          Base64-encoded PDF bytes (optional resume attachment).
        attachment_filename: Filename shown on the attachment.

    Returns:
        {"success": True} or {"success": False, "error": "<message>"}
    """
    if not EMAIL_USER or not EMAIL_PASSWORD:
        print("[Email] EMAIL_USER / EMAIL_PASSWORD not configured — skipping send.")
        return {
            "success": False,
            "error": "Email credentials not configured. Add EMAIL_USER and EMAIL_PASSWORD to .env",
        }

    try:
        msg = MIMEMultipart()
        msg["From"] = EMAIL_USER
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        # Attach PDF resume if provided
        if pdf_base64:
            try:
                pdf_bytes = base64.b64decode(pdf_base64)
                part = MIMEApplication(pdf_bytes, _subtype="pdf")
                part.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=attachment_filename,
                )
                msg.attach(part)
            except Exception as e:
                print(f"[Email] Failed to attach PDF: {e}")

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_USER, to, msg.as_string())

        return {"success": True, "to": to, "subject": subject}

    except smtplib.SMTPAuthenticationError:
        return {
            "success": False,
            "error": "Gmail authentication failed. Check EMAIL_USER and EMAIL_PASSWORD (use App Password, not account password).",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
