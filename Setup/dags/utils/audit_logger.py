import json
import socket
from datetime import datetime
from airflow.providers.postgres.hooks.postgres import PostgresHook


def write_pipeline_log(
    dag_id,
    task_id,
    airflow_run_id,
    lineage_run_id,
    status,
    error_class=None,
    error_message=None,
    stack_trace=None,
    total_records=None,
    success_count=None,
    failure_count=None,
    failed_records=None,
    started_at=None,
    finished_at=None,
    extra=None
):
    hook = PostgresHook(postgres_conn_id="postgres_default")
    hook.run(
        """
        INSERT INTO public.pipeline_audit_log (
            dag_id, task_id, airflow_run_id, lineage_run_id,
            status, error_class, error_message, stack_trace,
            total_records, success_count, failure_count, failed_records,
            started_at, finished_at, hostname, extra_metadata
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        parameters=(
            dag_id,
            task_id,
            airflow_run_id,
            lineage_run_id,
            status,
            error_class,
            error_message,
            stack_trace,
            total_records,
            success_count,
            failure_count,
            json.dumps(failed_records) if failed_records else None,
            started_at,
            finished_at,
            socket.gethostname(),
            json.dumps(extra or {}),
        ),
    )
