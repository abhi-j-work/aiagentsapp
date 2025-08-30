import json
import re
from types import SimpleNamespace
from pyvis.network import Network

# Mock data for a plausible-looking knowledge graph
MOCK_NODES = [
    {"id": "Thin Film Deposition", "label": "Thin Film Deposition", "group": "Process", "title": "Process"},
    {"id": "Substrate", "label": "Substrate", "group": "Material", "title": "Material"},
    {"id": "Annealing", "label": "Annealing", "group": "Process", "title": "Process"},
    {"id": "Surface Roughness", "label": "Surface Roughness", "group": "Property", "title": "Property"},
    {"id": "Contaminant Particle", "label": "Contaminant Particle", "group": "Contaminant", "title": "Contaminant"},
    {"id": "Optical Sensor", "label": "Optical Sensor", "group": "Device", "title": "Device"},
    {"id": "Yield", "label": "Yield", "group": "Metric", "title": "Metric"},
]

MOCK_RELATIONSHIPS = [
    {"source": "Thin Film Deposition", "target": "Substrate", "label": "APPLIES_TO"},
    {"source": "Thin Film Deposition", "target": "Surface Roughness", "label": "AFFECTS"},
    {"source": "Annealing", "target": "Surface Roughness", "label": "REDUCES"},
    {"source": "Contaminant Particle", "target": "Thin Film Deposition", "label": "INTERFERES_WITH"},
    {"source": "Contaminant Particle", "target": "Yield", "label": "DECREASES"},
    {"source": "Surface Roughness", "target": "Optical Sensor", "label": "IMPACTS_PERFORMANCE"},
    {"source": "Optical Sensor", "target": "Yield", "label": "DETERMINES"},
]

def _create_mock_graph():
    """Creates a pyvis network and a merged_doc object from mock data."""
    net = Network(height="1000px", width="100%", notebook=True, cdn_resources="in_line", directed=True)

    # Add nodes with groups for coloring
    for node in MOCK_NODES:
        net.add_node(node["id"], label=node["label"], group=node["group"], title=node["title"])

    # Add edges
    for rel in MOCK_RELATIONSHIPS:
        net.add_edge(rel["source"], rel["target"], label=rel["label"])

    # Mock a "merged_doc" object that the original script uses
    merged_doc = SimpleNamespace(
        nodes=[{"id": n["id"], "type": n["group"]} for n in MOCK_NODES],
        relationships=[{"source": r["source"], "target": r["target"], "type": r["label"]} for r in MOCK_RELATIONSHIPS],
    )
    return net, merged_doc

def generate_knowledge_graph_with_doc(text: str):
    """Mock generating a knowledge graph from text."""
    # In a real implementation, the text would be processed by an LLM.
    # Here, we just return our static mock graph.
    return _create_mock_graph()

def generate_knowledge_graph_from_pdf_bytes(pdf_bytes: bytes):
    """Mock generating a knowledge graph from PDF bytes."""
    # The extraction would happen before this call.
    # We just return our static mock graph.
    return _create_mock_graph()

def extract_exceptional_insight(merged_doc):
    """Mock extracting an insight from the graph."""
    # This mocks finding a particularly interesting path in the graph.
    return {
        "found": True,
        "explanation": "A key causal path has been identified: Contaminant particles negatively impact the deposition process, which in turn affects surface roughness and ultimately decreases final device yield.",
        "paths": ["Contaminant Particle → Thin Film Deposition → Surface Roughness → Yield"],
        "causal_candidates": [True]
    }

def visualize_graph(docs, highlight_path=None):
    """Mock for visualizing a graph, which just creates the base mock graph."""
    # The real function might do more complex visualization based on the docs.
    # Here we just return the standard mock graph.
    net, _ = _create_mock_graph()
    return net

def generate_experiment_for_path(path_nodes, merged_doc_text=""):
    """Mock for generating a detailed experiment plan."""
    path_str = " → ".join(path_nodes)

    # This would be an LLM call in the real app.
    mock_experiment = {
        "title": f"Experiment to Validate Impact of Contaminants on Yield via Path: {path_str}",
        "hypothesis": "The presence of contaminant particles during thin film deposition increases surface roughness, leading to a measurable decrease in final device yield.",
        "experiment": {
            "summary": "This experiment will compare two batches of substrates. The control group will undergo thin film deposition in a clean environment, while the test group will be exposed to a controlled number of contaminant particles. Surface roughness and final yield will be measured for both groups.",
            "controls": [
                "Substrate material and preparation method.",
                "Deposition and annealing parameters (temperature, pressure, time).",
                "Measurement techniques and equipment.",
            ],
            "materials": ["Silicon wafers (Substrate)", "Deposition precursor chemicals", "Standard contaminant particles (e.g., polystyrene spheres)"],
            "steps": [
                "1. Prepare two sets of silicon wafers.",
                "2. Introduce a controlled density of contaminant particles to the test group wafers.",
                "3. Perform thin film deposition on both sets of wafers under identical conditions.",
                "4. Perform annealing on both sets.",
                "5. Measure surface roughness for all wafers using Atomic Force Microscopy (AFM).",
                "6. Fabricate optical sensors on all wafers.",
                "7. Test sensor performance to determine final yield for both groups.",
            ],
            "measurements": ["Surface roughness (RMS in nm)", "Device yield (%)"],
            "sample_size": "20 wafers per group (10 control, 10 test)",
            "success_criteria": "A statistically significant increase in surface roughness and decrease in yield for the test group compared to the control group.",
            "safety_notes": "Standard lab safety protocols for handling chemicals and deposition equipment apply."
        },
        "expected_outcome": "The test group will exhibit higher surface roughness and lower yield, confirming the causal relationship defined in the path.",
        "cost_estimate": "Low (< $1,000)",
        "time_estimate": "3-5 days"
    }

    # The original script seems to expect a dict that can be JSON-serialized.
    # Some parts of the code check for 'llm_response' or 'parsed_json'.
    return {
        "prompt": "Prompt to generate the experiment would go here.",
        "llm_response": json.dumps(mock_experiment, indent=2),
        "parsed_json": mock_experiment,
        "trace_url": "http://example.com/mock-trace-url",
        "error": None
    }

# Placeholder for path_discovery if it were ever called directly
def path_discovery(graph, start_node, end_node):
    return [f"{start_node} -> Mock Path -> {end_node}"]
