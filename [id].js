import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({ error: 'Missing digest ID' });
        }
        
        // Get digest content
        const contentStr = await kv.get(`digest:${id}:content`);
        
        if (!contentStr) {
            return res.status(404).json({ error: 'Digest not found' });
        }
        
        // Get metadata
        const meta = await kv.hgetall(`digest:${id}:meta`) || {};
        
        const content = typeof contentStr === 'string' 
            ? JSON.parse(contentStr) 
            : contentStr;
        
        return res.status(200).json({
            id,
            date: meta.date || id,
            title: meta.title || `AI Bites - ${id}`,
            content
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
