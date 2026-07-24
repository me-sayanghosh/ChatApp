import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Message } from '../models/Message.js';
import { Room } from '../models/Room.js';

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

router.post('/:roomId/summarize', requireAuth, async (req, res) => {
  try {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

    const room = await Room.findById(req.params.roomId);
    if (!room) throw new Error('room not found');
    if (!room.members.some((m) => m.user.toString() === req.user.id)) throw new Error('not a member');

    const messages = await Message.find({ room: room.id, deleted: false, parentMessage: null })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('sender', 'username');

    const chatLog = messages.reverse().map(
      (m) => `${m.sender?.username || 'unknown'}: ${m.text}`
    ).join('\n');

    const prompt = `Summarize the following chat conversation concisely. Highlight key topics, decisions, and action items. Be brief (under 200 words).\n\nChat log:\n${chatLog || '(empty chat)'}`;

    const response = await fetch(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Gemini API error');

    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary available.';
    res.json({ summary });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:roomId/suggest', requireAuth, async (req, res) => {
  try {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

    const { message } = req.body;
    if (!message) throw new Error('message required');

    const room = await Room.findById(req.params.roomId);
    if (!room) throw new Error('room not found');
    if (!room.members.some((m) => m.user.toString() === req.user.id)) throw new Error('not a member');

    const recent = await Message.find({ room: room.id, deleted: false, parentMessage: null })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username');

    const context = recent.reverse().map(
      (m) => `${m.sender?.username || 'unknown'}: ${m.text}`
    ).join('\n');

    const prompt = `You are an AI assistant inside a group chat. Given the recent conversation context and the user's incomplete message, suggest 3 short completion options (each under 30 words). Return ONLY a JSON array of 3 strings, nothing else.\n\nRecent context:\n${context}\n\nUser's message: ${message}`;

    const response = await fetch(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Gemini API error');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const suggestions = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    res.json({ suggestions });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
