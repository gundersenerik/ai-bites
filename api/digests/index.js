import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        if (req.method === 'GET') {
            // Get list of all digests (sorted by date, newest first)
            const digestIds = await kv.lrange('digest:index', 0, -1) || [];
            
            const digests = await Promise.all(
                digestIds.map(async (id) => {
                    const meta = await kv.hgetall(`digest:${id}:meta`);
                    return {
                        id,
                        date: meta?.date || id,
                        title: meta?.title || `Digest ${id}`
                    };
                })
            );
            
            return res.status(200).json(digests);
            
        } else if (req.method === 'POST') {
            // Create a new digest
            const authHeader = req.headers.authorization;
            const apiKey = process.env.API_KEY;
            
            if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            const { date, content } = req.body;
            
            if (!date || !content) {
                return res.status(400).json({ error: 'Missing date or content' });
            }
            
            const id = date; // Use date as ID (e.g., "2025-01-13")
            
            // Store the digest content
            await kv.set(`digest:${id}:content`, JSON.stringify(content));
            
            // Store metadata
            await kv.hset(`digest:${id}:meta`, {
                date: date,
                title: `AI Bites - ${date}`,
                createdAt: new Date().toISOString()
            });
            
            // Add to index (at the beginning for newest-first ordering)
            // First remove if exists (to handle updates)
            await kv.lrem('digest:index', 0, id);
            // Then add to the beginning
            await kv.lpush('digest:index', id);
            
            return res.status(201).json({ 
                success: true, 
                id,
                message: `Digest ${id} created/updated successfully`
            });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
