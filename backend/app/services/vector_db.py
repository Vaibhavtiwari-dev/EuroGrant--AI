import os
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class VectorService:
    def __init__(self):
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        # Initialize OpenAI client with optional base_url for NVIDIA NIM support
        self.openai_client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        )
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "eurogrant")
        self.dimension = int(os.getenv("EMBEDDING_DIMENSION", "1536"))
        self.embedding_model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
        
        # Ensure index exists
        try:
            active_indexes = [idx.name for idx in self.pc.list_indexes()]
            if self.index_name not in active_indexes:
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric='cosine',
                    spec=ServerlessSpec(
                        cloud='aws',
                        region=os.getenv('PINECONE_ENVIRONMENT', 'us-east-1')
                    )
                )
                logger.info(f"Created new Pinecone index: {self.index_name}. Waiting for readiness...")
                # Allow a few seconds for initialization
                import time
                time.sleep(5)
        except Exception as e:
            logger.warning(f"Could not check or create Pinecone index: {e}")

        # Initialize the index connection
        try:
            self.index = self.pc.Index(self.index_name)
        except Exception as e:
            logger.error(f"Failed to connect to Pinecone index: {e}")
            self.index = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100
        )

    def generate_embeddings(self, text: str) -> List[float]:
        try:
            response = self.openai_client.embeddings.create(
                input=text,
                model=self.embedding_model
            )
            return response.data[0].embedding
        except Exception as e:
            logger.warning(f"Embedding generation failed: {e}. Falling back to local offline mock zero embeddings.")
            # Return a list of zeros matching the configured dimension
            return [0.0] * self.dimension

    def upsert_text(self, text: str, doc_id: int, org_id: int):
        chunks = self.text_splitter.split_text(text)
        vectors = []
        
        for i, chunk in enumerate(chunks):
            embedding = self.generate_embeddings(chunk)
            vectors.append({
                "id": f"doc_{doc_id}_chunk_{i}",
                "values": embedding,
                "metadata": {
                    "doc_id": doc_id,
                    "org_id": org_id,
                    "text": chunk
                }
            })
        
        # Upsert in namespace
        namespace = f"org_{org_id}"
        if not self.index:
            logger.warning(f"Pinecone index not initialized. Bypassed upserting {len(vectors)} chunks to namespace {namespace} (offline mock active)")
            return
            
        try:
            self.index.upsert(vectors=vectors, namespace=namespace)
            logger.info(f"Upserted {len(vectors)} chunks for document {doc_id} to Pinecone namespace {namespace}")
        except Exception as e:
            logger.error(f"Pinecone upsert failed for document {doc_id}: {e}. Bypassed gracefully.")

    def upsert_grant(self, grant_id: int, text: str, metadata: dict):
        chunks = self.text_splitter.split_text(text)
        vectors = []
        for i, chunk in enumerate(chunks):
            embedding = self.generate_embeddings(chunk)
            vectors.append({
                "id": f"grant_{grant_id}_chunk_{i}",
                "values": embedding,
                "metadata": {
                    "grant_id": grant_id,
                    **metadata,
                    "text": chunk
                }
            })
            
        try:
            self.index.upsert(vectors=vectors, namespace="grants")
            logger.info(f"Upserted {len(vectors)} chunks for grant {grant_id} to Pinecone namespace grants")
        except Exception as e:
            logger.error(f"Pinecone upsert failed for grant {grant_id}: {e}. Bypassed gracefully.")

    def search_grants(self, query_text: str, top_k: int = 10) -> List[Dict]:
        """
        Query Pinecone index under the 'grants' namespace using similarity search.
        If Pinecone index is not initialized or fails, returns mock matches.
        """
        if not self.index:
            logger.warning("Pinecone index not initialized. Returning mock search results (offline mock active)")
            return self._mock_search_grants(query_text, top_k)

        try:
            query_embedding = self.generate_embeddings(query_text)
            response = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                namespace="grants",
                include_metadata=True
            )
            matches = []
            for match in response.get("matches", []):
                metadata = match.get("metadata", {})
                matches.append({
                    "id": match.get("id"),
                    "score": match.get("score"),
                    "grant_id": metadata.get("grant_id"),
                    "text": metadata.get("text"),
                    "title": metadata.get("title", "Unknown Grant Opportunity")
                })
            return matches
        except Exception as e:
            logger.error(f"Pinecone query failed: {e}. Falling back to mock search results.")
            return self._mock_search_grants(query_text, top_k)

    def _mock_search_grants(self, query_text: str, top_k: int = 10) -> List[Dict]:
        """
        Generates fallback mock grant matches with similarity scores for local testing.
        """
        mock_data = [
            {"id": "grant_1_chunk_0", "score": 0.88, "grant_id": 1, "text": "Smart Sustainable Manufacturing grant support for IoT systems.", "title": "Innovate UK: Smart Sustainable Manufacturing"},
            {"id": "grant_2_chunk_0", "score": 0.76, "grant_id": 2, "text": "Funding for green lithium projects, B2B batteries and logistics.", "title": "Project GreenLithium"},
            {"id": "grant_3_chunk_0", "score": 0.65, "grant_id": 3, "text": "European innovation ecosystem support for growth stage SMEs.", "title": "EIC Accelerator - Horizon Europe"}
        ]
        return mock_data[:top_k]

vector_service = VectorService()

