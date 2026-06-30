# CloudLabs Chat Bot — Change Log

## Session 2 — Full Feature Build

### Backend Changes

#### `backend/app/main.py`
- Added `ALTER TYPE ticketstatus ADD VALUE` migrations for `l2_escalated` and `owner_escalated` statuses run at startup

#### `backend/app/models/ticket.py`
- Added `l2_escalated` and `owner_escalated` values to `TicketStatus` enum

#### `backend/app/api/routes/tickets.py`
- Added `POST /tickets/{ticket_id}/raise` — marks ticket as `open` (raises to support queue)
- Added `GET /tickets/{ticket_id}` — fetch a single ticket by ID (user-facing)

#### `backend/app/api/routes/admin.py`
- `GET /admin/tickets` — returns ticket list with user name, email, message count
- `GET /admin/tickets/open-count` — counts only explicitly-raised tickets (`open`, `transferred_to_support`, `l2_escalated`, `owner_escalated`); excludes AI-only sessions
- `GET /admin/tickets/{ticket_id}` — single ticket detail
- `PUT /admin/tickets/{ticket_id}/status` — update ticket status to any valid value
- `POST /admin/sessions/{session_id}/messages` — admin sends support reply; automatically promotes ticket from `open` → `transferred_to_support` so user's polling sees the change
- `POST /admin/tickets/{ticket_id}/escalate-l2` — escalate to L2 Engineer
- `POST /admin/tickets/{ticket_id}/escalate-owner` — escalate to Lab Owner
- `POST /admin/ai-query` — RAG-powered admin AI query with optional ticket session context
- `GET /admin/knowledge/config-status` — reports which Azure services are configured
- `GET /admin/knowledge/blobs` — list storage container files with chunk counts
- `POST /admin/knowledge/ingest` — trigger indexing (all or single blob)
- `DELETE /admin/knowledge/blobs/{blob_name}` — remove blob from search index
- `POST /admin/knowledge/upload` — upload file to Azure Blob Storage

#### `backend/app/services/openai_service.py`
- Wrapped `client.chat.completions.create()` in try/except — returns user-friendly message instead of 500 on connection errors
- Added `re.sub()` to strip `[Context Reference(#...)]` citation artifacts from AI responses

#### `backend/app/services/knowledge_service.py`
- Implemented Azure Blob Storage list, upload, and delete functions
- Implemented Azure AI Search index creation, chunked ingestion, and deletion

#### `backend/requirements.txt`
- Pinned `passlib[bcrypt]==1.7.4` + `bcrypt==3.2.2` (passlib incompatible with bcrypt 4.x)
- Added `azure-storage-blob`, `azure-search-documents`, `python-docx`, `openpyxl`, `markdown`

---

### Frontend Changes

#### `frontend/src/types/index.ts`
- Added `l2_escalated` and `owner_escalated` to `TicketStatus` union type

#### `frontend/src/services/api.ts`
- Added `ticketApi.raise()`, `ticketApi.getById()`
- Added `adminApi.sendSessionMessage()`, `adminApi.getOpenTicketCount()`, `adminApi.getTicket()`, `adminApi.escalateToL2()`, `adminApi.escalateToOwner()`, `adminApi.aiQuery()`, `adminApi.updateTicketStatus()`
- Added `knowledgeApi.upload()`, `knowledgeApi.getConfigStatus()`, `knowledgeApi.listBlobs()`, `knowledgeApi.ingestAll()`, `knowledgeApi.ingestBlob()`, `knowledgeApi.deleteBlob()`

#### `frontend/src/store/chatStore.ts`
- Added `setTicket()` action for updating ticket state from the `useChat` hook

#### `frontend/src/hooks/useChat.ts`
- Added `isRaising` state and `raiseTicket()` callback
- Fetches welcome message after session creation (so AI greeting shows immediately)
- Polls every 30s for new messages and ticket status when ticket is in a human-handling status

#### `frontend/src/utils/markdown.tsx` *(new file)*
- React-safe inline markdown renderer (no `dangerouslySetInnerHTML`)
- Handles `**bold**`, `*italic*`, `[text](url)` clickable links, `` `code` ``
- Strips `[Context Reference(#...)]` citation lines that the AI may append

#### `frontend/src/components/chat/ChatWidget.tsx`
- Full-page dark layout replacing the old chat widget popup
- Removed sign-out button; cleaned up user auth display
- Status banner changes dynamically:
  - `open` → "Awaiting Support" (orange clock)
  - `transferred_to_support` → "Support is helping you" (purple headphones)
  - `l2_escalated` / `owner_escalated` → "Support is helping you"
  - `resolved_by_ai` → "Resolved"
- "Raise Support Ticket" button with confirmation step
- "Support team will contact you" / "Support team is helping you" banner when human-handling

#### `frontend/src/components/chat/MessageBubble.tsx`
- AI messages now rendered with `renderMarkdown()` — bold, links, code all work
- User messages kept as plain `whitespace-pre-wrap` text
- Added `dark` prop for dark-mode styling

#### `frontend/src/components/chat/MessageList.tsx`
- Added `dark` prop, passed down to `MessageBubble`

#### `frontend/src/components/chat/SuggestionChips.tsx`
- Updated suggestions: "Lab won't launch", "VM not accessible", "Lab guide issue", "Need more time for lab"
- Added `dark` prop for conditional styling

#### `frontend/src/components/admin/AdminLayout.tsx`
- Passes `onNavigate` prop to `TopBar` so the settings icon can navigate

#### `frontend/src/components/admin/TopBar.tsx`
- Added `onNavigate` prop
- Settings icon now calls `onNavigate('settings')` when clicked
- Notification bell counts only raised tickets (`open` + escalated statuses), not AI-only sessions
- Polls every 30s for updated count

#### `frontend/src/components/admin/AIChat.tsx`
- Full rewrite: uses real `adminApi.aiQuery()` with Azure RAG
- Ticket context dropdown loads all tickets
- When a ticket is selected, **existing conversation history is loaded** and displayed in a scrollable panel above the AI chat
- Support messages show in purple (stripping `[Support]` prefix); AI messages render markdown
- AI replies rendered with `renderMarkdown()`

#### `frontend/src/components/admin/IssueExplorer.tsx`
- Status filter tabs: Raised, L1 Support, L2 Engineer, Lab Owner, Closed, All
- Defaults to "Raised" (`open`) filter so admin sees only explicitly-raised tickets
- Status update dropdown simplified to: **Open, Resolved, Closed** (removed L1/L2/Owner)
- Conversation panel renders markdown for AI messages
- `[Support]` messages shown in purple with "· Support" label (prefix stripped from display)

#### `frontend/src/components/admin/KnowledgeBase.tsx`
- Added Azure configuration status banner — shows which services are unconfigured with exact env var names
- File upload button (PDF, DOCX, MD, TXT, XLSX)
- Per-file sync and delete buttons
- Chunk count and indexed status per file

#### `frontend/src/components/admin/ConversationList.tsx`
- Added `l2_escalated` and `owner_escalated` to status color/label maps

---

### Infrastructure

#### `.gitignore` *(new file)*
- Ignores `backend/.env`, `__pycache__`, `node_modules`, `dist`, Vite cache, OS files

#### `backend/.env.example` *(new file)*
- Template with placeholder values for all required environment variables
- Copy to `backend/.env` and fill in real credentials before running

---

## How to Run

```bash
# 1. Copy and fill in credentials
cp backend/.env.example backend/.env
# edit backend/.env with real Azure keys

# 2. Start all services
docker compose up --build -d

# 3. Access
#   User portal:  http://localhost:3000
#   Admin portal: http://localhost:3000/admin
#   API docs:     http://localhost:8000/docs
```
