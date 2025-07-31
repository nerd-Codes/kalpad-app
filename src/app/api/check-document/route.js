// src/app/api/check-document/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    console.log("--- CHECK-DOCUMENT API (FINAL VERSION) INITIATED ---");
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { file_name, page_count } = await request.json();
    console.log(`Received check for file: "${file_name}" with expected page count: ${page_count}`);
    if (!file_name || page_count === undefined) {
        return new Response(JSON.stringify({ error: 'File name and page count are required.' }), { status: 400 });
    }

    // --- THIS IS THE DEFINITIVE FIX: Count items inside the folder ---
    const folderPath = `${session.user.id}/${file_name}`;
    console.log(`Querying Supabase Storage for item count in folder: "${folderPath}"`);

    // We list all files in the folder to get an accurate count.
    // Supabase's list() has a default limit, so we set it high to be safe.
    const { data: fileList, error: listError } = await supabase
        .storage
        .from('study-materials')
        .list(folderPath, {
            limit: 1000, // A safe high limit, can be increased if you expect >1000 page PDFs
        });

    if (listError) {
        console.log(`Storage list command returned an error (likely folder not found). Treating as new.`);
        console.log("--- CHECK-DOCUMENT API FINISHED: Returning 'new' ---");
        return new Response(JSON.stringify({ status: 'new' }), { status: 200 });
    }

    const storageFileCount = fileList.length;
    console.log(`STORAGE RESPONSE: Found ${storageFileCount} item(s) in the folder.`);
    
    // --- Now, we compare the count of files in storage to the page count of the new PDF ---
    if (storageFileCount === page_count) {
        console.log("LOGIC: Storage file count matches expected page count. Document exists.");
        console.log("--- CHECK-DOCUMENT API FINISHED: Returning 'exists' ---");
        return new Response(JSON.stringify({ status: 'exists' }), { status: 200 });
    }

    console.log(`LOGIC: Page count does not match (File: ${page_count}, Storage: ${storageFileCount}). Document is new or has changed.`);
    console.log("--- CHECK-DOCUMENT API FINISHED: Returning 'new' ---");
    return new Response(JSON.stringify({ status: 'new' }), { status: 200 });

  } catch (error) {
    console.error('--- CRITICAL ERROR in check-document API ---:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}