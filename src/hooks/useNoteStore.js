import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import {
    collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { useLocalStorage } from './useLocalStorage';

export function useNoteStore() {
    const { currentUser } = useAuth();

    // Local Storage State
    const [localNotes, setLocalNotes] = useLocalStorage('lecturesnap-notes', []);
    const [localFolders, setLocalFolders] = useLocalStorage('lecturesnap-folders', [{ id: 'default', name: 'General', color: '#3b82f6' }]);
    const [localFiles, setLocalFiles] = useLocalStorage('lecturesnap-files', []);
    const [localActiveFolder, setLocalActiveFolder] = useLocalStorage('lecturesnap-active-folder', 'default');
    const [localActiveFile, setLocalActiveFile] = useLocalStorage('lecturesnap-active-file', null);
    const [localStudyTime, setLocalStudyTime] = useLocalStorage('lecturesnap-study-time', 0); // In seconds

    // Cloud State
    const [cloudNotes, setCloudNotes] = useState([]);
    const [cloudFolders, setCloudFolders] = useState([{ id: 'default', name: 'General', color: '#3b82f6' }]);
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudActiveFolder, setCloudActiveFolder] = useState('default');
    const [cloudActiveFile, setCloudActiveFile] = useState(null);
    const [cloudStudyTime, setCloudStudyTime] = useState(0);
    const [loading, setLoading] = useState(false);

    // Sync Cloud Data
    useEffect(() => {
        if (!currentUser) {
            setCloudNotes([]);
            setCloudFolders([]);
            setCloudFiles([]);
            return;
        }

        setLoading(true);

        const folderQ = query(collection(db, `users/${currentUser.uid}/folders`));
        const unsubFolders = onSnapshot(folderQ, (snapshot) => {
            const folders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (folders.length === 0) {
                setDoc(doc(db, `users/${currentUser.uid}/folders`, 'default'), { name: 'General', color: '#3b82f6' });
            } else {
                setCloudFolders(folders);
            }
        });

        const filesQ = query(collection(db, `users/${currentUser.uid}/files`));
        const unsubFiles = onSnapshot(filesQ, (snapshot) => {
            const files = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setCloudFiles(files);
        });

        const notesQ = query(collection(db, `users/${currentUser.uid}/notes`));
        const unsubNotes = onSnapshot(notesQ, (snapshot) => {
            const notes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setCloudNotes(notes);
            setLoading(false);
        });

        // Sync Profile Data (Study Time, Active Location)
        const unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setCloudStudyTime(data.totalStudyTime || 0);
                if (data.activeFolderId) setCloudActiveFolder(data.activeFolderId);
                if (data.activeFileId !== undefined) setCloudActiveFile(data.activeFileId);
            }
        });

        return () => {
            unsubFolders();
            unsubFiles();
            unsubNotes();
            unsubProfile();
        };
    }, [currentUser]);

    // --- Actions ---

    const addNote = async (noteData) => {
        if (currentUser) {
            await setDoc(doc(db, `users/${currentUser.uid}/notes`, noteData.id.toString()), {
                ...noteData,
                createdAt: serverTimestamp()
            });
        } else {
            setLocalNotes(prev => {
                const exists = prev.some(n => n.id === noteData.id);
                if (exists) return prev;
                return [noteData, ...prev];
            });
        }
    };

    const updateNote = async (id, data) => {
        if (currentUser) {
            await updateDoc(doc(db, `users/${currentUser.uid}/notes`, id.toString()), data);
        } else {
            setLocalNotes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
        }
    };

    const deleteNote = async (id) => {
        if (currentUser) {
            await deleteDoc(doc(db, `users/${currentUser.uid}/notes`, id.toString()));
        } else {
            setLocalNotes(prev => prev.filter(n => n.id !== id));
        }
    };

    const incrementStudyTime = async (seconds = 1) => {
        if (currentUser) {
            const userRef = doc(db, 'users', currentUser.uid);
            await setDoc(userRef, {
                totalStudyTime: (cloudStudyTime || 0) + seconds,
                last_activity: serverTimestamp()
            }, { merge: true });
        } else {
            setLocalStudyTime(prev => (prev || 0) + seconds);
        }
    };

    const createFolder = async (name, color = '#3b82f6') => {
        if (currentUser) {
            const id = Date.now().toString();
            await setDoc(doc(db, `users/${currentUser.uid}/folders`, id), { name, color });
            setCloudActiveFolder(id);
            setCloudActiveFile(null);
        } else {
            const newFolder = { id: Date.now().toString(), name, color };
            setLocalFolders(prev => [...prev, newFolder]);
            setLocalActiveFolder(newFolder.id);
            setLocalActiveFile(null);
        }
    };

    const updateFolder = async (id, data) => {
        if (currentUser) {
            await updateDoc(doc(db, `users/${currentUser.uid}/folders`, id.toString()), data);
        } else {
            setLocalFolders(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
        }
    };

    const createFile = async (folderId, name, color = '#3b82f6') => {
        if (currentUser) {
            const id = Date.now().toString();
            await setDoc(doc(db, `users/${currentUser.uid}/files`, id), { folderId, name, color, createdAt: serverTimestamp() });
            setCloudActiveFile(id);
        } else {
            const newFile = { id: Date.now().toString(), folderId, name, color, createdAt: Date.now() };
            setLocalFiles(prev => [...prev, newFile]);
            setLocalActiveFile(newFile.id);
        }
    };

    const updateFile = async (id, data) => {
        if (currentUser) {
            await updateDoc(doc(db, `users/${currentUser.uid}/files`, id.toString()), data);
        } else {
            setLocalFiles(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
        }
    };

    const deleteFile = async (fileId) => {
        if (currentUser) {
            await deleteDoc(doc(db, `users/${currentUser.uid}/files`, fileId.toString()));
            if (cloudActiveFile === fileId) setCloudActiveFile(null);
        } else {
            setLocalFiles(prev => prev.filter(f => f.id !== fileId));
            if (localActiveFile === fileId) setLocalActiveFile(null);
        }
    }

    const setActiveFolderId = async (id) => {
        if (currentUser) {
            setCloudActiveFolder(id);
            setCloudActiveFile(null);
            // Persist to Cloud
            await updateDoc(doc(db, 'users', currentUser.uid), {
                activeFolderId: id,
                activeFileId: null
            }).catch(err => console.error("Failed to sync active folder", err));
        }
        else {
            setLocalActiveFolder(id);
            setLocalActiveFile(null);
        }
    };

    const setActiveFileId = async (id) => {
        if (currentUser) {
            setCloudActiveFile(id);
            // Persist to Cloud
            await updateDoc(doc(db, 'users', currentUser.uid), {
                activeFileId: id
            }).catch(err => console.error("Failed to sync active file", err));
        }
        else setLocalActiveFile(id);
    };

    const removeNoteImage = async (id) => {
        if (currentUser) {
            await updateDoc(doc(db, `users/${currentUser.uid}/notes`, id.toString()), { thumbnail: null });
        } else {
            setLocalNotes(prev => prev.map(n => n.id === id ? { ...n, thumbnail: null } : n));
        }
    }

    const deleteLocalNote = (id) => {
        setLocalNotes(prev => prev.filter(n => n.id !== id));
    };

    const deleteLocalFolder = (id) => {
        setLocalFolders(prev => prev.filter(f => f.id !== id));
    };

    const deleteLocalFile = (id) => {
        setLocalFiles(prev => prev.filter(f => f.id !== id));
    };

    return {
        notes: currentUser ? cloudNotes : localNotes,
        localNotes,
        folders: currentUser ? cloudFolders : localFolders,
        localFolders, // Exposed for syncing
        files: currentUser ? cloudFiles : localFiles,
        localFiles, // Exposed for syncing
        activeFolderId: currentUser ? cloudActiveFolder : localActiveFolder,
        activeFileId: currentUser ? cloudActiveFile : localActiveFile,
        addNote,
        updateNote,
        deleteNote,
        deleteLocalNote,
        createFolder,
        updateFolder,
        deleteLocalFolder, // Exposed for syncing
        createFile,
        updateFile,
        deleteFile,
        deleteLocalFile, // Exposed for syncing
        setActiveFolderId,
        setActiveFileId,
        removeNoteImage,
        incrementStudyTime,
        studyTime: currentUser ? cloudStudyTime : localStudyTime,
        loading,
        isCloud: !!currentUser
    };
}
