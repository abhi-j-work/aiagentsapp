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
from airflow.exceptions import AirflowException

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
    # Ensure failed_records is a JSON string before insertion
    failed_records_json = json.dumps(failed_records) if failed_records else None
    
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
            failed_records_json,
            started_at, finished_at, socket.gethostname(),
            json.dumps(extra or {})
        )
    )

# -------------------------------
# DAG Definition
# -------------------------------
@dag(
    dag_id="real_etl_pipeline_with_openlineage_errors",
    start_date=pendulum.datetime(2024, 1, 1, tz="UTC"),
    schedule=None,
    catchup=False,
    tags=["lineage", "audit", "rca", "openlineage"]
)
def real_etl_pipeline_with_openlineage_errors():

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
        Loads data into the target table, writing a single comprehensive audit log.
        If any record fails, the entire task will fail, allowing the native OpenLineage
        provider to report the error.
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
            job_name = f"{dag_id}.{task_id}"
            namespace = "default"

        start_time = datetime.now()
        success_count = 0
        failed_records = []
        task_level_exception = None

        hook = PostgresHook(postgres_conn_id="postgres_default")
        
        logging.info(f"Attempting to load {len(data)} records into clean_orders...")
        try:
            # --- 2. PROCESS RECORDS AND CAPTURE FAILURES ---
            with hook.get_conn() as conn:
                for record in data:
                    sql_to_execute = ""
                    try:
                        with conn.cursor() as cursor:
                            # --- MODIFICATION START ---
                            sql_command = "INSERT INTO public.clean_orders (order_id, product, amount) VALUES (%s, %s, %s);"
                            params = (record["order_id"], record["product"], record["amount"])
                            
                            # Use mogrify to get the exact, fully-formed SQL statement for logging
                            sql_to_execute = cursor.mogrify(sql_command, params).decode('utf-8', 'replace')
                            
                            # Execute the original parameterized command
                            cursor.execute(sql_command, params)
                            # --- MODIFICATION END ---
                            success_count += 1
                    except Exception as e:
                        conn.rollback() 
                        # --- MODIFICATION START ---
                        # Append the failed SQL statement along with other details
                        failed_records.append({
                            **record,
                            "error_class": type(e).__name__,
                            "error_message": str(e).strip(),
                            "failed_sql_statement": sql_to_execute
                        })
                        # --- MODIFICATION END ---
                        logging.error(f"Failed to insert record {record}: {e}")
                        logging.error(f"Failed SQL: {sql_to_execute}")
                
                # Commit all successful transactions if no critical error occurred
                conn.commit()

        except Exception as e:
            # This captures critical, non-data errors (e.g., connection failed)
            logging.error(f"A critical, task-level error occurred: {e}")
            task_level_exception = e

        finally:
            # --- 3. FINALIZE AND WRITE AUDIT LOG ---
            end_time = datetime.now()
            status = "FAILED" if failed_records or task_level_exception else "SUCCESS"
            
            error_type, error_class, error_message, stack_trace = None, None, None, None
            if task_level_exception:
                error_type = "task_failure"
                error_class = type(task_level_exception).__name__
                error_message = str(task_level_exception)
                stack_trace = traceback.format_exc()
            elif failed_records:
                error_type = "data_insertion_error"
                error_class = "RecordInsertError" # A custom, consistent class name for data issues
                error_message = f"{len(failed_records)} of {len(data)} record(s) failed to insert."
            
            write_audit_log(
                dag_id=dag_id, task_id=task_id, airflow_run_id=airflow_run_id, 
                lineage_run_id=lineage_run_id,
                job_name=job_name, namespace=namespace, status=status,
                error=error_type,
                error_class=error_class,
                error_message=error_message,
                stack_trace=stack_trace,
                total_records=len(data),
                success_count=success_count,
                failure_count=len(failed_records),
                failed_records=failed_records,
                started_at=start_time,
                finished_at=end_time,
                extra={"component": "load_task", "version": "simplified_v2"}
            )
        
        # --- 4. FAIL THE AIRFLOW TASK IF ANY ERRORS OCCURRED ---
        if status == "FAILED":
            # This final exception is what Airflow and the OpenLineage provider will see.
            raise AirflowException(error_message)


    # Define DAG Dependencies
    extracted_data = extract_data()
    transformed_data = transform_data(extracted_data)
    
    # create_tables must run before any data processing starts
    create_tables >> extracted_data
    
    # load_data depends on the output of transform_data
    load_data(transformed_data)

# Instantiate the DAG
real_etl_pipeline_with_openlineage_errors()