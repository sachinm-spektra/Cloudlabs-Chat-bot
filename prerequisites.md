# Azure RAG Chatbot Prerequisites

## Overview

This document defines the project prerequisites for building and running a production-grade Azure RAG chatbot solution delivered as a **single unified portal** with role-based experiences:

- **AI Assistant experience** for authenticated end users (customers, partners, or users) to raise issues and receive AI-assisted answers.
- **Administration experience** for authorized admin users to monitor conversations (including live conversations), review operational metrics, and manage support handoff visibility.

All access is authenticated. Users sign in to use the AI assistant and can create an account if they do not already have one. Only authorized users can access the administration experience.

The solution supports text chat, file uploads, RAG-based retrieval, Azure OpenAI responses, automatic ticket creation when a conversation starts, live conversation visibility for admins, conversation summary generation when a chat is closed, chat history persistence, and admin analytics.

## Functional Preconditions

The project assumes the following business and technical requirements:

- Users must sign in to access the chatbot. If a user does not have an account, they can sign up.
- Authenticated users can submit issues with optional screenshots, images, Markdown files, Microsoft Word documents, or PDF documents.
- Only authorized users can access the administration experience within the same portal.
- When a user starts a conversation, a ticket ID is automatically created and is visible in the administration experience.
- Authorized admins can view live conversations as they happen.
- When a chat is closed, a conversation summary is generated and stored.
- Chat history, satisfaction feedback, and ticket metrics are available to authorized admins.
- The system can track tickets resolved by AI, open tickets, and tickets transferred to support.

## Recommended Tech Stack

## Frontend

### Single Portal
The previously separate user portal and admin portal are merged into one application with role-based views. A standard authenticated user sees only the AI assistant; an authorized admin sees the administration views.

Recommended options:
- React with TypeScript
- Next.js frontend if server-side rendering is needed
- Angular or Vue if preferred by the development team
- dashboard UI library for admin charts and tables

Suggested capabilities:
- single sign-in and sign-up
- AI assistant chat interface (end-user view)
- file upload component
- response citations panel
- satisfaction feedback component
- role-gated administration views:
  - KPI cards
  - charts and filters
  - chat history viewer
  - live conversation viewer
  - ticket and transfer status views
  - token usage and satisfaction reporting

## Backend

The Azure App Service runtime stack is **Python 3.14**.

Recommended option:
- Python (FastAPI) on Azure App Service — Python 3.14 runtime

Other options if preferred by the development team:
- ASP.NET Core Web API
- Node.js with Express or NestJS

Suggested backend responsibilities:
- authentication: sign-up, sign-in, and role/authorization checks
- chat API for authenticated users
- automatic ticket creation when a conversation starts
- live conversation streaming/visibility for admins
- conversation summary generation on chat close
- administration API
- file handling
- document extraction workflow
- retrieval orchestration
- Azure OpenAI integration
- session and ticket persistence
- metrics aggregation

## AI and Retrieval Layer

Recommended components:
- Azure OpenAI for chat completions, embeddings, and conversation summarization
- Azure AI Search for hybrid/vector retrieval
- optional OCR/document intelligence service if advanced file extraction is required

## Data Layer

Recommended components:
- Azure Blob Storage for file storage
- Azure Database for PostgreSQL (PostgreSQL engine) for relational application data
- optional Azure Cache for Redis for temporary caching

## Azure Resources Required for Production

| Resource Category | Azure Resource | Purpose |
|---|---|---|
| AI inference | Azure OpenAI | Chat response generation, embeddings, and summarization |
| Retrieval | Azure AI Search | Chunk indexing and retrieval |
| File persistence | Azure Storage Account | Uploads, processed files, artifacts |
| Relational data | Azure Database for PostgreSQL | User accounts, chat history, ticketing, summaries, metrics, feedback |
| Secret storage | Azure Key Vault | Keys, secrets, certificates |
| Identity | Microsoft Entra ID | Portal authentication (user sign-in/sign-up) and admin authorization |
| Monitoring | Application Insights | App telemetry and diagnostics |
| Monitoring | Azure Monitor / Log Analytics | Centralized logs and alerts |
| Hosting | Azure App Service (Python 3.14) / Azure Container Apps / AKS | Single portal, APIs, workers |
| Optional cache | Azure Cache for Redis | Session acceleration and caching |
| Optional OCR | Azure AI Document Intelligence | Advanced extraction from PDFs/scans |

> For end-user self-service sign-up and sign-in, Microsoft Entra External ID can be used alongside Microsoft Entra ID for admin authorization, or an equivalent identity provider with role-based authorization.

## Hosting Requirements

## Web Application Hosting

App Service runtime stack: **Python 3.14**. Database engine: **PostgreSQL** (Azure Database for PostgreSQL).

Production hosting can use one of the following patterns:

### Option 1: Azure App Service (recommended)
Recommended when:
- the team wants managed hosting with minimal container overhead
- the portal and backend are standard web applications
- operational simplicity is preferred

Runtime:
- Python 3.14

Can host:
- single portal (AI assistant + administration views)
- backend APIs

### Option 2: Azure Container Apps
Recommended when:
- containerized deployment is preferred
- separate ingestion and summary workers are needed
- autoscaling based on events or HTTP traffic is required

Can host:
- single portal frontend container
- backend API container
- ingestion, summary, or metrics worker containers

### Option 3: AKS
Recommended when:
- the platform requires advanced Kubernetes control
- there are many microservices
- enterprise platform standards mandate Kubernetes

Can host:
- all application workloads
- background processors

## Networking Prerequisites

Recommended production controls:
- custom domain name for the portal
- TLS certificate

## Authentication Prerequisites

The application is fully authenticated; there is no anonymous access.

Required controls:
- users sign in to access the AI assistant
- self-service sign-up is available for new users
- the administration experience is restricted to authorized users via role-based authorization
- use Microsoft Entra ID / Microsoft Entra External ID, or an equivalent identity provider

## Configuration and Secrets

- store application secrets and database credentials in Azure Key Vault
- use managed identities for service-to-service access where possible

## File Upload Prerequisites

Supported file types:
- images/screenshots
- `.md`
- `.doc`
- `.docx`
- `.pdf`

Required controls:
- define max upload size
- validate content type and extension
- define file retention and deletion rules
- extract text from supported document formats

## Data and Schema Prerequisites

PostgreSQL should be prepared to support at minimum:
- user accounts and identity mapping
- authenticated user sessions
- chat messages
- message citations
- attachment metadata
- satisfaction feedback
- ticket records (a ticket ID is created when a conversation starts)
- ticket status tracking
- support transfer tracking
- conversation summaries (created when a chat is closed)
- token usage logs
- admin reporting queries

Storage Account should be prepared with containers for:
- raw uploads
- processed files
- failed processing artifacts
- optional temporary ingestion output

Azure AI Search should be prepared with:
- chunk index
- vector field configuration
- semantic search configuration if used
- metadata fields for citation and filtering

## RAG Processing Prerequisites

Required implementation decisions:
- chunking strategy for knowledge documents
- embedding model selection
- retrieval strategy such as hybrid or vector plus semantic ranking
- prompt structure for grounding and fallback behavior
- handling of user-uploaded document content during a live chat session
- conversation summary generation approach on chat close (model selection and prompt structure)

## Development and Delivery Prerequisites

Required team capabilities:
- frontend development for a single portal with role-based views
- backend/API development (Python / FastAPI)
- Azure infrastructure provisioning
- AI integration and prompt orchestration, including summarization
- database design
- DevOps and CI/CD implementation
- monitoring operations

Required delivery assets:
- source repository
- IaC templates using Bicep or Terraform
- CI/CD pipelines
- environment configuration strategy
- test plan for authentication, chat, upload, retrieval, ticket creation, conversation summaries, and admin reporting

## Environment Prerequisites

Minimum environments:
- Development
- Test or UAT
- Production

Each environment should define:
- Azure subscription or landing zone placement
- resource naming standards
- separate configuration
- deployment slots or staged rollout strategy if needed

## Recommended Production Resource Breakdown

### Unified Portal Layer
- single portal web app (AI assistant + administration views)
- backend API (Python 3.14 on Azure App Service)
- authentication and admin authorization via Microsoft Entra ID / Entra External ID

### AI and Data Layer
- Azure OpenAI resource
- Azure AI Search service
- Storage Account
- Azure Database for PostgreSQL
- Key Vault
- monitoring resources

### Background Processing Layer
- ingestion processor
- document extraction worker
- indexing worker
- conversation summary worker
- metrics aggregation worker if needed

## Optional Enhancements

Depending on enterprise requirements, also consider:
- Azure Service Bus for asynchronous ingestion and support transfer workflows
- Azure Functions for lightweight processing (e.g., summary generation triggers)
- Redis for caching
- Document Intelligence for advanced extraction

## Production Readiness Checklist

Before production deployment, confirm:
- Azure OpenAI capacity and model deployments are approved (including the summarization model)
- Azure AI Search SKU supports required vector workloads
- PostgreSQL sizing supports expected conversation volume
- Storage lifecycle policies are defined
- user sign-up/sign-in and admin authorization are tested
- automatic ticket creation when a conversation starts is verified
- live conversation visibility for admins is verified
- conversation summary generation on chat close is verified
- monitoring, alerts, and dashboards are configured
- backup and restore policies are in place
