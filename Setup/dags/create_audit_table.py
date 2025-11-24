import pendulum
from airflow.decorators import dag, task
from airflow.providers.postgres.hooks.postgres import PostgresHook


@dag(
    dag_id="create_audit_table",
    start_date=pendulum.datetime(2024, 1, 1, tz="UTC"),
    schedule=None,
    catchup=False,
    tags=["setup", "audit", "metadata"],
)
def create_audit_table():

    @task
    def create_table():
        hook = PostgresHook(postgres_conn_id="postgres_default")

        create_sql = """
        CREATE TABLE IF NOT EXISTS etl_job_logs (
            id SERIAL PRIMARY KEY,

            -- Job-level metadata
            job_name TEXT NOT NULL,
            namespace TEXT NOT NULL,

            -- Task-level metadata
            task_name TEXT,
            run_id TEXT NOT NULL,                      
            marquez_run_id TEXT,                       

            status TEXT NOT NULL,                       -- RUNNING / SUCCESS / FAILED

            -- RCA metadata
            error_message TEXT,
            error_type TEXT,
            stack_trace TEXT,

            -- Row-level errors
            failed_records JSONB,

            -- Lineage info
            input_datasets JSONB,
            output_datasets JSONB,

            -- Timing
            started_at TIMESTAMP NOT NULL,
            finished_at TIMESTAMP,
            duration_ms BIGINT,

            -- Auto timestamp
            created_at TIMESTAMP DEFAULT NOW()
        );
        """

        hook.run(create_sql)
        print("✔ etl_job_logs table is ready.")

    create_table()


create_audit_table()
