import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Database, RefreshCw, CheckCircle2, AlertCircle,
  Trash2, Search, FileText, Layers, Upload,
} from 'lucide-react'
import { knowledgeApi } from '../../services/api'
import type { KnowledgeBlob, IngestionResult } from '../../types'
import OrbitLoader from '../OrbitLoader'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fileExt(name: string): string {
  return name.includes('.') ? name.split('.').pop()!.toUpperCase() : 'FILE'
}

interface ConfigStatus {
  storage_configured: boolean
  search_configured: boolean
  openai_configured: boolean
  storage_container: string
}

export default function KnowledgeBase() {
  const [blobs, setBlobs] = useState<KnowledgeBlob[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState<Set<string>>(new Set())
  const [syncingAll, setSyncingAll] = useState(false)
  const [lastResult, setLastResult] = useState<IngestionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await knowledgeApi.listBlobs()
      setBlobs(data)
    } catch {
      setError('Failed to load knowledge base files.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    knowledgeApi.getConfigStatus().then(({ data }) => setConfigStatus(data)).catch(() => {})
  }, [load])

  const handleSyncAll = async () => {
    setSyncingAll(true)
    setLastResult(null)
    setError(null)
    try {
      const { data } = await knowledgeApi.ingestAll()
      setLastResult(data)
      await load()
    } catch {
      setError('Sync failed. Check server logs.')
    } finally {
      setSyncingAll(false)
    }
  }

  const handleSyncOne = async (blobName: string) => {
    setSyncing((s) => new Set(s).add(blobName))
    setError(null)
    try {
      await knowledgeApi.ingestBlob(blobName)
      await load()
    } catch {
      setError(`Failed to sync "${blobName}".`)
    } finally {
      setSyncing((s) => { const n = new Set(s); n.delete(blobName); return n })
    }
  }

  const handleDelete = async (blobName: string) => {
    if (!confirm(`Remove "${blobName}" from the index?`)) return
    setSyncing((s) => new Set(s).add(blobName))
    try {
      await knowledgeApi.deleteBlob(blobName)
      await load()
    } catch {
      setError(`Failed to remove "${blobName}" from index.`)
    } finally {
      setSyncing((s) => { const n = new Set(s); n.delete(blobName); return n })
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    setUploading(true)
    setError(null)
    setUploadSuccess(null)
    try {
      await knowledgeApi.upload(file)
      setUploadSuccess(`"${file.name}" uploaded. Use Sync to index it.`)
      await load()
    } catch {
      setError(`Failed to upload "${file.name}". Supported: PDF, DOCX, MD, TXT, XLSX.`)
    } finally {
      setUploading(false)
    }
  }

  const filtered = blobs.filter(
    (b) => !search || b.blob_name.toLowerCase().includes(search.toLowerCase())
  )

  const totalChunks = blobs.reduce((s, b) => s + b.chunks, 0)
  const indexedCount = blobs.filter((b) => b.indexed).length

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Knowledge Base</h2>
        <div className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.md,.txt,.xlsx,.xls"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Upload size={13} className={uploading ? 'animate-pulse' : ''} />
            {uploading ? 'Uploading…' : '+ Upload'}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleSyncAll}
            disabled={syncingAll || loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <RefreshCw size={13} className={syncingAll ? 'animate-spin' : ''} />
            {syncingAll ? 'Syncing…' : 'Sync All'}
          </button>
        </div>
      </div>

      {/* Azure configuration status banner */}
      {configStatus && (!configStatus.storage_configured || !configStatus.search_configured || !configStatus.openai_configured) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-2">
          <p className="font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-500" />
            Azure credentials not configured — update <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">backend/.env</code> then run <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">docker compose restart backend</code>
          </p>
          <div className="flex gap-4 text-xs">
            <span className={configStatus.storage_configured ? 'text-green-700' : 'text-red-600'}>
              {configStatus.storage_configured ? '✓' : '✗'} Azure Storage (AZURE_STORAGE_CONNECTION_STRING)
            </span>
            <span className={configStatus.search_configured ? 'text-green-700' : 'text-red-600'}>
              {configStatus.search_configured ? '✓' : '✗'} AI Search (AZURE_SEARCH_ENDPOINT + AZURE_SEARCH_API_KEY)
            </span>
            <span className={configStatus.openai_configured ? 'text-green-700' : 'text-red-600'}>
              {configStatus.openai_configured ? '✓' : '✗'} Azure OpenAI (AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY)
            </span>
          </div>
        </div>
      )}

      {/* Result banner */}
      {lastResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          Synced {lastResult.indexed_files}/{lastResult.total_files} files — {lastResult.total_chunks.toLocaleString()} total chunks indexed.
          {lastResult.errors.length > 0 && (
            <span className="ml-1 text-orange-700"> {lastResult.errors.length} error(s).</span>
          )}
        </div>
      )}
      {uploadSuccess && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          {uploadSuccess}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Total chunks</p>
          <p className="text-2xl font-bold text-gray-900">{totalChunks.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Files in storage</p>
          <p className="text-2xl font-bold text-gray-900">{blobs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Indexed files</p>
          <p className="text-2xl font-bold text-gray-900">{indexedCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <OrbitLoader size={40} label="Loading files…" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <Database size={28} className="opacity-40" />
            <p className="text-sm">{search ? 'No files match your search.' : 'No supported files found in the storage container.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((b) => {
              const isBusy = syncing.has(b.blob_name)
              const filename = b.blob_name.includes('/') ? b.blob_name.split('/').pop()! : b.blob_name
              return (
                <div key={b.blob_name} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                  {/* Icon */}
                  <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-primary-600" />
                  </div>

                  {/* Name + path */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{filename}</p>
                    <p className="text-xs text-gray-400 truncate">{b.blob_name} · {formatBytes(b.size)} · {formatDate(b.last_modified)}</p>
                  </div>

                  {/* Chunks */}
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 min-w-[80px] shrink-0">
                    <Layers size={13} className="text-gray-400" />
                    <span className="font-medium">{b.chunks.toLocaleString()}</span>
                    <span className="text-xs text-gray-400">chunks</span>
                  </div>

                  {/* Type badge */}
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                    {fileExt(b.blob_name)}
                  </span>

                  {/* Status */}
                  <div className="flex items-center gap-1.5 min-w-[80px] shrink-0">
                    {b.indexed ? (
                      <><CheckCircle2 size={13} className="text-green-500" /><span className="text-xs font-medium text-green-600">Indexed</span></>
                    ) : (
                      <><AlertCircle size={13} className="text-orange-400" /><span className="text-xs font-medium text-orange-500">Not indexed</span></>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleSyncOne(b.blob_name)}
                      disabled={isBusy || syncingAll}
                      title="Sync this file"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-40 transition-colors"
                    >
                      <RefreshCw size={13} className={isBusy ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={() => handleDelete(b.blob_name)}
                      disabled={isBusy || !b.indexed}
                      title="Remove from index"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
