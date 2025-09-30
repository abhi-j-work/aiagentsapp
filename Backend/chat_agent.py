import os
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_community.tools import DuckDuckGoSearchRun # <-- 1. IMPORT THE TOOL
# append to chat_agent.py (paste at end)
import os
from typing import Optional, Callable, Dict, Any
from langchain_core.runnables import RunnablePassthrough
# reuse the simple generator
from utils import text_to_cypher_simple


async def answer_entegris_question(query: str) -> dict:
    """
    Answers a user's question about Entegris using a RAG pipeline.
    1. Searches the web for relevant context using DuckDuckGo.
    2. Injects the context into a prompt.
    3. Calls an LLM to generate a final answer.
    """
    if not os.getenv("GROQ_API_KEY"):
        raise ValueError("GROQ_API_KEY environment variable not set.")

    # --- 1. Retrieval Step ---
    print(f"Searching the web for: '{query}'") # Helpful for debugging
    search_tool = DuckDuckGoSearchRun() # <-- 2. INSTANTIATE THE TOOL
    
    # Enhance the query for better search results
    search_query = f"Entegris company products, services, or news related to: {query}"
    
    try:
        # The .run() method performs the search and returns a formatted string of results
        retrieved_context = search_tool.run(search_query) # <-- 3. USE THE TOOL
    except Exception as e:
        print(f"DuckDuckGo Search failed: {e}")
        retrieved_context = f"Could not perform web search. Error: {e}"

    if not retrieved_context.strip():
        retrieved_context = "No specific information found for this query."
    
    print("--- Retrieved Context ---")
    print(retrieved_context)
    print("-------------------------")


    # --- 2. Augmentation & Generation Step (Prompt + LLM) ---
    prompt_template = """
    You are a professional, expert assistant for the company Entegris. Your task is to answer the user's question based *only* on the provided context from a web search.

    Follow these rules strictly:
    - Synthesize the information from the context into a clear, concise answer.
    - Do not make up information. If the context does not contain the answer, state that you couldn't find specific details in the provided information.
    - Do not mention that you are basing your answer on 'the context' or 'the provided text'. Just answer the question directly.

    CONTEXT:
    {context}

    QUESTION:
    {question}

    ANSWER:
    """
    prompt = ChatPromptTemplate.from_template(prompt_template)
    model = ChatGroq(model=os.getenv("GROQ_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct"), temperature=0)
    output_parser = StrOutputParser()

    # --- 3. Create and run the RAG chain ---
    # This chain is now simpler. It takes the query, passes it to the `question` field,
    # and uses a lambda function to provide the `retrieved_context` we already fetched.
    rag_chain = (
        {
            "context": lambda x: retrieved_context, # Provide the context we found
            "question": RunnablePassthrough()       # Pass the original query through
        }
        | prompt
        | model
        | output_parser
    )

    answer = await rag_chain.ainvoke(query)

    # Return the final answer and the context for potential display or logging
    return {"answer": answer, "retrieved_context": retrieved_context}



#new additions
async def text_to_cypher_and_run(
    natural_text: str,
    run_query_fn: Optional[Callable[[str], Any]] = None,
    use_llm: bool = False,
) -> Dict[str, Any]:
    """
    Convert natural_text -> Cypher (simple rules or optional LLM), and optionally run it.
    Returns: { 'cypher': <str>, 'results': <list> or None, 'note': <str> }

    Minimal, additive function:
    - If use_llm=True and GROQ_API_KEY present, uses ChatGroq to *generate* a Cypher query.
      (Make sure you actually want to enable LLM generation)
    - Else uses utils.text_to_cypher_simple
    - If run_query_fn is provided, calls it with the cypher and returns results
    - Else, if env vars NEO4J_URI/NEO4J_USER/NEO4J_PASSWORD exist, it will attempt to run against Neo4j
    - Otherwise returns the generated Cypher only.
    """
    cypher = None
    note = ""

    # 1) Optionally use LLM to generate Cypher (only if explicitly asked)
    if use_llm and os.getenv("GROQ_API_KEY"):
        try:
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_groq import ChatGroq
            prompt_template = """
You are a Cypher query generator. Given a short natural language request, output ONLY a single Cypher query (no explanation).
Be conservative: do not output CREATE/DELETE/SET. Only MATCH/RETURN/WHERE/LIMIT/ORDER BY are allowed.
Request: {request}
Cypher:
"""
            prompt = ChatPromptTemplate.from_template(prompt_template)
            model = ChatGroq(model=os.getenv("GROQ_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct"), temperature=0)
            # run a simple chain: provide the request and get the model output
            rag_chain = (
                {"request": RunnablePassthrough()}
                | prompt
                | model
            )
            resp = await rag_chain.ainvoke(natural_text)
            cypher = resp.content if hasattr(resp, "content") else str(resp)
            cypher = cypher.strip().strip('`')
#cypher = await rag_chain.ainvoke(natural_text)
            #cypher = cypher.strip().strip('`')  # cleanup
            note = "generated_via_llm"
        except Exception as e:
            note = f"llm_generation_failed: {e}"
            cypher = text_to_cypher_simple(natural_text)

    # 2) Fallback: rule-based generator in utils
    if not cypher:
        cypher = text_to_cypher_simple(natural_text)
        if not note:
            note = "generated_via_rule_based"

    results = None

    # 3) If the caller provided a function to execute the cypher, use it
    if run_query_fn:
        try:
            results = run_query_fn(cypher)
        except Exception as e:
            results = {"error": str(e)}
            note += " | run_query_fn_failed"

        return {"cypher": cypher, "results": results, "note": note}

    # 4) Else try to auto-run against Neo4j if env vars exist (optional)
    neo_uri = os.getenv("NEO4J_URI")
    neo_user = os.getenv("NEO4J_USER")
    neo_pass = os.getenv("NEO4J_PASSWORD")
    if neo_uri and neo_user and neo_pass:
        try:
            # Import only if needed
            from neo4j import GraphDatabase
            driver = GraphDatabase.driver(neo_uri, auth=(neo_user, neo_pass))
            with driver.session() as session:
                # use read transaction
                def _run(tx):
                    res = tx.run(cypher)
                    return [r.data() for r in res]
                results = session.read_transaction(_run)
            driver.close()
            note += " | executed_on_neo4j"
        except Exception as e:
            results = {"error": f"neo4j_exec_failed: {e}"}
            note += " | neo4j_exec_failed"

    # 5) If nothing executed, return cypher so the app can run it later
    return {"cypher": cypher, "results": results, "note": note}
