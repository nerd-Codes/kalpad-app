// src/lib/vertexEmbedding.js

// We will NOT import from '@google-cloud/aiplatform' here.

// --- AUTH SETUP ---
const getClientOptions = () => {
    const options = {
        apiEndpoint: 'us-central1-aiplatform.googleapis.com',
    };
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        options.credentials = {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
    }
    return options;
};

export async function generateEmbeddings(texts, taskType = 'RETRIEVAL_DOCUMENT') {
    // --- DYNAMIC REQUIRE (The Fix) ---
    // This forces Node to load the module using CommonJS resolution.
    const aiplatform = require('@google-cloud/aiplatform');
    const { PredictionServiceClient } = aiplatform.v1;
    const { helpers } = aiplatform; // This will now be defined.

    const project = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!project) throw new Error("GOOGLE_CLOUD_PROJECT_ID is not set in .env");

    const location = 'us-central1';
    const model = 'gemini-embedding-001';

    const client = new PredictionServiceClient(getClientOptions());
    const endpoint = `projects/${project}/locations/${location}/publishers/google/models/${model}`;

    const instances = texts.map(text => 
        helpers.toValue({
            content: text,
            task_type: taskType
        })
    );

    const parameters = helpers.toValue({
        outputDimensionality: 768
    });

    // NOTE from docs: gemini-embedding-001 takes one input at a time.
    // The batching must happen at the client level.
    const allEmbeddings = [];
    for (const instance of instances) {
        const request = {
            endpoint,
            instances: [instance], // Send one at a time
            parameters
        };

        const [response] = await client.predict(request);
        const predictions = response.predictions || [];
        
        const embeddings = predictions.map(p => {
            const embeddingsProto = p.structValue.fields.embeddings;
            const valuesProto = embeddingsProto.structValue.fields.values;
            return valuesProto.listValue.values.map(v => v.numberValue);
        });

        if (embeddings.length > 0) {
            allEmbeddings.push(embeddings[0]);
        }
    }
    
    return allEmbeddings;
}