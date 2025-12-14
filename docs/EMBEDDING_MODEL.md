# Embedding Model Information

## Overview
Journify uses OpenAI's embedding models for semantic search and retrieval-augmented generation (RAG) capabilities to provide context-aware journaling assistance.

## Embedding Models Used

### Production Backend (Main Application)
**Model**: `text-embedding-ada-002`
- **Location**: `/code/backend/controllers/chat.controller.js` (Line 35)
- **Dimension**: 1536
- **Purpose**: Main production embedding model for:
  - Journal entry vectorization
  - Semantic search in Pinecone vector database
  - Context retrieval for AI responses
- **Configuration**:
  ```javascript
  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-ada-002",
    openAIApiKey: process.env.OPENAI_API_KEY_LOCAL
  });
  ```

### Testing/Experimental Scripts
**Model**: `text-embedding-3-small`
- **Location**: 
  - `/code/others/test1.py` (Line 244)
  - `/code/others/test2.py` (Line 26)
- **Dimension**: 1536
- **Purpose**: Used in testing and experimental Python scripts
- **Configuration**:
  ```python
  response = self.client.embeddings.create(
      input=text,
      model="text-embedding-3-small"
  )
  ```

### Legacy/Alternative Scripts
**Model**: Default OpenAI embedding model (likely `text-embedding-ada-002`)
- **Location**: `/code/others/test.py` (Line 81)
- **Purpose**: Used in alternative LangChain-based test scripts
- **Note**: Uses `OpenAIEmbeddings` class without explicit model specification, defaults to OpenAI's default embedding model
- **Configuration**:
  ```python
  self.embeddings = OpenAIEmbeddings(openai_api_key=self.openai_api_key)
  ```

## Vector Database Configuration

### Pinecone Integration
- **Index Dimension**: 1536 (configured for `text-embedding-ada-002`)
- **Vector Store**: Pinecone
- **Purpose**: Stores embedded journal entries for semantic retrieval

## Model Comparison

| Model | Dimension | Cost | Performance | Usage in Journify |
|-------|-----------|------|-------------|-------------------|
| text-embedding-ada-002 | 1536 | Standard | Good | Production (Main) |
| text-embedding-3-small | 1536 | Lower | Newer, efficient | Testing |

## Environment Variables Required

```bash
OPENAI_API_KEY_LOCAL="your-openai-api-key"
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_INDEX_NAME="your-pinecone-index-name"
```

## Key Features Powered by Embeddings

1. **Semantic Search**: Find relevant past journal entries based on meaning, not just keywords
2. **Context-Aware Responses**: AI companion uses retrieved entries to provide personalized insights
3. **Long-Term Memory**: RAG system maintains context across sessions
4. **Emotional Pattern Recognition**: Identifies recurring themes in journal entries

## Changing the Embedding Model

If you want to change the embedding model:

1. Update the model name in `/code/backend/controllers/chat.controller.js`:
   ```javascript
   const embeddings = new OpenAIEmbeddings({
     modelName: "your-preferred-model",
     openAIApiKey: process.env.OPENAI_API_KEY_LOCAL
   });
   ```

2. Ensure the Pinecone index dimension matches the new model's dimension:
   ```javascript
   dimension: 1536  // Update this value to match your new model's dimension
   ```

3. Re-embed all existing journal entries if switching to a different dimension model

## References

- [OpenAI Embeddings Documentation](https://platform.openai.com/docs/guides/embeddings)
- [Pinecone Vector Database](https://www.pinecone.io/)
- [LangChain OpenAI Integration](https://js.langchain.com/docs/integrations/text_embedding/openai)
