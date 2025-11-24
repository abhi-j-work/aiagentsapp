# scripts/transform.py
import json, os, uuid, datetime
import pandas as pd
import numpy as np

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

def transform(run_id, input_snapshot):
    task_id = "transform"
    try:
        df = pd.read_csv(input_snapshot)
        issues = []
        # Example: coerce age to integer, detect bad values
        def parse_age(x):
            try:
                if x is None or (isinstance(x, float) and np.isnan(x)): 
                    raise ValueError("missing_age")
                return int(x)
            except Exception as e:
                issues.append({"row": int(df.index[df['age']==x][0]) if 'age' in df.columns else None,
                               "field": "age", "value": x, "error": str(e)})
                return None

        df['age_parsed'] = df['age'].apply(lambda x: parse_age(x))
        # Example: ensure salary is numeric
        df['salary_parsed'] = pd.to_numeric(df['salary'], errors='coerce')
        # record rows with null salary
        null_salary_rows = df[df['salary_parsed'].isna()].index.tolist()
        for r in null_salary_rows:
            issues.append({"row": int(r), "field": "salary", "value": df.loc[r, 'salary'], "error": "missing_or_non_numeric"})

        # create a transformed output (only keep id, name, age_parsed, salary_parsed)
        out_df = df[['id','name','age_parsed','salary_parsed']].rename(columns={'age_parsed':'age','salary_parsed':'salary'})
        out_path = os.path.join(PERSIST, f"{run_id}__{task_id}__output.csv")
        out_df.to_csv(out_path, index=False)

        meta = {"rows_in": len(df), "rows_out": len(out_df), "fields": list(out_df.columns), "field_issues": issues, "output": out_path}
        log(task_id, run_id, "success", meta)
        print("transform success")
        return out_path
    except Exception as e:
        log(task_id, run_id, "failed", {"error": str(e)})
        raise

if __name__ == "__main__":
    import sys
    run_id = sys.argv[1] if len(sys.argv) > 1 else f"run_{uuid.uuid4().hex}"
    input_snapshot = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "persist", f"{run_id}__extract__snapshot.csv")
    transform(run_id, input_snapshot)
