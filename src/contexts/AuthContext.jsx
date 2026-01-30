import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sign up with Email/Password
    async function signup(email, password) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Send verification email
        await sendEmailVerification(result.user);
        return result;
    }

    // Login with Email/Password
    async function login(email, password) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result;
    }

    // Logout
    function logout() {
        return signOut(auth);
    }

    // Reset Password
    async function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    // Resend verification email
    async function resendVerificationEmail() {
        if (currentUser && !currentUser.emailVerified) {
            await sendEmailVerification(currentUser);
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        signup,
        login,
        logout,
        resetPassword,
        resendVerificationEmail,
        isEmailVerified: currentUser?.emailVerified || false
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
