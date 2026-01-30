import { doc, getDoc, updateDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * CREDIT SYSTEM LOGIC
 * Manages user credits for AI generation features.
 */

export const CREDIT_COSTS = {
    GENERATE_STUDY_GUIDE: 1,
    ASK_TUTOR: 1,
    EXPORT_PDF: 1,
    AUTO_CAPTURE: 1,
};

export const CREDIT_REWARDS = {
    WATCH_AD: 3,
};

/**
 * Checks if the user has enough credits and deducts one if true.
 * @param {string} userId 
 * @param {number} cost 
 * @returns {Promise<boolean>} true if successful, false if insufficient credits
 */
export const consumeCredit = async (userId, cost = 1) => {
    if (!userId) return false;

    const userRef = doc(db, 'users', userId);

    try {
        const userSnap = await getDoc(userRef);

        // Auto-initialize new users with 10 welcome credits
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                credits_remaining: 10,
                lifetime_earned_credits: 10,
                last_activity: serverTimestamp()
            });
            // Recursively call to proceed with consumption
            return consumeCredit(userId, cost);
        }

        const userData = userSnap.data();
        const currentCredits = userData.credits_remaining || 0;

        if (currentCredits >= cost) {
            await updateDoc(userRef, {
                credits_remaining: increment(-cost),
                last_activity: serverTimestamp()
            });
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error("Error consuming credit:", error);
        return false;
    }
};

/**
 * Rewards the user with credits (e.g. for watching an ad).
 * @param {string} userId 
 * @param {number} amount 
 */
export const rewardUserCredits = async (userId, amount = 3) => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    try {
        await setDoc(userRef, {
            credits_remaining: increment(amount),
            lifetime_earned_credits: increment(amount),
            last_activity: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Error rewarding credits:", error);
    }
};

/**
 * NOTE: The 'Midnight Reset' logic (Step 4) is implemented as a 
 * Firebase Cloud Function (scheduled trigger) on the backend, 
 * not in this client-side file.
 * 
 * Logic Reminder:
 * exports.resetDailyCredits = onSchedule("every day 00:00", async (event) => {
 *   // Query all users with credits < 1
 *   // Batch update to 1
 * });
 */
