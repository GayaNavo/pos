/*
 * Silent Print Utility (Simple Request Bridge)
 * Uses a 'Simple Request' (POST with application/x-www-form-urlencoded) to bypass
 * CORS Preflight (OPTIONS) checks and trigger the less restrictive PNA policy.
 * This ensures data reaches the local agent from a secure VPS deployment.
 */

export const silentPrint = async (url, html) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    try {
        // Constructing a Simple Request (no preflight triggered)
        const params = new URLSearchParams();
        params.append('html', html);

        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors', // We keep CORS to detect real network failure
            headers: {
                // This content-type is a "simple" content-type
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Even if we have a CORS error in reading the response, 
        // the request likely reached the agent.
        // However, a connection-refused will throw an error.
        if (response.type === 'opaque' || response.ok || response.status === 200) {
            return { success: true };
        } else {
            throw new Error(`Agent error: ${response.status}`);
        }
    } catch (error) {
        clearTimeout(timeoutId);
        
        // Check for specific network failure vs timeout
        if (error.name === 'AbortError') {
            console.warn("Silent Print: Agent timed out or PNA blocked (Timed out)");
        } else {
            console.warn("Silent Print: Network error (Agent down or blocked)");
        }
        
        throw error; // Reject to trigger fallback
    }
};
