import os
import logging
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.notification_backend = os.getenv("NOTIFICATION_BACKEND", "ses").lower()
        self.sender_email = os.getenv("SES_SENDER_EMAIL", "noreply@eurogrant.ai")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        # Check if AWS credentials are valid or placeholder
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID", "")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "")
        
        is_dummy_key = (
            not aws_access_key 
            or aws_access_key.startswith("your_") 
            or not aws_secret_key 
            or aws_secret_key.startswith("your_")
        )
        
        if self.notification_backend == "local" or is_dummy_key:
            self.use_ses = False
            self.client = None
            logger.info("NotificationService initialized in LOCAL fallback logging mode.")
        else:
            self.use_ses = True
            ses_region = os.getenv("AWS_SES_REGION") or os.getenv("AWS_REGION") or "eu-central-1"
            try:
                self.client = boto3.client(
                    "ses",
                    aws_access_key_id=aws_access_key,
                    aws_secret_access_key=aws_secret_key,
                    region_name=ses_region
                )
                logger.info(f"NotificationService initialized with AWS SES in region {ses_region}.")
            except Exception as e:
                logger.error(f"Failed to initialize AWS SES client: {e}. Falling back to local logging.")
                self.use_ses = False
                self.client = None

    def send_match_alert(self, email: str, grant_title: str, score: float, explanation: str) -> bool:
        """
        Sends an email notification to a user about a high-compatibility grant match.
        If AWS SES is not configured or fails, logs the notification content as fallback.
        """
        subject = f"[EuroGrant AI] New Match Alert: {grant_title}"
        score_percentage = score * 100
        
        # Craft HTML body using professional Emerald and Copper brand accent guidelines
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Grant Match Opportunity</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f5f6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }}
        .wrapper {{
            width: 100%;
            background-color: #f4f5f6;
            padding: 40px 0;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border-top: 5px solid #064e3b; /* Emerald accent */
        }}
        .header {{
            background-color: #064e3b;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.025em;
        }}
        .header h1 span {{
            color: #d97706; /* Copper/Gold accent */
        }}
        .content {{
            padding: 40px 30px;
        }}
        .match-badge {{
            display: inline-block;
            background-color: #d1fae5;
            color: #065f46;
            font-size: 16px;
            font-weight: 700;
            padding: 8px 16px;
            border-radius: 9999px;
            margin-bottom: 24px;
            border: 1px solid #a7f3d0;
        }}
        .grant-title {{
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            margin-top: 0;
            margin-bottom: 12px;
        }}
        .explanation-box {{
            background-color: #f9fafb;
            border-left: 4px solid #d97706; /* Copper left border */
            padding: 16px;
            margin: 24px 0;
            font-style: italic;
            color: #4b5563;
        }}
        .cta-button {{
            display: inline-block;
            background-color: #064e3b;
            color: #ffffff !important;
            font-weight: 600;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            margin-top: 16px;
            text-align: center;
        }}
        .cta-button:hover {{
            background-color: #043e2f;
        }}
        .footer {{
            background-color: #f9fafb;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
        }}
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>EuroGrant <span>AI</span></h1>
            </div>
            <div class="content">
                <div class="match-badge">
                    ★ {score_percentage:.1f}% Compatibility Match
                </div>
                <h2 class="grant-title">{grant_title}</h2>
                <p>Hello,</p>
                <p>We found a new EU grant opportunity that matches your company profile. Below is the compatibility assessment generated by our AI system:</p>
                
                <div class="explanation-box">
                    "{explanation}"
                </div>
                
                <p>To view full details, download documentation, or start drafting your grant proposal using our automated RAG engine, visit your dashboard.</p>
                
                <a href="{self.frontend_url}/dashboard" class="cta-button">View Match in Dashboard</a>
            </div>
            <div class="footer">
                <p>&copy; 2026 EuroGrant AI. All rights reserved.</p>
                <p>You received this email because email alerts are enabled for your organization.</p>
            </div>
        </div>
    </div>
</body>
</html>
"""

        text_content = (
            f"EuroGrant AI - New Match Alert\n\n"
            f"We found a new grant matching your profile with {score_percentage:.1f}% compatibility!\n\n"
            f"Grant: {grant_title}\n\n"
            f"Why it matches:\n{explanation}\n\n"
            f"View on dashboard: {self.frontend_url}/dashboard"
        )
        
        if not self.use_ses:
            logger.info("=== FALLBACK EMAIL NOTIFICATION LOG ===")
            logger.info(f"To: {email}")
            logger.info(f"Subject: {subject}")
            logger.info(f"Body (Text):\n{text_content}")
            logger.info("=======================================")
            return True

        try:
            response = self.client.send_email(
                Source=self.sender_email,
                Destination={
                    "ToAddresses": [email],
                },
                Message={
                    "Subject": {
                        "Data": subject,
                        "Charset": "UTF-8"
                    },
                    "Body": {
                        "Text": {
                            "Data": text_content,
                            "Charset": "UTF-8"
                        },
                        "Html": {
                            "Data": html_content,
                            "Charset": "UTF-8"
                        }
                    }
                }
            )
            logger.info(f"Email sent successfully via AWS SES to {email}. MessageID: {response.get('MessageId')}")
            return True
        except ClientError as e:
            logger.error(f"AWS SES send_email failed: {e}. Falling back to logging.")
            logger.info("=== FALLBACK EMAIL NOTIFICATION LOG (SES FAILED) ===")
            logger.info(f"To: {email}")
            logger.info(f"Subject: {subject}")
            logger.info(f"Body (Text):\n{text_content}")
            logger.info("================================================")
            return True
        except Exception as e:
            logger.error(f"Unexpected error in NotificationService.send_match_alert: {e}")
            return False

notification_service = NotificationService()
