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
        response = self.openai_client.embeddings.create(
            input=text,
            model=self.embedding_model
        )
        return response.data[0].embedding

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
        self.index.upsert(vectors=vectors, namespace=namespace)
        logger.info(f"Upserted {len(vectors)} chunks for document {doc_id} to Pinecone namespace {namespace}")

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
        self.index.upsert(vectors=vectors, namespace="grants")
        logger.info(f"Upserted {len(vectors)} chunks for grant {grant_id} to Pinecone namespace grants")

vector_service = VectorService()

