from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

def extract():
    print("Extracting data...")

def transform():
    print("Transforming data...")

def load_success():
    print("Loading data successfully...")

def load_fail():
    # Simulate an error (e.g., missing column or bad type)
    raise ValueError("❌ Load step failed: Missing required field 'customer_id'")

with DAG(
    dag_id="failed_lineage_dag",
    start_date=datetime(2024, 1, 1),
    schedule=None,
    catchup=False,
    tags=["lineage", "failure-demo"],
) as dag:
    extract_task = PythonOperator(task_id="extract", python_callable=extract)
    transform_task = PythonOperator(task_id="transform", python_callable=transform)
    load_task = PythonOperator(task_id="load_fail", python_callable=load_fail)

    extract_task >> transform_task >> load_task
            