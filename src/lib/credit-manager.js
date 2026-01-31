import { db } from './firebase';
import { doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';

export const CREDIT_COSTS = {
    AI_SUMMARY: 1,
    AI_CHAT: 1,
    PDF_EXPORT: 2
};

/**
 * Rewards the user with credits.
 * @param {string} userId
 * @param {number} amount
 */
export async function rewardUserCredits(userId, amount = 1) {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);

    try {
        // Try increment first
        await updateDoc(userRef, {
            credits: increment(amount),
            totalCreditsEarned: increment(amount)
        });
    } catch (error) {
        // If document doesn't exist, create it (rare fallback)
        if (error.code === 'not-found') {
            await setDoc(userRef, {
                credits: amount,
                totalCreditsEarned: amount,
                createdAt: new Date()
            }, { merge: true });
        } else {
            console.error("Credit reward failed:", error);
        }
    }
}

/**
 * Consumes user credits.
 * @param {string} userId
 * @param {number} amount
 * @returns {Promise<boolean>} success
 */
export async function consumeUserCredits(userId, amount = 1) {
    if (!userId) return false;
    const userRef = doc(db, 'users', userId);

    // Transaction usually better, but for simplicity assuming we check first
    try {
        const snap = await getDoc(userRef);
        const current = snap.data()?.credits || 0;

        if (current >= amount) {
            await updateDoc(userRef, {
                credits: increment(-amount)
            });
            return true;
        }
        return false;
    } catch (e) {
        console.error(e);
        return false;
    }
}
