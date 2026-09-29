import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowUp, Brain, LoaderCircle, MessageSquare, Sparkles, UserRound } from 'lucide-react'
import { clientsApi, conversationsApi } from '../services/api'
import IngestNotesModal from '../components/IngestNotesModal'

export default function AIChat() {
  const [clientId, setClientId] = useState('')
  const [draft, setDraft] = useState('')
  const [why, setWhy] = useState('')
  const [pendingUserMsg, setPendingUserMsg] = useState('')
  const [ingestOpen, setIngestOpen] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)

  const clients = useQuery({
    queryKey: ['clients', ''],
    queryFn: () => clientsApi.list(),
  })

  useEffect(() => {
    if (!clientId && clients.data?.[0]) {
      setClientId(clients.data[0].id)
    }
  }, [clientId, clients.data])

  const history = useQuery({
    queryKey: ['conversations', clientId],
    queryFn: () => conversationsApi.list(clientId),
    enabled: Boolean(clientId),
  })

  const chat = useMutation({
    mutationFn: conversationsApi.chat,
    onSuccess: (result) => {
      setPendingUserMsg('')
      setWhy(result.explanation)
      void history.refetch()
    },
    onError: () => {
      setPendingUserMsg('')
    },
  })

  const handleSend = (textToSend?: string) => {
    const message = (textToSend ?? draft).trim()
    if (!clientId || !message || chat.isPending) return
    setPendingUserMsg(message)
    setDraft('')
    chat.mutate({ client_id: clientId, message })
  }

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history.data, chat.isPending, pendingUserMsg])

  const messages = [...(history.data ?? [])].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime()
    const timeB = new Date(b.created_at).getTime()
    if (timeA !== timeB) return timeA - timeB
    if (a.role === 'user' && b.role === 'assistant') return -1
    if (a.role === 'assistant' && b.role === 'user') return 1
    return 0
  })
  const activeClient = clients.data?.find((c) => c.id === clientId)

  return (
    <div className="page-wrap chat-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">A SECOND BRAIN FOR YOUR BUSINESS</p>
          <h1>AI assistant</h1>
          <p className="subheading">
            Answers grounded in memories, requirements, and payment context.
          </p>
        </div>
        <label className="chat-client-select">
          <span>WITH</span>
          <select
            aria-label="Choose client"
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value)
              setWhy('')
            }}
          >
            <option value="">Choose a client</option>
            {clients.data?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="chat-window">
        <div className="chat-topline">
          <span className="assistant-mark">
            <Sparkles size={15} />
          </span>
          <span>
            <b>Memo assistant</b>
            <small>
              <i /> Memory aware
            </small>
          </span>
          {clientId && (
            <button
              type="button"
              className="chat-ingest-trigger"
              onClick={() => setIngestOpen(true)}
            >
              <MessageSquare size={13} /> Import WhatsApp / Email
            </button>
          )}
          <div className="privacy-note">
            <Brain size={14} /> Client context on-demand
          </div>
        </div>

        <div className="chat-messages">
          {!clientId ? (
            <div className="chat-welcome">
              <span className="chat-welcome-icon">
                <Brain size={25} />
              </span>
              <h2>
                Good context makes
                <br />
                better conversations.
              </h2>
              <p>
                Choose a client above and ask about preferences, project history, or what to prepare next.
              </p>
            </div>
          ) : history.isLoading ? (
            <div className="state-panel">
              <span className="spinner" />
              Loading conversation…
            </div>
          ) : history.isError ? (
            <div className="state-panel error-panel">{history.error.message}</div>
          ) : messages.length === 0 && !pendingUserMsg ? (
            <div className="chat-welcome">
              <span className="chat-welcome-icon">
                <Sparkles size={24} />
              </span>
              <h2>
                What would you like
                <br />
                to check or plan?
              </h2>
              <p>
                Ask about client preferences, suggest Indian Rupee payment milestones, or identify missing requirements.
              </p>
              <div className="prompt-chips">
                <button
                  type="button"
                  onClick={() => handleSend('What should I keep in mind about this client?')}
                >
                  What should I keep in mind?
                </button>
                <button
                  type="button"
                  onClick={() => handleSend('Suggest milestone payment breakdown in INR (₹) for our active work.')}
                >
                  Payment milestones (INR ₹)
                </button>
                <button
                  type="button"
                  onClick={() => handleSend('Review client requirements and tell me what scope risks or changes are needed.')}
                >
                  Scope & requirements review
                </button>
                <button
                  type="button"
                  onClick={() => handleSend('Draft a polite WhatsApp payment reminder for upcoming milestones.')}
                >
                  WhatsApp payment reminder
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <article
                  className={`chat-message ${message.role === 'assistant' ? 'assistant-message' : 'user-message'}`}
                  key={message.id}
                >
                  <span className="message-icon">
                    {message.role === 'assistant' ? <Sparkles size={14} /> : <UserRound size={14} />}
                  </span>
                  <div>
                    <div className="message-author">
                      {message.role === 'assistant' ? 'Memo' : 'You'}{' '}
                      <time>
                        {new Date(message.created_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <p>{message.content}</p>
                  </div>
                </article>
              ))}

              {pendingUserMsg && (
                <article className="chat-message user-message">
                  <span className="message-icon">
                    <UserRound size={14} />
                  </span>
                  <div>
                    <div className="message-author">You</div>
                    <p>{pendingUserMsg}</p>
                  </div>
                </article>
              )}
            </>
          )}

          {chat.isPending && (
            <div className="chat-message assistant-message">
              <span className="message-icon">
                <Sparkles size={14} />
              </span>
              <div>
                <div className="message-author">Memo</div>
                <p className="thinking">
                  <LoaderCircle size={14} /> Memo is thinking…
                </p>
              </div>
            </div>
          )}

          {why && (
            <details className="chat-why">
              <summary>Why this response?</summary>
              <p>{why}</p>
            </details>
          )}

          <div ref={bottom} />
        </div>

        {chat.isError && <p className="chat-error" role="alert">{chat.error.message}</p>}

        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault()
            handleSend()
          }}
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={clientId ? 'Ask anything or request client details…' : 'Choose a client to begin'}
            aria-label="Message the assistant"
            disabled={!clientId || chat.isPending}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            className="send-button"
            aria-label="Send message"
            disabled={!clientId || !draft.trim() || chat.isPending}
          >
            <ArrowUp size={17} />
          </button>
          <span className="composer-hint">Ask any question or request client data on demand · Enter to send</span>
        </form>
      </section>

      {activeClient && (
        <IngestNotesModal
          open={ingestOpen}
          clientId={clientId}
          clientName={activeClient.name}
          onClose={() => setIngestOpen(false)}
          onMemoriesAdded={() => {
            void history.refetch()
          }}
        />
      )}
    </div>
  )
}
