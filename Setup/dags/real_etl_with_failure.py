# FILE: your_dag_file.py

import logging
import json
import traceback
import socket
from datetime import datetime

import pendulum
from airflow.decorators import dag, task
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from openlineage.client.run import Dataset

# -------------------------------
# Lineage Datasets
# -------------------------------
source_dataset = Dataset(namespace="postgres://postgres:5432", name="public.raw_orders")
target_dataset = Dataset(namespace="postgres://postgres:5432", name="public.clean_orders")

# -------------------------------
# Audit Logging Function
# -------------------------------
def write_audit_log(
    dag_id, task_id, airflow_run_id, lineage_run_id, job_name,
    namespace, status, error=None, error_class=None,
    error_message=None, stack_trace=None, total_records=None,
    success_count=None, failure_count=None, failed_records=None,
    started_at=None, finished_at=None, extra=None
):
    """
    Writes a detailed audit record to the pipeline_audit_log table.
    """
    hook = PostgresHook(postgres_conn_id="postgres_default")
    hook.run(
        """
        INSERT INTO public.pipeline_audit_log (
            dag_id, task_id, airflow_run_id, lineage_run_id,
            job_name, namespace, status, error,
            error_class, error_message, stack_trace,
            total_records, success_count, failure_count, failed_records,
            started_at, finished_at, hostname, extra_metadata
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        parameters=(
            dag_id, task_id, airflow_run_id, lineage_run_id, job_name,
            namespace, status, error, error_class, error_message,
            stack_trace, total_records, success_count, failure_count,
            json.dumps(failed_records) if failed_records else None,
            started_at, finished_at, socket.gethostname(),
            json.dumps(extra or {})
        )
    )

# -------------------------------
# DAG Definition
# -------------------------------
@dag(
    dag_id="real_etl_pipeline_with_db_logging_full",
    start_date=pendulum.datetime(2024, 1, 1, tz="UTC"),
    schedule=None,
    catchup=False,
    tags=["lineage", "audit", "rca"]
)
def real_etl_pipeline_with_db_logging_full():

    create_tables = PostgresOperator(
        task_id="create_tables",
        postgres_conn_id="postgres_default",
        sql="""
        CREATE TABLE IF NOT EXISTS public.raw_orders (
            order_id VARCHAR(50), product VARCHAR(100), amount VARCHAR(50)
        );
        CREATE TABLE IF NOT EXISTS public.clean_orders (
            order_id VARCHAR(50) PRIMARY KEY, product VARCHAR(100), amount INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS public.pipeline_audit_log (
            audit_id BIGSERIAL PRIMARY KEY,
            dag_id TEXT,
            task_id TEXT,
            airflow_run_id TEXT,
            lineage_run_id TEXT,
            job_name TEXT,
            namespace TEXT,
            status TEXT,
            error TEXT,
            error_class TEXT,
            error_message TEXT,
            stack_trace TEXT,
            total_records INT,
            success_count INT,
            failure_count INT,
            failed_records JSONB,
            started_at TIMESTAMP,
            finished_at TIMESTAMP,
            hostname TEXT,
            extra_metadata JSONB
        );
        TRUNCATE TABLE public.raw_orders;
        TRUNCATE TABLE public.clean_orders;
        """
    )

    @task
    def extract_data() -> list:
        """
        Generates sample raw data. In a real scenario, this would read from a source system.
        """
        logging.info("Extracting raw data...")
        return [
            {"order_id": "101", "product": "Widget A", "amount": "50"},
            {"order_id": "102", "product": "Widget B", "amount": "120"},
            {"order_id": "103", "product": "Gadget", "amount": "ninety-nine"}, # Invalid amount
            {"order_id": "104", "product": "Widget C", "amount": "75"},
            {"order_id": "101", "product": "Widget A", "amount": "50"}, # Duplicate ID
        ]

    @task
    def transform_data(data: list) -> list:
        """
        Transforms data: attempts to convert 'amount' to an integer.
        This transformation is intentionally imperfect to demonstrate error handling.
        """
        logging.info("Transforming data...")
        transformed_data = []
        for record in data:
            try:
                new_record = record.copy()
                new_record["amount"] = int(record["amount"])
                transformed_data.append(new_record)
            except ValueError:
                logging.warning(f"Could not transform amount: {record['amount']}. Keeping original value.")
                transformed_data.append(record.copy()) # Keep the bad record to show loading failure
        return transformed_data

    @task(outlets=[target_dataset])
    def load_data(data: list, **context):
        """
        Loads data into the target table and writes a comprehensive audit log.
        Captures both record-level failures and critical task-level failures with full tracebacks.
        """
        # --- 1. SETUP CONTEXT AND LOGGING VARIABLES ---
        dag_id = context["dag"].dag_id
        task_id = context["task"].task_id
        airflow_run_id = context["run_id"]
        
        try:
            from openlineage.client.facet import ParentRunFacet
            parent_run_facet = ParentRunFacet.from_airflow_task_instance(context['ti'])
            lineage_run_id = parent_run_facet.run.runId
            job_name = parent_run_facet.job.name
            namespace = parent_run_facet.job.namespace
        except (ImportError, Exception):
            lineage_run_id = "not-found"
            job_name = dag_id
            namespace = "default"

        start = datetime.now()
        success_count = 0
        failed_records = []
        should_fail_task = False
        
        # Variables to hold details of a critical task-level exception
        task_error_class = None
        task_error_message = None
        task_stack_trace = None
        status = "SUCCESS" # Assume success initially

        hook = PostgresHook(postgres_conn_id="postgres_default")
        
        logging.info(f"Loading {len(data)} records into clean_orders...")
        try:
            with hook.get_conn() as conn:
                with conn.cursor() as cursor:
                    for record in data:
                        try:
                            cursor.execute(
                                "INSERT INTO public.clean_orders (order_id, product, amount) VALUES (%s, %s, %s);",
                                (record["order_id"], record["product"], record["amount"])
                            )
                            success_count += 1
                        except Exception as e:
                            conn.rollback() 
                            failed_records.append({
                                **record,
                                "error_class": type(e).__name__,
                                "error_message": str(e).strip()
                            })
                            logging.error(f"Failed to insert record {record}: {e}")
            
            if failed_records:
                status = "FAILED"
                should_fail_task = True

        # --- 2. CAPTURE FULL TRACEBACK ON CRITICAL FAILURE ---
        except Exception as e:
            status = "FAILED"
            should_fail_task = True
            task_error_class = type(e).__name__
            task_error_message = str(e)
            task_stack_trace = traceback.format_exc()
            logging.error(f"A critical error occurred during the load process: {task_error_message}")
            logging.error(f"TRACEBACK: {task_stack_trace}")

        finally:
            end = datetime.now()
            
            # --- 3. DETERMINE FINAL ERROR DETAILS FOR AUDIT LOG ---
            final_error_type = None
            final_error_class = None
            final_error_message = None
            final_stack_trace = None

            if task_stack_trace: # A critical system/task error occurred
                final_error_type = "task_failure"
                final_error_class = task_error_class
                final_error_message = task_error_message
                final_stack_trace = task_stack_trace
            elif failed_records: # Only individual record/data errors occurred
                final_error_type = "data_insertion_error"
                final_error_class = "RecordInsertError"
                final_error_message = f"{len(failed_records)} record(s) could not be inserted."

            write_audit_log(
                dag_id=dag_id, task_id=task_id, airflow_run_id=airflow_run_id, lineage_run_id=lineage_run_id,
                job_name=job_name, namespace=namespace, status=status,
                error=final_error_type,
                error_class=final_error_class,
                error_message=final_error_message,
                stack_trace=final_stack_trace,
                total_records=len(data),
                success_count=success_count,
                failure_count=len(failed_records),
                failed_records=failed_records,
                started_at=start,
                finished_at=end,
                extra={"component": "load_task", "version": "full_v2_with_traceback"}
            )

        if should_fail_task:
            error_msg = task_error_message if task_error_message else f"Load failed for {len(failed_records)} record(s)."
            raise Exception(f"{error_msg} Check pipeline_audit_log for details.")


    # Define DAG Dependencies
    extracted_data = extract_data()
    transformed_data = transform_data(extracted_data)
    
    # create_tables must run before any data processing starts
    create_tables >> extracted_data
    
    # load_data depends on the output of transform_data
    load_data(transformed_data)

# Instantiate the DAG
real_etl_pipeline_with_db_logging_full()