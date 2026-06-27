# Azure RAG Chatbot Architecture

## Overview

This solution is delivered as a **single web portal** backed by a shared Azure-based RAG platform, with role-based experiences:

- **AI Assistant experience**: Authenticated end users (customers, partners, or users) submit issues and receive AI-assisted answers or resolutions. End users see only the AI assistant.
- **Administration experience**: Authorized admin users monitor conversations (including live conversations), review operational metrics, inspect unresolved cases, and manage support handoff visibility.

All access is authenticated. Users sign in to use the AI assistant and can sign up if they do not have an account. Only authorized users can access the administration experience.

The platform uses Azure OpenAI for response generation and conversation summarization, Azure AI Search for chunk retrieval, Azure Storage Account for file and image storage, and Azure Database for PostgreSQL (PostgreSQL engine) for operational and conversation data.

## Business Workflow

### AI Assistant Workflow (End User)

1. A user opens the portal and signs in. If the user does not have an account, they sign up first.
2. The user enters a question, issue description, or troubleshooting request in the AI assistant.
3. The application creates an authenticated conversation session and automatically generates a ticket ID for the issue, which is visible in the administration experience.
4. The user can optionally attach:
   - screenshots or images
   - Markdown files
   - Microsoft Word documents
   - PDF files
5. Uploaded files are stored in Azure Blob Storage.
6. A preprocessing service extracts text and metadata from supported documents.
7. Extracted content is normalized and chunked for retrieval use.
8. Chunks are indexed in Azure AI Search where applicable for session-aware or knowledge retrieval.
9. The backend sends the user question, recent chat context, and retrieved chunks to Azure OpenAI.
10. Azure OpenAI generates a grounded answer.
11. The answer is returned to the user together with source references where available.
12. The chat session, attached file metadata, response details, ticket state, and satisfaction feedback are stored in PostgreSQL.
13. When the chat is closed, a conversation summary is generated and stored.
14. If the issue is not resolved, the interaction can be marked for transfer to the support team.

### Administration Workflow (Authorized Admin)

1. An authorized admin signs in to the portal.
2. The portal validates identity and role-based access for the administration experience.
3. The admin dashboard displays operational and support metrics.
4. Admin users can review:
   - all user chat history
   - live conversations as they happen
   - user satisfaction scores
   - model token usage
   - number of tickets resolved by AI
   - number of open tickets
   - number of tickets transferred to the support team
5. Admin users can inspect conversation-level details, attachment history, transfer status, and conversation summaries.
6. Admin users can review unresolved or escalated issues for operational action.

## Architecture Components

## Single Portal

The user portal and admin portal are merged into one application. The experience is determined by the signed-in user's role.

### 1. AI Assistant Experience (End User)
Purpose:
- Accept authenticated chat requests.
- Accept issue descriptions and supported attachments.
- Display chatbot responses and optional citations.
- Capture user satisfaction input.

Key capabilities:
- Sign-in and sign-up required.
- Authenticated session tracking.
- Automatic ticket creation when a conversation starts.
- File upload support for image, `.md`, `.doc`/`.docx`, and `.pdf`.
- Real-time chat UI.
- End users see only the AI assistant.

### 2. Administration Experience (Authorized Admin)
Purpose:
- Provide access to chatbot operations and analytics for authorized users.
- Allow support and operations teams to review system outcomes.

Key capabilities:
- Authorized-admin access only.
- Dashboard with KPIs and operational charts.
- Live conversation monitoring.
- Conversation review and search.
- Conversation summaries.
- Escalation and support transfer visibility.
- Usage and satisfaction reporting.

## Backend Services

### 1. Authentication and User Management Service
Handles:
- User sign-up and sign-in
- Session and identity validation
- Role assignment and admin authorization checks

### 2. API Gateway or Web App Backend
Handles:
- Chat request routing
- File upload orchestration
- Authenticated session management
- Automatic ticket creation when a conversation starts
- Administration API routing
- Response formatting

### 3. Ingestion and Processing Service
Handles:
- File validation
- OCR or text extraction if enabled for screenshots or image understanding workflows
- Markdown, Word, and PDF text extraction
- Metadata generation
- Chunk creation
- Search index updates

### 4. Retrieval Service
Handles:
- Query transformation
- Hybrid/vector search against Azure AI Search
- Top-K chunk retrieval
- Filtering and ranking
- Citation metadata assembly

### 5. Prompt Orchestration Service
Handles:
- Prompt construction
- Inclusion of recent chat history
- Retrieved context injection
- Guardrails for unsupported answers
- Response structure rules

### 6. Ticket and Session Management Service
Handles:
- Authenticated session tracking
- Automatic ticket creation when a conversation starts
- Live conversation visibility for admins
- Ticket status updates
- Transfer-to-support state changes
- AI resolution state tracking
- Conversation summary generation when a chat is closed

### 7. Metrics and Reporting Service
Handles:
- Token usage aggregation
- Satisfaction score calculation
- AI resolution metrics
- Open ticket counts
- Escalation counts

## Azure Services Used

### Azure OpenAI
Used for:
- chatbot response generation
- conversation summary generation on chat close
- optional conversation classification
- optional ticket resolution detection

### Azure AI Search
Used for:
- chunk indexing
- keyword and vector retrieval
- semantic ranking where enabled
- citation traceability

### Azure Storage Account
Used for:
- uploaded screenshots and images
- uploaded markdown, Word, and PDF files
- processed text artifacts
- ingestion failure artifacts if required

### Azure Database for PostgreSQL
PostgreSQL engine. Used for:
- user accounts and identity mapping
- authenticated chat sessions
- chat messages
- user feedback and satisfaction values
- ticket records
- support transfer records
- conversation summaries
- admin reporting aggregates or source data
- attachment metadata

### Microsoft Entra ID
Used for:
- portal authentication (user sign-in/sign-up, with Microsoft Entra External ID for end-user self-service where applicable)
- role enforcement and admin authorization
- optional managed identity integration for backend apps

### Azure Key Vault
Used for:
- secure configuration secrets
- database credentials if not fully managed through identity
- application secrets and certificates

### Azure Monitor and Application Insights
Used for:
- application logs
- request traces
- performance metrics
- error tracking
- usage monitoring

## End-to-End Request Flow

### A. Authenticated User Chat Request

1. User opens the portal and signs in (or signs up if they have no account).
2. User submits text and optional supported attachments.
3. Backend creates an authenticated conversation ID and automatically creates a ticket ID, visible in the administration experience.
4. Files are uploaded to Blob Storage.
5. Supported document content is extracted.
6. Relevant knowledge chunks are retrieved from Azure AI Search.
7. Session-specific extracted content may also be included if supported by the implementation.
8. Prompt is assembled with:
   - user question
   - recent conversation context
   - retrieved enterprise knowledge chunks
   - optional extracted attachment content
9. Azure OpenAI generates a response.
10. Response and metadata are stored in PostgreSQL.
11. User receives the answer and can submit satisfaction feedback.
12. Authorized admins can observe the conversation live.
13. When the chat is closed, a conversation summary is generated and stored.
14. If unresolved, the conversation may be flagged as open or transferred.

### B. Admin Review Flow

1. Authorized admin signs in to the portal.
2. Identity and role-based access are validated.
3. Portal loads dashboard metrics from reporting APIs.
4. Admin can drill into:
   - chat session history
   - live conversations
   - ticket status
   - feedback trends
   - token usage by model or time period
   - conversation summaries
5. Admin can inspect unresolved or escalated tickets.
6. Admin can track AI effectiveness and operational backlog.

## Data Model Overview

### Core Entities
- `users`
- `sessions`
- `chat_messages`
- `attachments`
- `documents`
- `document_chunks`
- `ticket_cases`
- `ticket_transfers`
- `satisfaction_feedback`
- `conversation_summaries`
- `token_usage_logs`
- `roles` (admin authorization mapping)

### Suggested Relationships
- One user can have many sessions.
- One session can have many chat messages.
- One chat message can have many attachments.
- One session or issue thread maps to one ticket case (created automatically when the conversation starts).
- One ticket case can move from new to AI-resolved to open to transferred to closed.
- One closed conversation has one conversation summary.
- One assistant message can reference many retrieved chunks.

## Ticket Lifecycle

Suggested statuses:
- `new` (created automatically when a conversation starts)
- `in_progress_ai`
- `resolved_by_ai`
- `open`
- `transferred_to_support`
- `closed`

Suggested transitions:
1. User starts a conversation; a ticket is created automatically as `new` and becomes visible to admins.
2. AI attempts resolution (`in_progress_ai`).
3. If the user accepts the answer or indicates success, mark as `resolved_by_ai`.
4. If unresolved, mark as `open`.
5. If routed for human follow-up, mark as `transferred_to_support`.
6. When the chat is closed, a conversation summary is generated and the ticket is marked `closed`.

## File Handling Rules

### Supported Upload Types
- Images/screenshots: `.png`, `.jpg`, `.jpeg`, `.bmp`, `.webp` if enabled
- Documents: `.md`, `.doc`, `.docx`, `.pdf`

### File Processing Rules
- Validate MIME type and file extension.
- Enforce file size limits.
- Store original file in Blob Storage.
- Extract text from Markdown, Word, and PDF.
- Keep file metadata in PostgreSQL.
- Apply retention rules for uploaded files.

## Access Model

The application is fully authenticated; there is no anonymous access.

- Single portal with role-based experiences.
- Users sign in or sign up to use the AI assistant.
- The administration experience is restricted to authorized users via role-based authorization.
- Use Microsoft Entra ID / Microsoft Entra External ID sign-in with role-based authorization, or an equivalent identity provider.

## Metrics for Admin Dashboard

### Conversation and Resolution Metrics
- Total chats
- Active chat sessions
- Tickets resolved by AI
- Open tickets
- Tickets transferred to support
- Resolution rate by AI
- Average response time

### User Experience Metrics
- Satisfaction rating average
- Positive vs negative feedback ratio
- Feedback trend over time

### Model Usage Metrics
- Prompt tokens
- Completion tokens
- Total token usage
- Token usage by day, week, month
- Token usage by model deployment

## Deployment Topology

### Application Zone
- Single portal (AI assistant + administration views) hosted on Azure App Service (Python 3.14) or Azure Container Apps
- Backend APIs (Python 3.14)
- Authentication and admin authorization via Microsoft Entra ID / Entra External ID

### Data and AI Zone
- Azure OpenAI
- Azure AI Search
- Azure Storage Account
- Azure Database for PostgreSQL (PostgreSQL engine)
- Key Vault
- Monitoring services

## Recommended Workflow Summary

1. Authenticated user submits an issue with optional attachments via the AI assistant.
2. A ticket is created automatically when the conversation starts and is visible to admins.
3. Backend stores attachments and conversation context.
4. Retrieval layer fetches relevant knowledge.
5. Azure OpenAI produces a grounded answer.
6. Chat history, ticket state, and metrics are persisted.
7. Authorized admins can view live conversations and operational data.
8. When the chat is closed, a conversation summary is generated and stored.

## Definition of Completion

The architecture is complete when:
- users can sign up and sign in to use the chatbot
- the user and admin portals are merged into a single role-based portal
- end users see only the AI assistant
- a ticket ID is created automatically when a conversation starts and is visible in the administration experience
- authorized admins can view live conversations
- supported files can be uploaded and processed
- Azure OpenAI produces grounded responses using retrieved data
- chat history is stored
- ticket state is tracked
- a conversation summary is generated when a chat is closed
- the administration experience is restricted to authorized users
- the admin dashboard shows chat history, satisfaction, token usage, AI-resolved tickets, open tickets, and transferred tickets
