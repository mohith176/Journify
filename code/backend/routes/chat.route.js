
import express from 'express';
import { sendMessage, endChat, getTodaySummary,clearAllUserEntries,deleteJournalEntry,processLongFormJournal } from '../controllers/chat.controller.js';
import { getJournalingPrompts, markPromptAsUsed,getAllUserPrompts } from '../controllers/prompts.controller.js';
const router = express.Router();

// Send a message to the AI and get a response
router.post('/send', sendMessage);

// End a chat session and save to database
router.post('/end', endChat);

// router.delete('/clear',deleteAllJournalEntriesForUser );
router.delete('/clear', clearAllUserEntries);
router.delete('/del/:id', deleteJournalEntry);

// Get today's summary for a user
router.get('/summary/:userId/today', getTodaySummary);
router.get('/prompts/:userId', getJournalingPrompts);
router.put('/prompts/:promptId/use', markPromptAsUsed);
router.get('/prompts/:userId/all', getAllUserPrompts); // Admin/debugging route
router.post('/longform', processLongFormJournal);
export default router;

