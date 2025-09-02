# Backend/knowledge_graph.py

import os
import re
import json
import asyncio
from typing import List, Dict, Any

from langchain_groq import ChatGroq
from models import Node, Relationship, KnowledgeGraphResponse

# --- 1. Robust JSON Parser ---
def extract_json_from_text(text: str) -> Dict[str, Any]:
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in the LLM response.")
    json_str = match.group(0)
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse the extracted JSON string: {json_str}")

# --- 2. High-Quality Extraction Prompt ---
GRAPH_EXTRACTION_PROMPT = """
You are a highly intelligent AI assistant specialized in materials science, chemistry, and semiconductor manufacturing. 
Your primary function is to analyze technical documents and extract a detailed knowledge graph.
From the text provided below, identify all relevant entities and the relationships that connect them.
**Entity Types:**
- Company, Person, Technology, Process, Material, Device, Chemical, Concept, Field, Metric, Tool
**Relationship Types:**
Use clear, uppercase verb phrases (e.g., "USED_IN", "DEVELOPED_BY", "IMPACTS").
**Output Format Instructions (Follow Strictly):**
1.  Your entire output **MUST** be a single, valid JSON object.
2.  The JSON object must have two top-level keys: "nodes" and "relationships".
3.  The value for "nodes" must be a JSON array of objects, each with an "id" and a "type".
4.  The value for "relationships" must be a JSON array of objects, each with a "source", "target", and "type".
Analyze the following text:
---
{text}
---
"""

# --- 3. Core Graph Generation Logic ---
async def generate_graph_from_text_custom(text: str) -> KnowledgeGraphResponse:
    if not os.getenv("GROQ_API_KEY"):
        raise ValueError("GROQ_API_KEY not set.")

    model_name = os.getenv("GROQ_MODEL", "llama3-70b-8192")
    llm = ChatGroq(model_name=model_name, temperature=0.0)
    prompt = GRAPH_EXTRACTION_PROMPT.format(text=text)

    try:
        response = await llm.ainvoke(prompt)
        content = response.content
    except Exception as e:
        raise RuntimeError(f"LLM API call failed. Error: {e}")

    try:
        graph_data = extract_json_from_text(content)
    except ValueError as e:
        with open("llm_failed_response.txt", "w", encoding="utf-8") as f:
            f.write(content)
        raise RuntimeError(f"LLM returned malformed JSON. See 'llm_failed_response.txt'. Error: {e}")

    nodes_raw = graph_data.get("nodes", [])
    rels_raw = graph_data.get("relationships", [])

    if not isinstance(nodes_raw, list) or not isinstance(rels_raw, list):
         raise RuntimeError("'nodes' and 'relationships' must be arrays.")

    nodes = [Node(**n) for n in nodes_raw if isinstance(n, dict) and "id" in n and "type" in n]
    rels = [Relationship(**r) for r in rels_raw if isinstance(r, dict) and "source" in r and "target" in r and "type" in r]

    return KnowledgeGraphResponse(nodes=nodes, relationships=rels)

# --- 4. Chunking and Merging for Large Docs ---
def _chunk_text(text: str, chunk_size: int = 6000, overlap: int = 300) -> List[str]:
    if len(text) <= chunk_size: return [text]
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size - overlap)]

def _merge_graphs(graphs: List[KnowledgeGraphResponse]) -> KnowledgeGraphResponse:
    merged_nodes: Dict[str, Node] = {}
    edge_set = set()
    merged_rels: List[Relationship] = []
    for graph in graphs:
        for node in graph.nodes:
            if node.id not in merged_nodes: merged_nodes[node.id] = node
        for rel in graph.relationships:
            edge_tuple = (rel.source, rel.target, rel.type)
            if edge_tuple not in edge_set:
                edge_set.add(edge_tuple)
                merged_rels.append(rel)
    return KnowledgeGraphResponse(nodes=list(merged_nodes.values()), relationships=merged_rels)

async def process_text_in_chunks(text: str) -> KnowledgeGraphResponse:
    chunks = _chunk_text(text)
    tasks = [generate_graph_from_text_custom(chunk) for chunk in chunks]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    successful_graphs = [res for res in results if isinstance(res, KnowledgeGraphResponse)]
    if not successful_graphs:
        for i, res in enumerate(results):
            if isinstance(res, Exception): print(f"--- Error in chunk {i+1}: {res} ---")
        raise RuntimeError("All text chunks failed to process into a knowledge graph.")
    
    return _merge_graphs(successful_graphs)

# --- 5. Insight Finding for Automatic Highlighting ---
def find_insightful_paths(graph_data: KnowledgeGraphResponse) -> dict:
    if not graph_data.nodes:
        return {"nodes": [], "pairs": []}

    degree = {node.id: 0 for node in graph_data.nodes}
    for rel in graph_data.relationships:
        if rel.source in degree: degree[rel.source] += 1
        if rel.target in degree: degree[rel.target] += 1

    if not degree: return {"nodes": [], "pairs": []}
    
    central_node_id = max(degree, key=degree.get)
    highlight_nodes = {central_node_id}
    highlight_pairs = []

    for rel in graph_data.relationships:
        if rel.source == central_node_id:
            highlight_nodes.add(rel.target)
            highlight_pairs.append([rel.source, rel.target])
        elif rel.target == central_node_id:
            highlight_nodes.add(rel.source)
            highlight_pairs.append([rel.source, rel.target])

    return {"nodes": list(highlight_nodes), "pairs": list(map(list, {tuple(sorted(p)) for p in highlight_pairs}))}