import { useState, useEffect } from 'react';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    setDoc,
    getDoc,
    deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useStudyRooms() {
    const { currentUser } = useAuth();
    const [rooms, setRooms] = useState([]);
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [roomNotes, setRoomNotes] = useState([]);
    const [loading, setLoading] = useState(false);

    // 1. Listen to Rooms I am a member of
    // Since 'members' is a map {uid: true}, we can't easily query "where members.uid == true" in simple index
    // Standard workaround: Array "memberIds" or a separate collection.
    // For this prototype, we'll store `memberIds` array for querying.
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "study_rooms"),
            where("memberIds", "array-contains", currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roomList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setRooms(roomList);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // 2. Listen to Notes in Active Room
    useEffect(() => {
        if (!activeRoomId) {
            setRoomNotes([]);
            return;
        }

        const notesRef = collection(db, "study_rooms", activeRoomId, "notes");
        const q = query(notesRef); // order by?

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort by timestamp desc
            notes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setRoomNotes(notes);
        });

        return () => unsubscribe();
    }, [activeRoomId]);

    // --- Actions ---

    const createRoom = async (name) => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit string
            const roomData = {
                name,
                code,
                ownerId: currentUser.uid,
                createdAt: serverTimestamp(),
                members: { [currentUser.uid]: { email: currentUser.email, role: 'owner' } },
                memberIds: [currentUser.uid]
            };

            const docRef = await addDoc(collection(db, "study_rooms"), roomData);
            return { id: docRef.id, ...roomData };
        } catch (e) {
            console.error("Error creating room", e);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const joinRoom = async (code) => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const q = query(collection(db, "study_rooms"), where("code", "==", code));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                throw new Error("Invalid Room Code");
            }

            const roomDoc = snapshot.docs[0];
            const roomId = roomDoc.id;
            const roomData = roomDoc.data();

            if (roomData.memberIds.includes(currentUser.uid)) {
                return roomId; // Already joined
            }

            // Update
            const newMembers = { ...roomData.members, [currentUser.uid]: { email: currentUser.email, role: 'member' } };
            const newMemberIds = [...roomData.memberIds, currentUser.uid];

            await updateDoc(doc(db, "study_rooms", roomId), {
                members: newMembers,
                memberIds: newMemberIds
            });

            return roomId;
        } catch (e) {
            console.error("Error joining room", e);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const shareNoteToRoom = async (roomId, note) => {
        if (!currentUser || !roomId) return;
        try {
            // copy note to subcollection
            const noteData = {
                ...note,
                sharedBy: currentUser.email,
                sharedAt: serverTimestamp(),
                originalNoteId: note.id
            };
            // Remove local ID to ensure new ID generated
            delete noteData.id;

            await addDoc(collection(db, "study_rooms", roomId, "notes"), noteData);
        } catch (e) {
            console.error("Error sharing note", e);
            throw e;
        }
    };

    const shareFolderToRoom = async (roomId, folderId, allNotes) => {
        // Find all notes in this folder
        const folderNotes = allNotes.filter(n => n.folderId === folderId);
        const promises = folderNotes.map(note => shareNoteToRoom(roomId, note));
        await Promise.all(promises);
    };

    const shareSpecificNotesToRoom = async (roomId, notesToShare) => {
        // notesToShare is an array of note objects
        // If IDs are passed, we need the full objects. I'll assume full objects or look them up.
        // Actually NoteApp will pass IDs? Or Objects?
        // NoteApp has access to objects. Let's assume note objects are passed.
        const promises = notesToShare.map(note => shareNoteToRoom(roomId, note));
        await Promise.all(promises);
    };

    const deleteRoom = async (roomId) => {
        if (!currentUser) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, "study_rooms", roomId));
        } catch (e) {
            console.error("Error deleting room", e);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    return {
        rooms,
        activeRoomId,
        setActiveRoomId,
        roomNotes,
        createRoom,
        joinRoom,
        shareNoteToRoom,
        shareFolderToRoom,
        shareSpecificNotesToRoom,
        deleteRoom,
        loading
    };
}
