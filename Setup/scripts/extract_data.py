# scripts/extract.py
import json, os, uuid, datetime
import pandas as pd

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

def extract(run_id):
    task_id = "extract"
    try:
        df = pd.read_csv(os.path.join(os.path.dirname(__file__), "..", "data", "sample_input.csv"))
        rows = len(df)
        columns = list(df.columns)
        # Save snapshot for lineage inspection
        snapshot_path = os.path.join(PERSIST, f"{run_id}__{task_id}__snapshot.csv")
        df.to_csv(snapshot_path, index=False)
        meta = {"rows": rows, "columns": columns, "snapshot": snapshot_path}
        log(task_id, run_id, "success", meta)
        print("extract success")
        return snapshot_path
    except Exception as e:
        log(task_id, run_id, "failed", {"error": str(e)})
        raise

if __name__ == "__main__":
    import sys
    run_id = sys.argv[1] if len(sys.argv) > 1 else f"run_{uuid.uuid4().hex}"
    extract(run_id)
