import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

function ChatPanel({ user, contacts = [], onClose }) {
  const [messagesByPeer, setMessagesByPeer] = useState({})
  const [activePeerId, setActivePeerId] = useState(contacts[0]?.id || '')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [unreadByPeer, setUnreadByPeer] = useState({})
  const [profiles, setProfiles] = useState({})

  const mergedContacts = useMemo(() => {
    const byId = {}
    contacts.forEach((c) => {
      if (!c?.id) return
      byId[c.id] = { id: c.id, label: c.label || c.name || c.id }
    })

    Object.keys(messagesByPeer).forEach((peerId) => {
      if (!byId[peerId]) byId[peerId] = { id: peerId, label: profiles[peerId] || peerId }
    })

    return Object.values(byId).map((c) => ({
      ...c,
      label: profiles[c.id] || c.label,
      unread: unreadByPeer[c.id] || 0,
      lastAt: messagesByPeer[c.id]?.[messagesByPeer[c.id].length - 1]?.created_at || '',
    })).sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)))
  }, [contacts, messagesByPeer, profiles, unreadByPeer])

  useEffect(() => {
    if (!activePeerId && mergedContacts.length > 0) {
      setActivePeerId(mergedContacts[0].id)
    }
  }, [activePeerId, mergedContacts])

  const fetchProfiles = async (ids) => {
    const uniqueIds = [...new Set(ids.filter(Boolean))]
    if (uniqueIds.length === 0) return
    const { data } = await supabase.from('profiles').select('id, full_name').in('id', uniqueIds)
    if (!data) return
    const map = {}
    data.forEach((p) => { map[p.id] = p.full_name || p.id })
    setProfiles((prev) => ({ ...prev, ...map }))
  }

  const mergeAndSort = (a = [], b = []) => {
    const map = new Map()
    ;[...a, ...b].forEach((m) => map.set(m.id, m))
    return Array.from(map.values()).sort((x, y) => new Date(x.created_at) - new Date(y.created_at))
  }

  const fetchPeerMessages = async (peerId) => {
    if (!peerId || !user?.id) return []
    const [sent, received] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .eq('sender_id', user.id)
        .eq('receiver_id', peerId)
        .order('created_at', { ascending: true }),
      supabase
        .from('messages')
        .select('*')
        .eq('sender_id', peerId)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: true }),
    ])

    const combined = mergeAndSort(sent.data, received.data)
    setMessagesByPeer((prev) => ({ ...prev, [peerId]: combined }))

    const unreadCount = combined.filter((m) => m.receiver_id === user.id && !m.is_read).length
    setUnreadByPeer((prev) => ({ ...prev, [peerId]: unreadCount }))

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', peerId)
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    setUnreadByPeer((prev) => ({ ...prev, [peerId]: 0 }))
    return combined
  }

  const refreshAll = async () => {
    if (!user?.id) return
    setLoading(true)
    const peerIds = mergedContacts.map((c) => c.id)
    await fetchProfiles(peerIds)
    await Promise.all(peerIds.map((peerId) => fetchPeerMessages(peerId)))
    setLoading(false)
  }

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, contacts.length])

  useEffect(() => {
    if (!user?.id) return
    const incomingChannel = supabase
      .channel(`chat-in-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          const peerId = payload.new?.sender_id || payload.old?.sender_id
          if (peerId) await fetchPeerMessages(peerId)
        }
      )
      .subscribe()

    const outgoingChannel = supabase
      .channel(`chat-out-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` },
        async (payload) => {
          const peerId = payload.new?.receiver_id || payload.old?.receiver_id
          if (peerId) await fetchPeerMessages(peerId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(incomingChannel)
      supabase.removeChannel(outgoingChannel)
    }
  }, [user?.id])

  const sendMessage = async () => {
    if (!draft.trim() || !activePeerId || !user?.id) return
    setSending(true)
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activePeerId,
      content: draft.trim(),
      is_read: false,
    })
    setDraft('')
    await fetchPeerMessages(activePeerId)
    setSending(false)
  }

  const activeMessages = messagesByPeer[activePeerId] || []

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex overflow-hidden">
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="px-4 py-3 bg-green-700 text-white font-bold">💬 Messages</div>
          <div className="overflow-y-auto flex-1">
            {mergedContacts.length === 0 ? (
              <p className="text-sm text-gray-500 p-4">No chats yet.</p>
            ) : mergedContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setActivePeerId(c.id)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-green-50 ${activePeerId === c.id ? 'bg-green-100' : ''}`}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-medium text-gray-800 truncate">{c.label}</span>
                  {c.unread > 0 && <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">{c.unread}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b flex justify-between items-center">
            <p className="font-semibold text-gray-800">{profiles[activePeerId] || activePeerId || 'Select a chat'}</p>
            <button onClick={onClose} className="text-gray-500 text-2xl">×</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-green-50">
            {loading ? (
              <p className="text-sm text-gray-500">Loading messages...</p>
            ) : activeMessages.length === 0 ? (
              <p className="text-sm text-gray-500">No messages yet. Start conversation.</p>
            ) : activeMessages.map((m) => (
              <div key={m.id} className={`max-w-[75%] px-3 py-2 rounded-xl ${m.sender_id === user.id ? 'ml-auto bg-green-600 text-white' : 'bg-white border text-gray-800'}`}>
                <p className="text-sm whitespace-pre-wrap">{m.content || m.message || ''}</p>
                <p className={`text-[10px] mt-1 ${m.sender_id === user.id ? 'text-green-100' : 'text-gray-400'}`}>
                  {new Date(m.created_at).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t p-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !activePeerId}
              className="bg-green-600 text-white px-4 rounded-lg disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPanel
