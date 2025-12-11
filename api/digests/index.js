import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Verify authorization
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.API_SECRET_TOKEN;
    
    if (req.method === 'POST' && expectedToken) {
        if (authHeader !== `Bearer ${expectedToken}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    
    try {
        if (req.method === 'POST') {
            const id = new Date().toISOString().split('T')[0];
            
            const content = req.body;
            
            if (!content || Object.keys(content).length === 0) {
                return res.status(400).json({ error: 'Missing content' });
            }
            
            // Store the content
            await kv.set(`digest:${id}:content`, JSON.stringify(content));
            
            // Store metadata
            await kv.hset(`digest:${id}:meta`, {
                date: id,
                title: `AI Bites - ${id}`,
                createdAt: new Date().toISOString()
            });
            
            // Add to index
            await kv.zadd('digests:index', {
                score: Date.now(),
                member: id
            });
            
            console.log(`Digest created: ${id}`);
            
            return res.status(201).json({ 
                success: true, 
                id,
                languages: Object.keys(content)
            });
        }
        
        if (req.method === 'GET') {
            const digestIds = await kv.zrange('digests:index', 0, -1, { rev: true });
            
            // Return as array of objects with id property for the frontend
            const digests = digestIds.map(id => ({ id, date: id }));
            
            return res.status(200).json(digests);
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
