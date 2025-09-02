import os
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_community.tools import DuckDuckGoSearchRun # <-- 1. IMPORT THE TOOL

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
    model = ChatGroq(model=os.getenv("GROQ_MODEL", "llama3-8b-8192"), temperature=0)
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