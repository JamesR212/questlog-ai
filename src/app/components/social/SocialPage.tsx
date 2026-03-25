'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/gameStore';
import {
  searchUsers, sendFriendRequest, getPendingRequests, acceptRequest,
  declineRequest, getFriends, removeFriend, hasSentRequest, areFriends,
  updateLocation, clearLocation,
} from '@/lib/friends';
import type { PublicProfile, FriendRequest } from '@/lib/friends';

// Dynamically import the map so Leaflet never runs on the server
const FriendsGlobe = dynamic(() => import('./FriendsGlobe'), { ssr: false });

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-ql text-xs font-bold">{value}</span>
      <span className="text-ql-3 text-[9px]">{label}</span>
    </div>
  );
}

function FriendCard({ profile, onRemove }: { profile: PublicProfile; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="bg-ql-surface rounded-2xl border border-ql p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-ql-accent/20 flex items-center justify-center text-lg shrink-0">
        {(profile.display_name || profile.username)?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ql text-sm font-semibold truncate">{profile.display_name || profile.username}</p>
        <p className="text-ql-3 text-xs">@{profile.username} · Lv {profile.level}</p>
      </div>
      <div className="flex gap-3 items-center">
        <StatBadge label="STR" value={profile.str} />
        <StatBadge label="CON" value={profile.con} />
        <StatBadge label="DEX" value={profile.dex} />
      </div>
      <button
        onClick={() => confirming ? onRemove() : setConfirming(true)}
        className={`text-xs px-2 py-1 rounded-lg border transition-colors ${confirming ? 'border-red-400 text-red-400' : 'border-ql text-ql-3 hover:text-ql'}`}
      >
        {confirming ? 'Sure?' : '✕'}
      </button>
    </div>
  );
}

export default function SocialPage({ userId }: { userId: string }) {
  const { userName, shareLocation, setShareLocation } = useGameStore();

  const [search,     setSearch]     = useState('');
  const [results,    setResults]    = useState<PublicProfile[]>([]);
  const [friends,    setFriends]    = useState<PublicProfile[]>([]);
  const [requests,   setRequests]   = useState<FriendRequest[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [sent,       setSent]       = useState<Set<string>>(new Set());
  const [tab,        setTab]        = useState<'friends' | 'search' | 'globe' | 'feedback'>('friends');
  const [fbMessages, setFbMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [fbInput,    setFbInput]    = useState('');
  const [fbLoading,  setFbLoading]  = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError,   setLocError]   = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    const [f, r] = await Promise.all([getFriends(userId), getPendingRequests(userId)]);
    setFriends(f);
    setRequests(r);
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  // When globe tab opens and location sharing is on, try to get current position
  useEffect(() => {
    if (tab !== 'globe' || !shareLocation) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 },
    );
  }, [tab, shareLocation]);

  const toggleShareLocation = async () => {
    if (shareLocation) {
      // Disable — clear from Firestore
      setShareLocation(false);
      setMyLocation(null);
      await clearLocation(userId);
    } else {
      // Enable — request geolocation then publish
      if (!navigator.geolocation) {
        setLocError('Geolocation not supported by this browser.');
        return;
      }
      setLocLoading(true);
      setLocError('');
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setMyLocation({ lat, lng });
          setShareLocation(true);
          await updateLocation(userId, lat, lng);
          setLocLoading(false);
        },
        err => {
          setLocError('Location access denied. Please allow location in your browser settings.');
          setLocLoading(false);
        },
        { timeout: 10000 },
      );
    }
  };

  const doSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const res = await searchUsers(search.trim());
    const filtered = res.filter(p => p.uid !== userId);
    const friendSet = new Set(friends.map(f => f.uid));
    const sentChecks = await Promise.all(
      filtered.filter(p => !friendSet.has(p.uid)).map(p => hasSentRequest(userId, p.uid).then(b => [p.uid, b] as [string, boolean]))
    );
    const newSent = new Set(sent);
    sentChecks.forEach(([uid, b]) => { if (b) newSent.add(uid); });
    setSent(newSent);
    setResults(filtered);
    setLoading(false);
  };

  const addFriend = async (profile: PublicProfile) => {
    const already = await areFriends(userId, profile.uid);
    if (already) return;
    await sendFriendRequest(userId, userName || 'Unknown', userName || 'Unknown', profile.uid);
    setSent(s => new Set(s).add(profile.uid));
  };

  const accept  = async (req: FriendRequest) => { await acceptRequest(req); reload(); };
  const decline = async (req: FriendRequest) => { await declineRequest(req.id); setRequests(r => r.filter(x => x.id !== req.id)); };
  const remove  = async (friendId: string)    => { await removeFriend(userId, friendId); setFriends(f => f.filter(x => x.uid !== friendId)); };

  const friendSet = new Set(friends.map(f => f.uid));
  const friendsOnGlobe = friends.filter(f => f.lat != null && f.lng != null).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-ql text-xl font-bold">Social</h2>
        <p className="text-ql-3 text-xs mt-0.5">Connect with friends and compare stats</p>
      </div>

      {/* ── Pending requests ── */}
      {requests.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-ql text-sm font-semibold">Friend Requests</p>
          <div className="bg-ql-surface rounded-2xl border border-ql overflow-hidden">
            {requests.map((req, i) => (
              <div key={req.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < requests.length - 1 ? 'border-b border-ql' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-ql-accent/20 flex items-center justify-center text-base shrink-0">
                  {req.fromDisplayName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-ql text-sm font-semibold truncate">{req.fromDisplayName}</p>
                  <p className="text-ql-3 text-xs">@{req.fromUsername}</p>
                </div>
                <button onClick={() => accept(req)} className="text-xs px-3 py-1.5 bg-ql-accent text-white rounded-xl font-medium">Accept</button>
                <button onClick={() => decline(req)} className="text-xs px-3 py-1.5 border border-ql text-ql-3 rounded-xl">Decline</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        {(['friends', 'globe', 'search', 'feedback'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${tab === t ? 'bg-ql-accent text-white' : 'bg-ql-surface border border-ql text-ql-3'}`}
          >
            {t === 'friends' ? `Friends${friends.length > 0 ? ` (${friends.length})` : ''}` : t === 'globe' ? '🌍' : t === 'search' ? 'Find' : '💬'}
          </button>
        ))}
      </div>

      {/* ── Friends list ── */}
      {tab === 'friends' && (
        <div className="flex flex-col gap-2">
          {loading && <p className="text-ql-3 text-sm text-center py-4">Loading…</p>}
          {!loading && friends.length === 0 && (
            <div className="bg-ql-surface rounded-2xl border border-ql p-6 text-center">
              <p className="text-ql-3 text-sm">No friends yet — use Find Friends to add some!</p>
            </div>
          )}
          {friends.map(f => (
            <FriendCard key={f.uid} profile={f} onRemove={() => remove(f.uid)} />
          ))}
        </div>
      )}

      {/* ── Globe ── */}
      {tab === 'globe' && (
        <div className="flex flex-col gap-3">
          {/* Map */}
          <div className="rounded-2xl overflow-hidden border border-ql" style={{ height: 380 }}>
            <FriendsGlobe
              friends={friends}
              myLocation={myLocation}
              myName={userName || 'You'}
            />
          </div>

          {/* Friend count on globe */}
          <p className="text-ql-3 text-xs text-center">
            {friendsOnGlobe === 0
              ? 'No friends have shared their location yet'
              : `${friendsOnGlobe} friend${friendsOnGlobe === 1 ? '' : 's'} visible on the globe`}
          </p>

          {/* Location sharing toggle */}
          <div className="bg-ql-surface rounded-2xl border border-ql p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-ql text-sm font-semibold">Share my location</p>
              <p className="text-ql-3 text-xs mt-0.5">
                {shareLocation ? 'Your pin is visible to friends on the globe' : 'You are hidden — friends cannot see your location'}
              </p>
              {locError && <p className="text-red-400 text-xs mt-1">{locError}</p>}
            </div>
            <button
              onClick={toggleShareLocation}
              disabled={locLoading}
              style={{
                position: 'relative', flexShrink: 0,
                width: 48, height: 28, borderRadius: 14,
                background: shareLocation ? 'var(--ql-accent)' : '#9ca3af',
                border: 'none', cursor: locLoading ? 'not-allowed' : 'pointer',
                opacity: locLoading ? 0.5 : 1,
                transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute',
                top: 4, left: shareLocation ? 24 : 4,
                width: 20, height: 20, borderRadius: '50%',
                background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Search ── */}
      {tab === 'search' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Search by username…"
              className="flex-1 bg-ql-surface border border-ql rounded-xl px-4 py-2.5 text-sm text-ql outline-none focus:border-ql-accent transition-colors"
            />
            <button
              onClick={doSearch}
              className="px-4 py-2.5 bg-ql-accent text-white rounded-xl text-sm font-semibold"
            >
              Search
            </button>
          </div>

          {loading && <p className="text-ql-3 text-sm text-center py-4">Searching…</p>}

          {results.length > 0 && (
            <div className="flex flex-col gap-2">
              {results.map(profile => {
                const isFriend  = friendSet.has(profile.uid);
                const requested = sent.has(profile.uid);
                return (
                  <div key={profile.uid} className="bg-ql-surface rounded-2xl border border-ql p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-ql-accent/20 flex items-center justify-center text-lg shrink-0">
                      {(profile.display_name || profile.username)?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ql text-sm font-semibold truncate">{profile.display_name || profile.username}</p>
                      <p className="text-ql-3 text-xs">@{profile.username} · Lv {profile.level}</p>
                    </div>
                    <div className="flex gap-3 items-center mr-2">
                      <StatBadge label="STR" value={profile.str} />
                      <StatBadge label="CON" value={profile.con} />
                      <StatBadge label="DEX" value={profile.dex} />
                    </div>
                    {isFriend ? (
                      <span className="text-xs text-emerald-400 font-medium">Friends</span>
                    ) : requested ? (
                      <span className="text-xs text-ql-3 font-medium">Sent</span>
                    ) : (
                      <button
                        onClick={() => addFriend(profile)}
                        className="text-xs px-3 py-1.5 bg-ql-accent text-white rounded-xl font-medium"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && results.length === 0 && search && (
            <p className="text-ql-3 text-sm text-center py-4">No users found for &quot;{search}&quot;</p>
          )}
        </div>
      )}

      {/* ── Feedback chat ── */}
      {tab === 'feedback' && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-ql text-base font-bold">Share Feedback</h3>
            <p className="text-ql-3 text-xs mt-0.5">Tell us what you love, what could be better, or a feature you&apos;d like to see.</p>
          </div>

          {/* Messages */}
          {fbMessages.length > 0 && (
            <div className="flex flex-col gap-3">
              {fbMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-ql-accent text-white rounded-br-sm'
                      : 'bg-ql-surface border border-ql text-ql rounded-bl-sm'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {fbLoading && (
                <div className="flex justify-start">
                  <div className="bg-ql-surface border border-ql rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <div className="flex gap-1 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-ql-3 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-ql-3 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-ql-3 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {fbMessages.length === 0 && (
            <div className="bg-ql-surface rounded-2xl border border-ql p-4 flex flex-col gap-3">
              <p className="text-ql-3 text-xs">💡 Some ideas to get started:</p>
              {['I love the habit tracker!', 'Could you add a water reminder?', 'The AI gym plans are amazing'].map(s => (
                <button
                  key={s}
                  onClick={() => setFbInput(s)}
                  className="text-left text-xs text-ql-3 border border-ql rounded-xl px-3 py-2 hover:text-ql hover:border-ql-accent transition-colors"
                >
                  &quot;{s}&quot;
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={fbInput}
              onChange={e => setFbInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFeedback(); } }}
              placeholder="Share your thoughts…"
              className="flex-1 bg-ql-surface border border-ql rounded-xl px-4 py-2.5 text-sm text-ql placeholder:text-ql-3 outline-none focus:border-ql-accent"
            />
            <button
              onClick={sendFeedback}
              disabled={!fbInput.trim() || fbLoading}
              className="px-4 py-2.5 bg-ql-accent disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-opacity"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function sendFeedback() {
    const text = fbInput.trim();
    if (!text || fbLoading) return;
    setFbMessages(m => [...m, { role: 'user', text }]);
    setFbInput('');
    setFbLoading(true);
    fetch('/api/feedback/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, userId, userName }),
    })
      .then(r => r.json())
      .then((data: { reply?: string }) => {
        setFbMessages(m => [...m, { role: 'ai', text: data.reply ?? 'Thanks for your feedback!' }]);
      })
      .catch(() => {
        setFbMessages(m => [...m, { role: 'ai', text: 'Thanks for sharing — we really appreciate it!' }]);
      })
      .finally(() => setFbLoading(false));
  }
}
