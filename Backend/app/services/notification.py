# File: app/services/notification_service.py

import os
import logging
import telegram
from telegram.constants import ParseMode
from app.api import models

logger = logging.getLogger(__name__)

# --- Low-Level Sender (Private) ---

async def _send_telegram_alert(message_body: str):
    """
    Sends a formatted message to the configured Telegram chat.
    This is a private helper function used by other functions in this service.
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        logger.warning("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set in the .env file. Skipping Telegram alert.")
        return

    try:
        bot = telegram.Bot(token=token)
        # Send the message using HTML parsing for rich formatting
        await bot.send_message(
            chat_id=chat_id, 
            text=message_body, 
            parse_mode=ParseMode.HTML,
            disable_web_page_preview=True # Prevents links from generating previews
        )
        logger.info(f"Successfully sent Telegram alert to chat ID {chat_id}")
    except Exception as e:
        logger.error(f"Failed to send Telegram alert: {e}")



async def send_data_quality_summary_notification(report: models.ExecuteQualityChecksResponse):
    """
    Analyzes a data quality report and sends a detailed, formatted Telegram alert
    if any of the checks have failed. This is the main function to be called by the API router.
    """
    # Filter the report to get only the checks that did not pass
    failed_checks = [result for result in report.validation_results if not result.is_valid]

    # If the list of failed checks is empty, do nothing and exit the function.
    if not failed_checks:
        logger.info(f"All data quality checks passed for table '{report.table_name}'. No notification needed.")
        return

    total_checks = len(report.validation_results)
    failed_count = len(failed_checks)
    passed_count = total_checks - failed_count
    
    # --- Build the Improved Message Step-by-Step ---
    
    # 1. Header with a clear status emoji and a bold summary
    header = f"🔴 <b>Data Quality Alert: {failed_count} of {total_checks} Checks Failed</b>"
    
    # 2. Sub-header with the specific table name and pass/fail statistics
    sub_header = f"Table: <code>{report.table_name}</code>\nPassed: {passed_count} | Failed: {failed_count}"
    
    # 3. A clear header for the list of failures
    failures_header = "\n<b>Failure Details:</b>"
    
    # 4. Create a formatted line item for each individual failure
    failure_lines = []
    for check in failed_checks:
        # The {:,} format automatically adds commas to large numbers (e.g., 1000 -> 1,000)
        invalid_rows = f"{check.invalid_count:,}"
        total_rows = f"{check.total_rows:,}"
        # Use italics for the rule name and bold for the failure count to draw attention
        failure_lines.append(f"• <i>{check.rule_name}</i>: <b>{invalid_rows}</b> of {total_rows} rows failed.")
    
    failures_body = "\n".join(failure_lines)
    
    # 5. A helpful footer with a call to action for the user
    footer = "\n<i>Please review the full report in the application dashboard for more details.</i>"
    
    # 6. Combine all parts into the final message string
    final_message = f"{header}\n\n{sub_header}\n{failures_header}\n{failures_body}\n\n{footer}"

    # Call the private sender function to dispatch the alert
    await _send_telegram_alert(final_message)


async def send_data_classification_alert(classification_report: models.ClassificationResponse):
    """
    Analyzes a classification report and sends an alert if new PII or Sensitive data is found.
    """
    sensitive_columns_found = []
    
    for table in classification_report.classification_results:
        for column in table.columns:
            if column.classification in [models.DataClassification.PII, models.DataClassification.SENSITIVE]:
                sensitive_columns_found.append(
                    f"• Table: <code>{table.table_name}</code>, Column: <code>{column.column_name}</code> (as <b>{column.classification.value}</b>)"
                )

    if not sensitive_columns_found:
        logger.info("Data classification run complete. No new sensitive data detected to alert on.")
        return

    count = len(sensitive_columns_found)
    
    header = f"🔔 <b>Data Governance Alert: {count} Sensitive Column(s) Detected</b>"
    sub_header = "The following columns have been automatically classified as containing PII or Sensitive data:"
    details_body = "\n".join(sensitive_columns_found)
    footer = "\n<i>Please review the classification and generate a data masking plan if necessary.</i>"
    
    final_message = f"{header}\n\n{sub_header}\n{details_body}\n\n{footer}"

    await _send_telegram_alert(final_message)