# In file: app/core/logging_config.py
import logging
import sys

def setup_logging():
    """Configures the root logger for the application."""
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        root_logger.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)