/**
 * LectureSnap Auto-Capture Engine
 * Handles Edge Density Analysis and Perceptual Hashing (dHash)
 */

/**
 * Calculates a 64-bit Difference Hash (dHash) for a canvas
 * 1. Resizes to 9x8
 * 2. Grayscale
 * 3. Compares neighbor pixels
 */
export function generateDHash(canvas) {
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = 9;
    resizedCanvas.height = 8;
    const ctx = resizedCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, 9, 8);

    const imageData = ctx.getImageData(0, 0, 9, 8).data;
    const gray = [];
    for (let i = 0; i < imageData.length; i += 4) {
        // Simple grayscale (R+G+B)/3
        gray.push((imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3);
    }

    let hash = "";
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const left = gray[row * 9 + col];
            const right = gray[row * 9 + col + 1];
            hash += left > right ? "1" : "0";
        }
    }
    return hash;
}

/**
 * Calculates Hamming Distance between two 64-bit bitstrings
 */
export function compareHashes(hash1, hash2) {
    if (!hash1 || !hash2) return 64;
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
}

/**
 * Analyzes Edge Density to detect "Blank Boards"
 * Focuses on the middle 80% to ignore UI/Frames
 */
export function checkEdgeDensity(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Analyze middle 80%
    const marginW = Math.floor(w * 0.1);
    const marginH = Math.floor(h * 0.1);
    const scanW = w - (marginW * 2);
    const scanH = h - (marginH * 2);

    const imageData = ctx.getImageData(marginW, marginH, scanW, scanH).data;
    let edgePixels = 0;
    const threshold = 30; // Min difference to be considered an "edge"

    // Scan every few pixels for performance
    const step = 2;
    for (let y = 0; y < scanH - 1; y += step) {
        for (let x = 0; x < scanW - 1; x += step) {
            const idx = (y * scanW + x) * 4;
            const nextIdx = idx + 4;
            const downIdx = idx + (scanW * 4);

            const val = (imageData[idx] + imageData[idx + 1] + imageData[idx + 2]) / 3;
            const nextVal = (imageData[nextIdx] + imageData[nextIdx + 1] + imageData[nextIdx + 2]) / 3;
            const downVal = (imageData[downIdx] + imageData[downIdx + 1] + imageData[downIdx + 2]) / 3;

            // Basic Sobel-ish intensity check
            const diff = Math.abs(val - nextVal) + Math.abs(val - downVal);
            if (diff > threshold) {
                edgePixels++;
            }
        }
    }

    const totalSamples = (scanW / step) * (scanH / step);
    const density = edgePixels / totalSamples;

    return {
        density,
        isBlank: density < 0.0005 // 0.05% threshold
    };
}
