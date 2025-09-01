import os
import io
import asyncio
import json
import re
import traceback
from dataclasses import dataclass, asdict
from typing import List, Optional, Any, Tuple, Dict, Set

from dotenv import load_dotenv

# Load env (GROQ_API_KEY, optional GROQ_MODEL, etc.)
load_dotenv()


# ------------------------------
# Lightweight dataclasses
# ------------------------------
@dataclass
class SimpleNode:
    id: str
    type: str
    # Add frontend-specific properties for easier rendering
    size: Optional[int] = None
    color: Optional[str] = None
    font: Optional[dict] = None


@dataclass
class SimpleEndpoint:
    id: str

@dataclass
class SimpleRelationship:
    source: str  # Changed to simple string ID
    target: str  # Changed to simple string ID
    type: str
    label: str   # Add label for vis.js

@dataclass
class SimpleGraphDocument:
    nodes: List[SimpleNode]
    relationships: List[SimpleRelationship]


# ------------------------------
# String & JSON Utilities
# ------------------------------
def _balanced_extract(s: str, start_idx: int, open_ch: str, close_ch: str) -> Optional[str]:
    stack = []
    for i in range(start_idx, len(s)):
        c = s[i]
        if c == open_ch:
            stack.append(open_ch)
        elif c == close_ch:
            if not stack:
                return None
            stack.pop()
            if not stack:
                return s[start_idx:i+1]
    return None


def _find_first_json_like(s: str) -> Optional[str]:
    for ch_open, ch_close in (('[', ']'), ('{', '}')):
        idx = s.find(ch_open)
        if idx != -1:
            blk = _balanced_extract(s, idx, ch_open, ch_close)
            if blk:
                return blk
    return None


def _unescape_if_escaped(s: str) -> str:
    try:
        return bytes(s, "utf-8").decode("unicode_escape")
    except Exception:
        return s


def _deep_collect(d: Any, key: str) -> List[Any]:
    out = []
    if isinstance(d, dict):
        for k, v in d.items():
            if k == key:
                out.append(v)
            out.extend(_deep_collect(v, key))
    elif isinstance(d, list):
        for item in d:
            out.extend(_deep_collect(item, key))
    return out


def _unwrap_until_list(value: Any, key: str) -> Optional[list]:
    cur = value
    seen: Set[int] = set()
    while True:
        if isinstance(cur, list):
            return cur
        if not isinstance(cur, dict):
            return None
        if key in cur:
            cur = cur[key]
            continue
        if len(cur) == 1:
            only = next(iter(cur.values()))
            if isinstance(only, (dict, list)):
                cur = only
                continue
        cur_id = id(cur)
        if cur_id in seen:
            return None
        seen.add(cur_id)
        return None


# ------------------------------
# Robust Groq error -> graph recovery
# ------------------------------
FAILED_GEN_KEY_REGEX = re.compile(r"""failed_generation[\"']?\s*:\s*[\"']""", re.IGNORECASE)

def _extract_failed_generation_raw(s: str) -> Optional[str]:
    m = FAILED_GEN_KEY_REGEX.search(s)
    if not m:
        return None
    start = m.end()
    if start >= len(s):
        return None

    quote_char = s[start - 1]
    i = start
    escaped = False
    while i < len(s):
        c = s[i]
        if escaped:
            escaped = False
        else:
            if c == '\\':
                escaped = True
            elif c == quote_char:
                return s[start:i]
        i += 1
    return None


def _normalize_nodes(nodes_list: list) -> List[dict]:
    out = []
    for n in nodes_list:
        if not isinstance(n, dict):
            continue
        nid = n.get("id") or n.get("name") or n.get("node_id")
        ntype = n.get("type") or n.get("node_type") or n.get("category") or "entity"
        if nid:
            out.append({"id": str(nid), "type": str(ntype)})
    return out


def _normalize_relationships(rels_list: list) -> List[dict]:
    out = []
    for r in rels_list:
        if not isinstance(r, dict):
            continue
        s = r.get("source_node_id") or r.get("source") or r.get("from")
        t = r.get("target_node_id") or r.get("target") or r.get("to")
        rtype = r.get("type") or r.get("relation") or "related_to"
        if isinstance(s, dict):
            s = s.get("id") or s.get("name")
        if isinstance(t, dict):
            t = t.get("id") or t.get("name")
        if s and t:
            out.append({
                "source": str(s),
                "target": str(t),
                "type": str(rtype),
            })
    return out


def _pick_best_list(cands: List[Any], key_name: str) -> Optional[list]:
    for cand in cands:
        if isinstance(cand, list):
            if cand and all(isinstance(x, dict) for x in cand):
                return cand
            if len(cand) == 1 and isinstance(cand[0], dict):
                unwrapped = _unwrap_until_list(cand[0], key_name)
                if isinstance(unwrapped, list):
                    return unwrapped
        elif isinstance(cand, dict):
            unwrapped = _unwrap_until_list(cand, key_name)
            if isinstance(unwrapped, list):
                return unwrapped
    return None


def _fallback_find_nodes(obj: dict) -> Optional[list]:
    for v in obj.values():
        if isinstance(v, list) and v and all(isinstance(i, dict) for i in v):
            if all(("id" in i) or ("name" in i) or ("node_id" in i) for i in v):
                return v
    return None


def _fallback_find_rels(obj: dict) -> Optional[list]:
    for v in obj.values():
        if isinstance(v, list) and v and all(isinstance(i, dict) for i in v):
            if all(("source_node_id" in i) or ("source" in i) or ("from" in i) for i in v):
                return v
    return None


def _normalize_graph_like_object(obj: Any) -> Optional[dict]:
    if isinstance(obj, list) and obj:
        for item in obj:
            maybe = _normalize_graph_like_object(item)
            if maybe:
                return maybe
        return None

    if not isinstance(obj, dict):
        return None

    if "parameters" in obj:
        return _normalize_graph_like_object(obj["parameters"])
    if "properties" in obj:
        return _normalize_graph_like_object(obj["properties"])

    if "nodes" in obj or "relationships" in obj:
        nodes_candidates = _deep_collect(obj, "nodes")
        rels_candidates = _deep_collect(obj, "relationships")
        nodes = _pick_best_list(nodes_candidates, "nodes")
        rels = _pick_best_list(rels_candidates, "relationships")
        if nodes is None:
            nodes = _fallback_find_nodes(obj)
        if rels is None:
            rels = _fallback_find_rels(obj)
        if nodes is None and rels is None:
            return None
        n_norm = _normalize_nodes(nodes or [])
        r_norm = _normalize_relationships(rels or [])
        return {"nodes": n_norm, "relationships": r_norm}

    nodes_candidates = _deep_collect(obj, "nodes")
    rels_candidates = _deep_collect(obj, "relationships")
    nodes = _pick_best_list(nodes_candidates, "nodes")
    rels = _pick_best_list(rels_candidates, "relationships")
    if nodes or rels:
        n_norm = _normalize_nodes(nodes or [])
        r_norm = _normalize_relationships(rels or [])
        return {"nodes": n_norm, "relationships": r_norm}

    return None


def _parse_failed_generation_text(exc_text: str) -> Optional[dict]:
    try:
        with open("llm_failed_generation_debug.txt", "w", encoding="utf-8") as fh:
            fh.write(exc_text[:200000])
    except Exception:
        pass

    inner = _extract_failed_generation_raw(exc_text)
    candidates: List[Any] = []

    if inner:
        inner_unescaped = _unescape_if_escaped(inner).strip()
        try:
            candidates.append(json.loads(inner_unescaped))
        except Exception:
            blk = _find_first_json_like(inner_unescaped)
            if blk:
                try:
                    candidates.append(json.loads(blk))
                except Exception:
                    pass

    if not candidates:
        outer_blk = _find_first_json_like(exc_text)
        if outer_blk:
            try:
                candidates.append(json.loads(outer_blk))
            except Exception:
                try:
                    candidates.append(json.loads(_unescape_if_escaped(outer_blk)))
                except Exception:
                    pass

    if not candidates:
        return None

    for cand in candidates:
        parsed = _normalize_graph_like_object(cand)
        if parsed:
            return parsed
    return None


# ------------------------------
# LLM-driven extraction
# ------------------------------
def _chunk_text(text: str, chunk_size: int = 4000, overlap: int = 200) -> List[str]:
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        chunks.append(text[start:end])
        if end == len(text):
            break
        start = max(0, end - overlap)
    return chunks


def _to_simple_docs(graph_documents: List[Any]) -> List[SimpleGraphDocument]:
    simple_docs: List[SimpleGraphDocument] = []
    for gd in graph_documents or []:
        try:
            nodes = [SimpleNode(id=str(n.id), type=str(getattr(n, "type", ""))) for n in gd.nodes]
            rels = []
            for r in gd.relationships:
                s_id = getattr(r.source, "id", getattr(r, "source", ""))
                t_id = getattr(r.target, "id", getattr(r, "target", ""))
                r_type = getattr(r, "type", "")
                if s_id and t_id:
                    rels.append(SimpleRelationship(
                        source=str(s_id),
                        target=str(t_id),
                        type=str(r_type or "related_to"),
                        label=str(r_type or "related_to").lower(),
                    ))
            simple_docs.append(SimpleGraphDocument(nodes=nodes, relationships=rels))
        except Exception:
            # Fallback for when gd is not a standard graph document object
            try:
                gd_dict = json.loads(json.dumps(gd, default=lambda o: o.__dict__))
            except Exception:
                gd_dict = None
            if gd_dict:
                parsed = _normalize_graph_like_object(gd_dict)
                if parsed and parsed.get("nodes") is not None:
                    nodes = [SimpleNode(id=n["id"], type=n["type"]) for n in parsed["nodes"]]
                    rels = [SimpleRelationship(
                        source=r["source"],
                        target=r["target"],
                        type=r["type"],
                        label=r["type"].lower(),
                    ) for r in parsed["relationships"]]
                    simple_docs.append(SimpleGraphDocument(nodes=nodes, relationships=rels))
    return simple_docs


async def _aconvert_chunk(graph_transformer, text: str) -> List[SimpleGraphDocument]:
    from langchain_core.documents import Document
    try:
        graph_documents = await graph_transformer.aconvert_to_graph_documents([Document(page_content=text)])
        return _to_simple_docs(graph_documents)
    except Exception as e:
        exc_text = "".join(traceback.format_exception_only(type(e), e)) + "\n" + str(e)
        parsed = _parse_failed_generation_text(exc_text)
        if parsed and parsed.get("nodes") is not None:
            nodes = [SimpleNode(id=n["id"], type=n["type"]) for n in parsed["nodes"]]
            rels = [
                SimpleRelationship(
                    source=r["source"],
                    target=r["target"],
                    type=r["type"],
                    label=r["type"].lower(),
                )
                for r in parsed["relationships"]
            ]
            return [SimpleGraphDocument(nodes=nodes, relationships=rels)]
        return []


def _merge_graphs(graphs: List[SimpleGraphDocument]) -> SimpleGraphDocument:
    node_by_id: Dict[str, SimpleNode] = {}
    edge_set: Set[Tuple[str, str, str]] = set()
    edges: List[SimpleRelationship] = []

    for g in graphs:
        for n in g.nodes:
            if n.id not in node_by_id:
                node_by_id[n.id] = n
        for r in g.relationships:
            key = (r.source, r.target, r.type)
            if key not in edge_set:
                edge_set.add(key)
                edges.append(r)

    return SimpleGraphDocument(nodes=list(node_by_id.values()), relationships=edges)

def _style_graph(graph: SimpleGraphDocument) -> SimpleGraphDocument:
    """Adds size and color to nodes for frontend rendering."""
    nodes = graph.nodes
    relationships = graph.relationships

    # Compute degree
    degree: Dict[str, int] = {n.id: 0 for n in nodes}
    for r in relationships:
        degree[r.source] = degree.get(r.source, 0) + 1
        degree[r.target] = degree.get(r.target, 0) + 1

    max_deg = max(degree.values()) if degree else 1
    if max_deg == 0: max_deg = 1

    styled_nodes = []
    for n in nodes:
        d = degree.get(n.id, 0)
        norm_deg = d / max_deg
        n.size = round(12 + norm_deg * 20) # 12..32

        # Color based on type
        g = n.type.lower()
        if 'process' in g: n.color = '#ffd86b'
        elif 'material' in g: n.color = '#a78bfa'
        elif 'contaminant' in g: n.color = '#ff8fab'
        elif 'device' in g: n.color = '#64d4ff'
        elif 'surface' in g: n.color = '#9be7c4'
        else: n.color = '#7aa2ff'

        n.font = {"size": max(10, round(n.size * 0.6)), "color": '#e8eef6'}
        styled_nodes.append(n)

    return SimpleGraphDocument(nodes=styled_nodes, relationships=relationships)

# ------------------------------
# Core Graph Generation API
# ------------------------------
async def extract_graph_data_llm_only(text: str) -> SimpleGraphDocument:
    from langchain_experimental.graph_transformers import LLMGraphTransformer
    from langchain_groq import ChatGroq

    model_name = os.getenv("GROQ_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct")
    llm = ChatGroq(model_name=model_name, temperature=0)
    graph_transformer = LLMGraphTransformer(llm=llm)

    chunks = _chunk_text(
        text,
        chunk_size=int(os.getenv("KG_CHUNK_SIZE", "4000")),
        overlap=int(os.getenv("KG_CHUNK_OVERLAP", "200"))
    )

    tasks = [_aconvert_chunk(graph_transformer, ch) for ch in chunks]
    results = await asyncio.gather(*tasks)

    recovered_docs = [doc for res in results for doc in res]

    if not recovered_docs:
        raise RuntimeError(
            "LLM did not yield any usable nodes/relationships from any chunk. "
            "Inspect llm_failed_generation_debug.txt to refine prompts/model."
        )

    merged = _merge_graphs(recovered_docs)
    styled = _style_graph(merged)
    return styled


def generate_graph_from_pdf_bytes(file_bytes: bytes) -> SimpleGraphDocument:
    """Asynchronously extracts text from PDF bytes and runs the pipeline."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        text = "\n\n".join([p.extract_text() or "" for p in reader.pages])
    except Exception as e:
        raise RuntimeError("Could not extract PDF text. Ensure 'pypdf' is installed.") from e

    return asyncio.run(extract_graph_data_llm_only(text))


# ------------------------------
# Pathfinding and Insights
# ------------------------------
def _build_adjacency(graph: SimpleGraphDocument) -> Dict[str, List[str]]:
    adj: Dict[str, List[str]] = {n.id: [] for n in graph.nodes}
    for r in graph.relationships:
        if r.source not in adj: adj[r.source] = []
        adj[r.source].append(r.target)
        if r.target not in adj: adj[r.target] = []
        adj[r.target].append(r.source) # Undirected for path discovery
    return adj


def path_discovery(graph: SimpleGraphDocument, anchors: Optional[List[str]] = None, max_hops: int = 4, top_k: int = 5) -> List[List[str]]:
    adj = _build_adjacency(graph)
    node_ids = list(adj.keys())
    node_lower = {nid: nid.lower() for nid in node_ids}

    source_keywords = ("contamin", "particle", "metal", "ion", "precursor", "adsorp", "surface", "membrane", "filter", "material", "impurity", "packag", "drum", "tubing")
    outcome_keywords = ("yield", "loss", "failure", "degrad", "degradation", "resist", "resistivity", "performance", "contaminat", "corrosion", "defect", "wafer", "defectivity", "metrology")

    anchor_pairs = []
    if anchors and len(anchors) >= 2:
        for i in range(len(anchors)):
            for j in range(i+1, len(anchors)):
                anchor_pairs.append((anchors[i], anchors[j]))
    else:
        sources = [nid for nid, low in node_lower.items() if any(k in low for k in source_keywords)]
        targets = [nid for nid, low in node_lower.items() if any(k in low for k in outcome_keywords)]
        if not sources: sources = node_ids[:min(8, len(node_ids))]
        if not targets: targets = [nid for nid in node_ids if nid not in sources][:min(8, max(1, len(node_ids)//6))]
        for s in sources:
            for t in targets:
                if s != t: anchor_pairs.append((s, t))

    from collections import deque
    def _bfs_paths(start: str, goal: str, max_h: int) -> List[List[str]]:
        results = []
        q = deque([ (start, [start]) ])
        while q:
            curr, path = q.popleft()
            if len(path) - 1 >= max_h: continue
            if curr == goal:
                results.append(path)
                continue
            for nb in adj.get(curr, []):
                if nb not in path:
                    q.append((nb, path + [nb]))
        return results

    scored_paths: List[Tuple[float, List[str]]] = []
    for (s, t) in anchor_pairs:
        if s not in adj or t not in adj: continue
        paths = _bfs_paths(s, t, max_hops)
        for p in paths:
            score = 1.0 / (len(p) + 0.1)
            if any(k in p[-1].lower() for k in outcome_keywords): score += 0.45
            if any(k in p[0].lower() for k in source_keywords): score += 0.2
            if any("surface" in n.lower() or "membran" in n.lower() or "zeta" in n.lower() for n in p): score += 0.15
            scored_paths.append((score, p))

    scored_paths.sort(key=lambda x: -x[0])
    seen = set()
    out = []
    for _, p in scored_paths:
        key = "->".join(p)
        if key not in seen:
            seen.add(key)
            out.append(p)
            if len(out) >= top_k: break
    return out


async def _call_llm_for_explanation(prompt: str) -> Optional[str]:
    # This is a simplified wrapper for explanation generation.
    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import HumanMessage
    except ImportError:
        return None

    model_name = os.getenv("GROQ_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct")
    try:
        llm = ChatGroq(model_name=model_name, temperature=0.1)
        resp = await llm.ainvoke([HumanMessage(content=prompt)])
        return resp.content if hasattr(resp, 'content') else str(resp)
    except Exception as e:
        print(f"Error calling LLM for explanation: {e}")
        return None


async def extract_exceptional_insight(graph: SimpleGraphDocument, context_text: Optional[str] = None, max_hops: int = 4, top_k: int = 5) -> Dict[str, Any]:
    candidates = path_discovery(graph, anchors=None, max_hops=max_hops, top_k=top_k)
    if not candidates:
        return {"found": False, "explanation": "No compelling multi-hop paths discovered.", "paths": [], "raw_paths": [], "scores": [], "causal_candidates": []}

    # Score and flag heuristically
    scored = []
    for p in candidates:
        score = 1.0 / (len(p) + 0.1)
        if any("contamin" in n.lower() or "corrosion" in n.lower() for n in p): score += 0.4
        if any("surface" in n.lower() or "zeta" in n.lower() or "adsorp" in n.lower() for n in p): score += 0.2
        scored.append((score, p))

    scored.sort(key=lambda x: -x[0])
    top = scored[:top_k]
    path_strings = [" → ".join(p) for s, p in top]
    raw_paths = [p for s, p in top]
    scores = [s for s, p in top]

    causal_flags = []
    for p in raw_paths:
        lowers = " ".join(n.lower() for n in p)
        causal = any(k in lowers for k in ("contamin", "adsorp", "zeta", "oxid", "corros", "defect", "yield", "particle"))
        causal_flags.append(bool(causal))

    explanation = None
    try:
        brief_prompt = (
            "You are a scientific research assistant. Given the following inferred multi-hop paths from a knowledge graph, "
            "for the top path produce a 1-2 sentence explanation for why this path is interesting and whether it indicates a plausible causal hypothesis. "
            "Be concise, conservative and avoid speculation.\n\n"
            + "\n".join(f"- {ps}" for ps in path_strings[:min(3, len(path_strings))]) +
            f"\n\nContext (truncated):\n{(context_text or '')[:8000]}\n"
        )
        llm_text = await _call_llm_for_explanation(brief_prompt)
        if llm_text:
            lines = [ln.strip() for ln in llm_text.splitlines() if ln.strip()]
            explanation = lines[0] if lines else llm_text.strip()
    except Exception:
        explanation = None

    if not explanation:
        top_path_str = " → ".join(raw_paths[0])
        explanation = (
            f"Inferred path '{top_path_str}' connects likely contamination source(s) to wafer outcome(s) via intermediate mechanism(s). "
            "This chain suggests a testable causal hypothesis."
        )

    return {
        "found": True,
        "explanation": explanation,
        "paths": path_strings,
        "raw_paths": raw_paths,
        "scores": scores,
        "causal_candidates": causal_flags
    }


async def generate_experiment_for_path(path_nodes: List[str], merged_doc_text: Optional[str] = None) -> dict:
    path_desc = " → ".join(path_nodes)
    constraints = {
        "max_cost": "low",
        "no_hazardous_chemicals": True,
        "preferred_equipment": ["four-point probe", "humidity chamber", "optical microscope"]
    }
    prompt = (
        "You are an experimental design assistant specialized in materials and surface science. "
        "Given the inferred multi-hop path and optional context, produce a minimal, safe, low-cost experiment (and a concise SOP) to test the hypothesis implied by the path. "
        "Output ONLY valid JSON following this schema (title, hypothesis, experiment{{summary,controls,materials,steps,measurements,sample_size,success_criteria,safety_notes}}, expected_outcome, cost_estimate, time_estimate).\n\n"
        f"Path: {path_desc}\n\n"
        f"Context: {(merged_doc_text or 'N/A')[:3000]}\n\n"
        f"Constraints: {json.dumps(constraints, indent=2)}\n"
    )

    response = await _call_llm_for_explanation(prompt)
    parsed_json = None
    if response:
        json_like = _find_first_json_like(response)
        if json_like:
            try:
                parsed_json = json.loads(json_like)
            except json.JSONDecodeError:
                parsed_json = None # Failed to parse

    return {
        "prompt": prompt,
        "llm_response": response,
        "parsed_json": parsed_json,
    }
