import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, limit, deleteField,
} from 'firebase/firestore';
import { db } from './firebase';

export interface PublicProfile {
  uid: string;
  username: string;
  display_name: string;
  level: number;
  xp: number;
  str: number;
  con: number;
  dex: number;
  updatedAt: string;
  lat?: number;
  lng?: number;
}

export interface FriendRequest {
  id: string;
  from: string;
  fromUsername: string;
  fromDisplayName: string;
  to: string;
  createdAt: string;
  status?: 'pending' | 'accepted';
}

// ── Profile ────────────────────────────────────────────────────────────────

export async function updatePublicProfile(
  userId: string,
  data: { username: string; displayName: string; level: number; xp: number; str: number; con: number; dex: number; profilePicUrl?: string }
) {
  try {
    await setDoc(doc(db, 'profiles', userId), {
      uid: userId,
      username: data.username,
      username_lower: data.username.trim().toLowerCase(),
      display_name: data.displayName,
      level: data.level,
      xp: data.xp,
      str: data.str,
      con: data.con,
      dex: data.dex,
      ...(data.profilePicUrl !== undefined ? { profilePicUrl: data.profilePicUrl } : {}),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.error('[friends] updatePublicProfile error:', e);
  }
}

/** Returns true if the username is not taken by anyone other than currentUserId */
export async function checkUsernameAvailable(username: string, currentUserId: string): Promise<boolean> {
  try {
    const q = query(collection(db, 'profiles'), where('username_lower', '==', username.trim().toLowerCase()), limit(2));
    const snap = await getDocs(q);
    // Available if no docs, or only doc is current user
    return snap.docs.every(d => d.id === currentUserId);
  } catch {
    return true; // fail open
  }
}

export async function updateLocation(userId: string, lat: number, lng: number): Promise<void> {
  try {
    await setDoc(doc(db, 'profiles', userId), { lat, lng }, { merge: true });
  } catch (e) {
    console.error('[friends] updateLocation error:', e);
  }
}

export async function clearLocation(userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'profiles', userId), { lat: deleteField(), lng: deleteField() });
  } catch (e) {
    console.error('[friends] clearLocation error:', e);
  }
}

export async function searchUsers(username: string): Promise<PublicProfile[]> {
  try {
    const original = username.trim();
    const lower = original.toLowerCase();

    // Run two queries in parallel:
    // 1. username_lower — case-insensitive, works for profiles written after the fix
    // 2. username — case-sensitive fallback for older profiles without username_lower
    const [snap1, snap2] = await Promise.all([
      getDocs(query(
        collection(db, 'profiles'),
        where('username_lower', '>=', lower),
        where('username_lower', '<=', lower + '\uf8ff'),
        limit(10)
      )),
      getDocs(query(
        collection(db, 'profiles'),
        where('username', '>=', original),
        where('username', '<=', original + '\uf8ff'),
        limit(10)
      )),
    ]);

    const seen = new Set<string>();
    const results: PublicProfile[] = [];
    for (const snap of [snap1, snap2]) {
      for (const d of snap.docs) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          results.push(d.data() as PublicProfile);
        }
      }
    }
    return results;
  } catch (e) {
    console.error('[friends] searchUsers error:', e);
    return [];
  }
}

export async function getProfile(userId: string): Promise<PublicProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'profiles', userId));
    return snap.exists() ? snap.data() as PublicProfile : null;
  } catch {
    return null;
  }
}

// ── Friend requests ────────────────────────────────────────────────────────

export async function sendFriendRequest(
  fromId: string, fromUsername: string, fromDisplayName: string, toId: string
): Promise<void> {
  const id = `${fromId}_${toId}`;
  await setDoc(doc(db, 'friendRequests', id), {
    from: fromId,
    fromUsername,
    fromDisplayName,
    to: toId,
    createdAt: new Date().toISOString(),
  });
}

export async function getPendingRequests(userId: string): Promise<FriendRequest[]> {
  try {
    const q = query(
      collection(db, 'friendRequests'),
      where('to', '==', userId),
      where('status', '==', 'pending'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest));
  } catch (e) {
    // Fallback: fetch without status filter (for requests written before the status field existed)
    try {
      const q2 = query(collection(db, 'friendRequests'), where('to', '==', userId));
      const snap2 = await getDocs(q2);
      return snap2.docs
        .map(d => ({ id: d.id, ...d.data() } as FriendRequest))
        .filter(r => !r.status || r.status === 'pending');
    } catch {
      return [];
    }
  }
}

export async function acceptRequest(request: FriendRequest): Promise<void> {
  // Only write to the recipient's own friends list (avoids rules blocking cross-user writes).
  // Mark the request as 'accepted' so the sender's next getFriends call can process it
  // and add the recipient to their own list.
  await Promise.all([
    setDoc(doc(db, 'friends', request.to, 'list', request.from), { addedAt: new Date().toISOString() }),
    setDoc(doc(db, 'friendRequests', request.id), { ...request, status: 'accepted' }),
  ]);
}

export async function declineRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendRequests', requestId));
}

// ── Friends list ───────────────────────────────────────────────────────────

export async function getFriends(userId: string): Promise<PublicProfile[]> {
  try {
    // Process any outgoing requests that the other user has accepted.
    // This lets us add them to our own list without needing to write to their subcollection.
    const acceptedQ = query(
      collection(db, 'friendRequests'),
      where('from', '==', userId),
      where('status', '==', 'accepted'),
    );
    const acceptedSnap = await getDocs(acceptedQ);
    if (acceptedSnap.docs.length > 0) {
      await Promise.all(acceptedSnap.docs.map(d => {
        const req = d.data() as FriendRequest;
        return Promise.all([
          setDoc(doc(db, 'friends', userId, 'list', req.to), { addedAt: new Date().toISOString() }),
          deleteDoc(doc(db, 'friendRequests', d.id)),
        ]);
      }));
    }

    const snap = await getDocs(collection(db, 'friends', userId, 'list'));
    const friendIds = snap.docs.map(d => d.id);
    if (friendIds.length === 0) return [];
    const profiles = await Promise.all(friendIds.map(id => getProfile(id)));
    return profiles.filter(Boolean) as PublicProfile[];
  } catch (e) {
    console.error('[friends] getFriends error:', e);
    return [];
  }
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, 'friends', userId, 'list', friendId)),
    deleteDoc(doc(db, 'friends', friendId, 'list', userId)),
  ]);
}

export async function areFriends(userId: string, otherId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'friends', userId, 'list', otherId));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function hasSentRequest(fromId: string, toId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'friendRequests', `${fromId}_${toId}`));
    return snap.exists();
  } catch {
    return false;
  }
}
