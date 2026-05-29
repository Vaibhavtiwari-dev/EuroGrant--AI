import boto3
import os
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.region_name = os.getenv("AWS_SES_REGION", "eu-central-1")
        self.sender_email = os.getenv("SES_SENDER_EMAIL", "alerts@eurogrant.ai")
        self.is_offline = not (self.aws_access_key and self.aws_secret_key)
        
        if not self.is_offline:
            try:
                self.ses_client = boto3.client(
                    "ses",
                    aws_access_key_id=self.aws_access_key,
                    aws_secret_access_key=self.aws_secret_key,
                    region_name=self.region_name
                )
                logger.info(f"NotificationService initialized with AWS SES in region: {self.region_name}")
            except Exception as e:
                logger.error(f"Failed to initialize AWS SES client: {e}. Falling back to offline mode.")
                self.is_offline = True
        else:
            logger.info("NotificationService initialized in Offline Mock mode (no AWS credentials provided).")

    def send_match_alert(self, email: str, grant_title: str, score: float, explanation: str) -> bool:
        """
        Dispatches a beautifully styled HTML match alert email to the user.
        Integrates with AWS SES or falls back gracefully to logging in offline mode.
        """
        display_score = int(score * 100) if score <= 1.0 else int(score)
        
        subject = f"🔥 New High-Compatibility Grant Match: {grant_title} ({display_score}% Match)"
        
        dashboard_url = os.getenv("APP_BASE_URL", "https://eurogrant.ai")

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    background-color: #0b0f19;
                    color: #e2e8f0;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 40px auto;
                    background-color: #111827;
                    border: 1px solid #1f2937;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
                }}
                .header {{
                    background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
                    padding: 30px;
                    text-align: center;
                    border-bottom: 2px solid #b45309;
                }}
                .logo {{
                    color: #34d399;
                    font-size: 24px;
                    font-weight: bold;
                    letter-spacing: -0.05em;
                }}
                .logo-highlight {{
                    color: #ffffff;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                .title {{
                    font-size: 20px;
                    font-weight: 800;
                    color: #ffffff;
                    margin-bottom: 20px;
                }}
                .metric-bar {{
                    background-color: #0b0f19;
                    border: 1px solid #374151;
                    padding: 15px 20px;
                    border-radius: 8px;
                    margin-bottom: 35px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }}
                .score-badge {{
                    background-color: rgba(16, 185, 129, 0.1);
                    color: #34d399;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-weight: 900;
                    font-size: 14px;
                }}
                .verdict-box {{
                    background-color: rgba(180, 83, 9, 0.05);
                    border: 1px solid rgba(180, 83, 9, 0.2);
                    border-left: 4px solid #b45309;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 35px;
                    font-style: italic;
                    line-height: 1.6;
                }}
                .action-button {{
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    background-color: #b45309;
                    color: #ffffff !important;
                    text-decoration: none;
                    text-align: center;
                    padding: 15px 25px;
                    font-weight: bold;
                    border-radius: 8px;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    transition: background-color 0.2s;
                }}
                .footer {{
                    background-color: #0b0f19;
                    padding: 20px;
                    text-align: center;
                    font-size: 11px;
                    color: #4b5563;
                    border-top: 1px solid #1f2937;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <span class="logo">EuroGrant <span class="logo-highlight">AI</span></span>
                </div>
                <div class="content">
                    <h2 class="title">Match Alert: {grant_title}</h2>
                    
                    <div class="metric-bar">
                        <span style="font-weight: bold; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Match Probability</span>
                        <span class="score-badge">{display_score}% Match Score</span>
                    </div>
                    
                    <div class="verdict-box">
                        <strong>AI Synergy Verdict:</strong><br/>
                        "{explanation}"
                    </div>
                    
                    <a href="{dashboard_url}/dashboard" class="action-button">Access Workspace & Draft Proposal</a>
                </div>
                <div class="footer">
                    This is an automated intelligence notification from EuroGrant AI.<br/>
                    You received this email because active matching rules were configured under your organization profile.<br/>
                    © 2026 EuroGrant OÜ. Tallinn, Estonia.
                </div>
            </div>
        </body>
        </html>
        """
        
        if self.is_offline:
            logger.info("-------------------- OFFLINE EMAIL OUTBOX MOCK --------------------")
            logger.info(f"TO: {email}")
            logger.info(f"FROM: {self.sender_email}")
            logger.info(f"SUBJECT: {subject}")
            logger.info(f"AI EXPLANATION: {explanation}")
            logger.info("-------------------------------------------------------------------")
            return True
            
        try:
            response = self.ses_client.send_email(
                Source=self.sender_email,
                Destination={
                    "ToAddresses": [email]
                },
                Message={
                    "Subject": {
                        "Data": subject,
                        "Charset": "UTF-8"
                    },
                    "Body": {
                        "Html": {
                            "Data": html_body,
                            "Charset": "UTF-8"
                        }
                    }
                }
            )
            logger.info(f"Successfully sent match email alert via AWS SES to {email}. MessageID: {response['MessageId']}")
            return True
        except ClientError as e:
            logger.error(f"AWS SES email delivery failed to {email}: {e.response['Error']['Message']}")
            return False
        except Exception as e:
            logger.error(f"Unexpected email dispatcher exception: {e}")
            return False

notification_service = NotificationService()
