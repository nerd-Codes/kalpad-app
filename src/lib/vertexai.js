// /src/lib/vertexai.js

import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

// --- DEFINITIVE FIX: Use a singleton pattern for an asynchronously initialized client ---

let vertexAIClientInstance = null;

/**
 * Initializes the Vertex AI client by programmatically creating a credentials file.
 * This is the robust, industry-standard way to handle auth in a serverless environment.
 * It writes the key to the /tmp directory, the only writable location in a Vercel function.
 * @returns {Promise<VertexAI>} A promise that resolves to the initialized VertexAI client.
 */
const initializeVertexAI = async () => {
    // If the client is already initialized, return it immediately.
    if (vertexAIClientInstance) {
        return vertexAIClientInstance;
    }

    if (!process.env.GOOGLE_VERTEX_SERVICE_ACCOUNT_KEY_BASE64) {
        throw new Error("[Authentication Error] GOOGLE_VERTEX_SERVICE_ACCOUNT_KEY_BASE64 is not set.");
    }

    try {
        // Decode the Base64 key back into a JSON string.
        const serviceAccountJson = Buffer.from(process.env.GOOGLE_VERTEX_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8');
        
        // Define a temporary path in the serverless function's writable directory.
        const tempCredentialsPath = path.join(os.tmpdir(), 'gcp-creds.json');
        
        // Write the credentials to the temporary file.
        await fs.writeFile(tempCredentialsPath, serviceAccountJson);

        // **THIS IS THE CRITICAL STEP:**
        // Set the environment variable that all Google Cloud SDKs automatically look for.
        process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCredentialsPath;

        // Now, initialize the client. It will automatically find and use the file we just created.
        // We no longer need to pass the 'credentials' object in the constructor.
        vertexAIClientInstance = new VertexAI({
            project: process.env.GOOGLE_CLOUD_PROJECT_ID,
            location: process.env.GOOGLE_CLOUD_LOCATION,
        });
        
        console.log("Vertex AI Client initialized successfully via temporary credentials file.");
        return vertexAIClientInstance;

    } catch (error) {
        console.error("CRITICAL: Failed to initialize Vertex AI Client:", error);
        throw new Error(`[Authentication Error] Could not create credentials file: ${error.message}`);
    }
};

/**
 * Asynchronously retrieves a generative model instance from the initialized Vertex AI client.
 * @param {string} modelName - The name of the model to retrieve (e.g., 'gemini-1.5-flash-001').
 * @param {object} [generationConfig] - Optional generation configuration.
 * @returns {Promise<object>} A promise that resolves to the generative model instance.
 */
export async function getVertexAIModel(modelName, generationConfig = {}) {
    const vertex_ai = await initializeVertexAI();
    return vertex_ai.getGenerativeModel({
        model: modelName,
        generationConfig,
    });
}

/**
 * Asynchronously retrieves the text embedding model instance from the initialized Vertex AI client.
 * NOTE: This function is not currently used due to the strategic fallback, but is architecturally correct for future use.
 * @returns {Promise<object>} A promise that resolves to the text embedding model instance.
 */
export async function getVertexAIEmbeddingModel() {
    const vertex_ai = await initializeVertexAI();
    return vertex_ai.getGenerativeModel({ model: 'text-embedding-004' });
}