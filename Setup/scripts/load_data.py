# scripts/load.py
import json, os, uuid, datetime
import pandas as pd
from sqlalchemy import create_engine

PERSIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "persist")

def log(task_id, run_id, status, meta):
    os.makedirs(PERSIST, exist_ok=True)
    entry = {
        "task_id": task_id,
        "run_id": run_id,
        "status": status,
        "ts": datetime.datetime.utcnow().isoformat()+"Z",
        "meta": meta
    }
    fname = os.path.join(PERSIST, f"{run_id}__{task_id}__{uuid.uuid4().hex}.json")
    with open(fname, "w") as f:
        json.dump(entry, f, indent=2)

def load(run_id, transformed_csv):
    task_id = "load"
    try:
        df = pd.read_csv(transformed_csv)
        # Use SQLite for simplicity
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "persist", "target.db")
        engine = create_engine(f"sqlite:///{db_path}")
        # Try inserting, capture per-row errors easily by using pandas to_sql with if_exists='append'
        # We'll do row-by-row to capture errors
        row_errors = []
        for idx, row in df.iterrows():
            try:
                row.to_frame().T.to_sql("people", engine, if_exists='append', index=False)
            except Exception as e:
                row_errors.append({"row_index": int(idx), "error": str(e), "row": row.to_dict()})
        meta = {"rows": len(df), "insert_errors": row_errors, "db": db_path}
        if row_errors:
            log(task_id, run_id, "failed", meta)
            raise RuntimeError(f"{len(row_errors)} rows failed to insert")
        else:
            log(task_id, run_id, "success", meta)
            print("load success")
            return db_path
    except Exception as e:
        log(task_id, run_id, "failed", {"error": str(e)})
        raise

if __name__ == "__main__":
    import sys
    run_id = sys.argv[1] if len(sys.argv) > 1 else f"run_{uuid.uuid4().hex}"
    transformed_csv = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "persist", f"{run_id}__transform__output.csv")
    load(run_id, transformed_csv)
