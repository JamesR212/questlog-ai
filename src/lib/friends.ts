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
}

// ── Profile ────────────────────────────────────────────────────────────────

export async function updatePublicProfile(
  userId: string,
  data: { username: string; displayName: string; level: number; xp: number; str: number; con: number; dex: number }
) {
  try {
    await setDoc(doc(db, 'profiles', userId), {
      uid: userId,
      username: data.username,
      display_name: data.displayName,
      level: data.level,
      xp: data.xp,
      str: data.str,
      con: data.con,
      dex: data.dex,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.error('[friends] updatePublicProfile error:', e);
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
    const q = query(
      collection(db, 'profiles'),
      where('username', '>=', username),
      where('username', '<=', username + '\uf8ff'),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PublicProfile);
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
    const q = query(collection(db, 'friendRequests'), where('to', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest));
  } catch (e) {
    console.error('[friends] getPendingRequests error:', e);
    return [];
  }
}

export async function acceptRequest(request: FriendRequest): Promise<void> {
  await Promise.all([
    setDoc(doc(db, 'friends', request.to, 'list', request.from), { addedAt: new Date().toISOString() }),
    setDoc(doc(db, 'friends', request.from, 'list', request.to), { addedAt: new Date().toISOString() }),
    deleteDoc(doc(db, 'friendRequests', request.id)),
  ]);
}

export async function declineRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendRequests', requestId));
}

// ── Friends list ───────────────────────────────────────────────────────────

export async function getFriends(userId: string): Promise<PublicProfile[]> {
  try {
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
