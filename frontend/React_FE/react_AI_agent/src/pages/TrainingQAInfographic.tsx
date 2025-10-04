import React, { useEffect, useState } from "react";
import {
  BrainCircuit,
  Zap,
  LoaderCircle,
  FileText,
  Database,
  Clock,
  Code,
  Download,
  Copy,
  AlertTriangle,
  Layers,
} from "lucide-react";

/**
 * TrainingQAInfographic.tsx
 *
 * Single-file infographic page that answers the demo questions you asked,
 * shows dataset summary (from the data you pasted), and can fetch live
 * job / MLflow data from the backend endpoints that you have in your repo.
 *
 * Usage:
 *  - Put in your React app (Tailwind-enabled).
 *  - Ensure backend endpoints are reachable at the same origin:
 *      GET /training/jobs
 *      GET /training/{job_id}
 *      GET /training/{job_id}/logs
 *      GET /mlflow/experiments
 *      GET /mlflow/runs?experiment_id={id}
 *
 * If your API is prefixed (e.g. /api/), update the fetch URLs below.
 */

/* -----------------------------
   Static dataset summary (from the JSONL you supplied)
   I parsed the dataset you pasted: 60 samples total, 6 classes (10 each).
   ----------------------------- */
const datasetSummary = {
  totalSamples: 60,
  classes: [
    "PII",
    "SENSITIVE",
    "CONFIDENTIAL",
    "PUBLIC",
    "PHI",
    "NON_SENSITIVE",
  ],
  samplesPerClass: 10,
  notes:
    "Your sample data are short tokens (column names) in JSON/JSONL format — good for quick prototypes. For production, you'd use many more examples and real corpus text.",
};

/* -----------------------------
   Helper utilities
   ----------------------------- */
const humanize = (n?: number) =>
  typeof n === "number" ? n.toLocaleString() : "—";

const safeJson = (obj: any) =>
  typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);

/* -----------------------------
   The component
   ----------------------------- */
const TrainingQAInfographic: React.FC = () => {
  const [jobs, setJobs] = useState<any[] | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [mlflowExperiments, setMlflowExperiments] = useState<any[] | null>(
    null
  );
  const [mlflowRuns, setMlflowRuns] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<string | null>(null);

  // Simple fetch helpers (adjust endpoints if your API sits under /api)
  const api = {
    listJobs: async () => {
      const res = await fetch("/training/jobs");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    getJob: async (jobId: string) => {
      const res = await fetch(`/training/${jobId}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    getJobLogs: async (jobId: string) => {
      const res = await fetch(`/training/${jobId}/logs`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    listMlflowExperiments: async () => {
      const res = await fetch("/mlflow/experiments");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    listMlflowRuns: async (experimentId: string) => {
      const res = await fetch(`/mlflow/runs?experiment_id=${encodeURIComponent(experimentId)}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  };

  // fetch jobs & experiments (used by demo to show live values)
  const fetchLive = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [jobsRes, expRes] = await Promise.allSettled([
        api.listJobs(),
        api.listMlflowExperiments(),
      ]);

      if (jobsRes.status === "fulfilled") setJobs(jobsRes.value);
      else {
        setJobs(null);
        console.warn("Jobs fetch failed:", (jobsRes as any).reason);
      }

      if (expRes.status === "fulfilled") setMlflowExperiments(expRes.value);
      else {
        setMlflowExperiments(null);
        console.warn("MLflow experiments fetch failed:", (expRes as any).reason);
      }
    } catch (err: any) {
      setFetchError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  // fetch runs for the first experiment (if present)
  const fetchRunsForFirstExperiment = async () => {
    if (!mlflowExperiments || mlflowExperiments.length === 0) return;
    const id = mlflowExperiments[0].id ?? mlflowExperiments[0].experiment_id ?? mlflowExperiments[0].name;
    try {
      setLoading(true);
      const runs = await api.listMlflowRuns(id);
      setMlflowRuns(runs);
    } catch (err: any) {
      setFetchError(String(err?.message ?? err));
      setMlflowRuns(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // optional: pre-populate with jobs quickly if backend accessible
    // not automatic — user clicks "Fetch live" for demo control.
  }, []);

  /* -----------------------------
     Answer text blocks (derived from your code)
     Each answer is explicit about where it comes from (which file/behavior)
     and what is live-fetched vs static.
     ----------------------------- */
  const answers = {
    howTrained: {
      short:
        "Training is implemented as background tasks (Celery) which prepare DocBin training/dev datasets, then run `spacy` training (transformer pipeline) or a CNN manual loop. Runs are tracked in MLflow and registered in MLflow Model Registry.",
      detail:
        `What the code does (backend files you shared):
 - Worker tasks convert JSON/JSONL into spaCy DocBin (train/dev).
 - Transformer path builds a spaCy config with pipeline ["transformer","textcat"] and calls spacy.cli.train (see job task).
 - CNN path trains a spaCy textcat via a manual loop (nlp.update).
 - MLflow is used for experiment/run tracking (start_run, log_params, log_metrics) and models are registered to the MLflow registry.

 Files that implement this: your training router and task files (e.g. app/jobs/tasks or training task functions), and mlflow utilities.`
    },

    technique: {
      short:
        "Primary technique: spaCy transformer fine-tuning (TransformerModel.v3) for text classification (textcat). Alternative: spaCy CNN classifier (manual updates).",
      detail:
        `Transformer details:
 - spaCy uses the transformers integration (spacy-transformers) with a base model passed from payload (e.g. "en_core_web_trf").
 - The en_core_web_trf pipeline typically uses a RoBERTa-base style transformer backbone (pretrained). This means the transformer itself has on the order of 100+ million parameters (e.g. RoBERTa-base ≈ 125M params). :contentReference[oaicite:0]{index=0}

 CNN alternative:
 - The CNN path uses spaCy's textcat + a manual training loop and logs final_loss + accuracy to MLflow.`
    },

    dataset: {
      short:
        `You trained (or prepared) on JSON/JSONL files containing short text tokens (column names). Current sample: ${datasetSummary.totalSamples} records across ${datasetSummary.classes.length} classes.`,
      detail:
        `Exact dataset you provided (summary):
 - Format: JSON or JSONL, each entry like {"text":"...","cats":{...}}
 - Size: ${datasetSummary.totalSamples} total labels
 - Classes: ${datasetSummary.classes.length} (${datasetSummary.classes.join(", ")})
 - Balanced: ~${datasetSummary.samplesPerClass} examples per class
 
 Note: these are short token examples (column names). This dataset is great for prototyping; for robust production classifiers you typically want many more labeled examples (recommended: hundreds to thousands per class depending on task complexity). See guidance and community experience. :contentReference[oaicite:1]{index=1}`
    },

    timeParams: {
      short:
        "Training time & parameter counts depend on the base transformer chosen and compute (CPU vs GPU). MLflow run metadata stores start/end timestamps so you can show exact time per run.",
      detail:
        `What is recorded in the code:
 - The training router waits for the Celery task to return a mlflow_run_id, then MLflow stores run.start_time and run.end_time. Your MLflow listing endpoint returns these if you call /mlflow/runs (see backend).
 - Default hyperparameters visible in your API schema: epochs=3, batch_size=8, learning_rate=5e-5 (StartTrainingPayload defaults), but the spacy config string in the transformer task sets batch_size = 128 inside the spacy config snippet — this is configurable by the payload/worker implementation.
 - The active transformer "base model" is supplied by the payload (e.g. 'en_core_web_trf'); parameter count depends on that model (RoBERTa-base ≈ 125M parameters). If you fine-tune on GPU, training even on small data may finish in minutes; on CPU the transformer may take tens of minutes or longer depending on host and batch size. For precise numbers, click 'Fetch live' to read MLflow run timestamps.` }
    ,

    metrics: {
      short:
        "Metrics are logged to MLflow during the job. Transformer path logs: accuracy, precision, recall, f1. CNN logs final_loss and accuracy.",
      detail:
        `Where metrics come from and how to get them:
 - Transformer task reads meta.json from the best model and logs performance metrics into MLflow with names: accuracy, precision, recall, f1_score (see train task).
 - CNN task logs final_loss and accuracy via mlflow.log_metric.
 - To retrieve real numbers for a run, either:
    1) Use the UI: open your MLflow UI (MLflow server) and view the experiment/run.
    2) From this page click 'Fetch Live' -> then 'Show runs' -> open a run to see metrics and timestamps.
 
 Note on small sample sizes:
 - With 60 short token samples (10/class) reported metrics will be noisy and prone to overfitting — use more data or proper cross-validation for reliable estimates. :contentReference[oaicite:2]{index=2}`
    },
  };

  /* -----------------------------
     UI helpers
     ----------------------------- */
  const openJobDetails = async (job: any) => {
    setSelectedJob(job);
    setModalContent(safeJson(job));
  };

  const openJobLogs = async (jobId: string) => {
    setLoading(true);
    try {
      const json = await api.getJobLogs(jobId);
      setModalContent(safeJson(json));
    } catch (err: any) {
      setFetchError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  const openMlflowRuns = async () => {
    if (!mlflowExperiments || mlflowExperiments.length === 0) {
      setFetchError("No MLflow experiments available. Click 'Fetch live' first.");
      return;
    }
    await fetchRunsForFirstExperiment();
    setModalContent("Fetched runs; see the right panel for run list (or this modal will show run JSON).");
  };

  const downloadSnapshot = () => {
    // Export a tiny SVG snapshot summarizing Q&A (lightweight)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="300" viewBox="0 0 900 300">
      <rect width="100%" height="100%" fill="#071026"/>
      <text x="36" y="48" fill="#e6eef8" font-family="Inter, Arial" font-size="20" font-weight="700">Training Q&A Summary</text>
      <text x="36" y="88" fill="#9fb4d6" font-family="Inter, Arial" font-size="13">Model technique: spaCy transformer fine-tuning (textcat)</text>
      <text x="36" y="108" fill="#9fb4d6" font-family="Inter, Arial" font-size="13">Dataset: ${datasetSummary.totalSamples} samples — ${datasetSummary.classes.length} classes</text>
      <text x="36" y="128" fill="#9fb4d6" font-family="Inter, Arial" font-size="13">Metrics: logged in MLflow (example: accuracy, precision, recall, f1)</text>
    </svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "training-qa-summary.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* -----------------------------
     Suggested follow-up questions (for your demo)
     ----------------------------- */
  const suggestedQuestions = [
    {
      q: "Can you show the MLflow run for the latest training job (timestamps & metrics)?",
      hint: "Use /mlflow/runs or click 'Fetch live' + 'Show runs' in this page; compare start_time and end_time.",
    },
    {
      q: "How does this classifier behave on an unseen holdout set?",
      hint: "We can add a holdout evaluation step and log test-set metrics to MLflow; right now you have an eval split created in the code.",
    },
    {
      q: "Do you have a confusion matrix or per-class recall/precision?",
      hint: "Add a post-training evaluation that computes per-label precision/recall and logs as artifacts in MLflow.",
    },
    {
      q: "Can the pipeline mask or redact PII automatically?",
      hint: "Yes — the downstream agent or policy layer can consume the classifier output to create masking rules; we can demo a rule generated from classification results.",
    },
    {
      q: "What happens when a run fails or is cancelled?",
      hint: "Celery task is revoked and job status is updated; logs are available via /training/{job_id}/logs",
    },
  ];

  /* -----------------------------
     Render
     ----------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4 justify-center">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm uppercase tracking-wide text-slate-300">Training — Q & A</span>
          </div>
          <h1 className="text-4xl font-extrabold mb-2">Model training — questions & answers</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Answers below are derived from the backend and dataset you provided. Use <strong>Fetch live</strong> to show actual MLflow / job values from your running backend.
          </p>
        </header>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={fetchLive}
              className="px-4 py-2 rounded-lg bg-white/6 border border-white/10 text-sm flex items-center gap-2 hover:bg-white/10"
              disabled={loading}
            >
              {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              <span>{loading ? "Fetching…" : "Fetch live (jobs & MLflow)"}</span>
            </button>

            <button
              onClick={() => { setMlflowRuns(null); fetchRunsForFirstExperiment(); }}
              className="px-3 py-2 rounded-lg bg-white/6 border border-white/10 text-sm hover:bg-white/10"
            >
              Show runs
            </button>

            <button
              onClick={downloadSnapshot}
              className="px-3 py-2 rounded-lg bg-white/6 border border-white/10 text-sm hover:bg-white/10 flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Snapshot (SVG)
            </button>
          </div>

          <div className="text-sm text-slate-400">
            <strong>Dataset:</strong> {datasetSummary.totalSamples} samples — {datasetSummary.classes.length} classes
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column: Questions & short answers */}
          <section className="space-y-6">
            {/** Q1 */}
            <article className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/40 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/6 flex items-center justify-center border border-white/6">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">How was the custom model trained?</h3>
                  <p className="text-slate-300 mt-2">{answers.howTrained.short}</p>
                  <div className="mt-3 text-xs text-slate-400">{/* small source note */}Source: backend training tasks (spaCy + Celery + MLflow)</div>

                  <div className="mt-4 flex gap-2">
                    <button
                      className="px-3 py-1 rounded-md bg-white/6 border border-white/10 text-sm"
                      onClick={() => setModalContent(answers.howTrained.detail)}
                    >
                      Show details
                    </button>

                    <button
                      className="px-3 py-1 rounded-md bg-white/6 border border-white/10 text-sm"
                      onClick={() => {
                        if (jobs && jobs.length) {
                          setSelectedJob(jobs[0]);
                          setModalContent(safeJson(jobs[0]));
                        } else {
                          setFetchError("No jobs fetched yet — click 'Fetch live' first.");
                        }
                      }}
                    >
                      Show latest job
                    </button>
                  </div>
                </div>
              </div>
            </article>

            {/** Q2 */}
            <article className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/40 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/6 flex items-center justify-center border border-white/6">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Which technique was used to train the model?</h3>
                  <p className="text-slate-300 mt-2">{answers.technique.short}</p>
                  <div className="mt-2 text-xs text-slate-400">Notes: spaCy's transformer integration runs with a TransformerModel.v3 configuration.</div>

                  <div className="mt-4 flex gap-2">
                    <button
                      className="px-3 py-1 rounded-md bg-white/6 border border-white/10 text-sm"
                      onClick={() => setModalContent(answers.technique.detail)}
                    >
                      Show details & citations
                    </button>
                  </div>
                </div>
              </div>
            </article>

            {/** Q3 */}
            <article className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/40 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/6 flex items-center justify-center border border-white/6">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">What type and size of document was used for training?</h3>
                  <p className="text-slate-300 mt-2">{answers.dataset.short}</p>

                  <div className="mt-4 flex gap-2">
                    <button
                      className="px-3 py-1 rounded-md bg-white/6 border border-white/10 text-sm"
                      onClick={() => setModalContent(answers.dataset.detail)}
                    >
                      Show dataset summary & guidance
                    </button>
                    <button
                      className="px-3 py-1 rounded-md bg-white/6 border border-white/10 text-sm"
                      onClick={() => setModalContent(safeJson(datasetSummary))}
                    >
                      View raw summary
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </section>

          {/* Right column: Metrics, timeframe, live reads */}
          <aside className="space-y-6">
            <article className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/40 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/6 flex items-center justify-center border border-white/6">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">How long did training take & what hyperparameters?</h3>
                  <p className="text-slate-300 mt-2">{answers.timeParams.short}</p>
                  <div className="mt-3 text-xs text-slate-400">
                    Defaults in your API schema: <code>epochs:3, batch_size:8, lr:5e-5</code> — StartTrainingPayload defines these, while the transformer config snippet in the task sets <code>batch_size=128</code>. For CNN path the form sets <code>iterations:25</code>. You can fetch exact run durations from MLflow. 
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      className="px-3 py-1 rounded-md bg-white/6 border border-white/10 text-sm"
                      onClick={() => setModalContent(answers.timeParams.detail)}
                    >
                      Show details
                    </button>
                    <button
                      className="px-3 py-1 rounded-md bg-white/6 border border-white/10 text-sm"
                      onClick={() => openMlflowRuns()}
                    >
                      Fetch MLflow runs
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <article className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/40 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/6 flex items-center justify-center border border-white/6">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">What is the accuracy and logged ML metrics?</h3>
                  <p className="text-slate-300 mt-2">{answers.metrics.short}</p>
                  <div className="mt-3 text-xs text-slate-400">Transformer path logs accuracy/precision/recall/f1. CNN logs final_loss and accuracy.</div>

                  <div className="mt-4 flex gap-2">
                    <button
                      className="px-3 py-1 rounded-md bg-white/6 border border-white/10 text-sm"
                      onClick={() => setModalContent(answers.metrics.detail)}
                    >
                      Show where metrics are stored (MLflow)
                    </button>

                    <button
                      className="px-3 py-1 rounded-md bg-white/6 border border-white/10 text-sm"
                      onClick={() => {
                        if (!mlflowRuns) {
                          setFetchError("No runs in memory — click 'Fetch live' then 'Show runs'.");
                          return;
                        }
                        setModalContent(safeJson(mlflowRuns));
                      }}
                    >
                      Show fetched runs
                    </button>
                  </div>
                </div>
              </div>
            </article>

            {/* live data outputs */}
            <article className="p-6 rounded-2xl bg-slate-900/30 border border-slate-700/30">
              <h4 className="text-sm text-slate-300 mb-3">Live / fetched data (quick view)</h4>

              <div className="text-xs text-slate-300 space-y-2">
                <div>
                  <strong>Jobs fetched:</strong>{" "}
                  {jobs ? jobs.length : "—"}{" "}
                  {jobs && jobs.length > 0 && (
                    <button
                      className="ml-2 px-2 py-1 rounded-md bg-white/6 text-xs"
                      onClick={() => {
                        setModalContent(safeJson(jobs[0]));
                      }}
                    >
                      View latest job JSON
                    </button>
                  )}
                </div>

                <div>
                  <strong>MLflow experiments:</strong>{" "}
                  {mlflowExperiments ? mlflowExperiments.length : "—"}
                  {mlflowExperiments && mlflowExperiments.length > 0 && (
                    <button
                      className="ml-2 px-2 py-1 rounded-md bg-white/6 text-xs"
                      onClick={() => setModalContent(safeJson(mlflowExperiments[0]))}
                    >
                      View first experiment
                    </button>
                  )}
                </div>

                <div>
                  <strong>MLflow runs fetched:</strong>{" "}
                  {mlflowRuns ? mlflowRuns.length : "—"}
                  {mlflowRuns && mlflowRuns.length > 0 && (
                    <button
                      className="ml-2 px-2 py-1 rounded-md bg-white/6 text-xs"
                      onClick={() => setModalContent(safeJson(mlflowRuns[0]))}
                    >
                      View first run
                    </button>
                  )}
                </div>
              </div>

              {fetchError && (
                <div className="mt-3 text-xs text-rose-400">
                  <AlertTriangle className="inline-block w-4 h-4 mr-1 align-text-bottom" />{" "}
                  {fetchError}
                </div>
              )}
            </article>
          </aside>
        </div>

        {/* Suggested follow-up Qs */}
        <section className="mt-8 p-6 rounded-2xl bg-slate-900/30 border border-slate-700/30">
          <h3 className="text-lg font-semibold mb-3">Suggested follow-up questions (for your demo)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestedQuestions.map((s, i) => (
              <div key={i} className="p-4 rounded-md bg-slate-800/50 border border-slate-700/30">
                <div className="text-sm font-semibold">{s.q}</div>
                <div className="text-xs text-slate-400 mt-2">{s.hint}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Modals / JSON viewer */}
        <div aria-live="polite">
          {modalContent && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
            >
              <div className="absolute inset-0 bg-black/60" onClick={() => setModalContent(null)} />
              <div className="relative z-10 w-full max-w-3xl bg-slate-900/90 border border-slate-700/40 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="text-sm font-semibold">Detail / JSON</div>
                  <div className="flex items-center gap-2">
                    <button
                      title="Copy"
                      className="px-2 py-1 rounded-md bg-white/6"
                      onClick={() => {
                        navigator.clipboard.writeText(modalContent);
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      title="Close"
                      className="px-3 py-1 rounded-md bg-white/6"
                      onClick={() => setModalContent(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>

                <pre className="bg-[#021124] p-4 rounded-md text-xs overflow-auto" style={{ maxHeight: "60vh" }}>
                  <code>{modalContent}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-10 text-center text-slate-500 text-xs">
          Tip: for the demo, click "Fetch live" a minute before you present so MLflow & job states are already loaded.
        </footer>
      </div>
    </div>
  );
};

export default TrainingQAInfographic;
