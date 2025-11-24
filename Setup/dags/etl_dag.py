# dags/etl_dag.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
import os, uuid, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SCRIPTS = os.path.join(ROOT, "scripts")

default_args = {
    "owner": "airflow",
    "retries": 0,
    "retry_delay": timedelta(minutes=1)
}

with DAG(dag_id="simple_etl_lineage", start_date=datetime(2025,1,1), schedule_interval=None, default_args=default_args, catchup=False) as dag:

    def run_extract(**ctx):
        run_id = f"run_{uuid.uuid4().hex}"
        ctx['ti'].xcom_push("run_id", run_id)
        script = os.path.join(SCRIPTS, "extract.py")
        # run as module
        cmd = f"python {script} {run_id}"
        print("Running:", cmd)
        os.system(cmd)

    def run_transform(**ctx):
        run_id = ctx['ti'].xcom_pull(task_ids='run_extract', key='run_id')
        # find snapshot path by convention
        snapshot = os.path.join(ROOT, "persist", f"{run_id}__extract__snapshot.csv")
        script = os.path.join(SCRIPTS, "transform.py")
        cmd = f"python {script} {run_id} {snapshot}"
        print("Running:", cmd)
        os.system(cmd)

    def run_load(**ctx):
        run_id = ctx['ti'].xcom_pull(task_ids='run_extract', key='run_id')
        transformed = os.path.join(ROOT, "persist", f"{run_id}__transform__output.csv")
        script = os.path.join(SCRIPTS, "load.py")
        cmd = f"python {script} {run_id} {transformed}"
        print("Running:", cmd)
        os.system(cmd)

    t1 = PythonOperator(task_id="run_extract", python_callable=run_extract)
    t2 = PythonOperator(task_id="run_transform", python_callable=run_transform)
    t3 = PythonOperator(task_id="run_load", python_callable=run_load)

    t1 >> t2 >> t3
