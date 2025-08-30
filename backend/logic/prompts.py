# Mock prompt template. In a real application, this would be a detailed, carefully engineered prompt.
DESIGN_EXPERIMENT_PROMPT = """
You are an experimental design assistant.
Given the path: {path}
And the context: {context}
And the constraints: {constraints}
Design a detailed, step-by-step experiment. Output ONLY valid JSON.
"""

EXPLAIN_PATH_PROMPT = """
Explain the significance of this path: {path}
"""
