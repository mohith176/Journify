import { expect } from 'chai';
import sinon from 'sinon';
import { 
  sendMessage, 
  endChat, 
  deleteJournalEntry, 
  getTodaySummary,
  processLongFormJournal,
  cleanupSessions
} from '../../controllers/chat.controller.js';
import models from '../../models/user.model.js';
import { ChatOpenAI } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import jwt from 'jsonwebtoken';

describe('Chat Controller Tests', () => {
  let req, res, next;
  let llmStub, vectorStoreStub, pineconeStub;

  beforeEach(() => {
    // Reset request and response objects before each test
    req = {
      body: {},
      params: {},
      headers: {
        authorization: 'Bearer fake-token'
      }
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    next = sinon.spy();
    
    // Stub JWT verify
    sinon.stub(jwt, 'verify').returns({ userId: 'test-user-id' });
    
    // Stub the LLM
    llmStub = sinon.stub(ChatOpenAI.prototype, 'invoke').resolves({
      content: 'This is a test response from the LLM.'
    });
    
    // Stub models
    sinon.stub(models.JournalEntry.prototype, 'save').resolves({
      _id: 'test-journal-id',
      title: 'Test Journal Entry',
      content: 'Test content',
      user: 'test-user-id',
      moods: ['happy', 'reflective'],
      createdAt: new Date()
    });
    
    sinon.stub(models.SentimentAnalysis.prototype, 'save').resolves({
      _id: 'test-analysis-id',
      emotions: ['happy', 'reflective'],
      summary: 'Test summary',
      insights: ['Test insight 1', 'Test insight 2'],
      themes: ['personal growth', 'relationships']
    });

    // Stub Pinecone related functionality
    vectorStoreStub = {
      addDocuments: sinon.stub().resolves(),
      similaritySearch: sinon.stub().resolves([{
        pageContent: 'This is a previous conversation',
        metadata: {
          timestamp: new Date().toISOString(),
          userId: 'test-user-id'
        }
      }])
    };
    
    sinon.stub(PineconeStore, 'fromExistingIndex').resolves(vectorStoreStub);
  });

  afterEach(() => {
    // Restore all stubs after each test
    sinon.restore();
  });

  describe('sendMessage', () => {
    it('should return 400 if userId or message is missing', async () => {
      // Test with missing userId
      req.body = { message: 'Test message' };
      await sendMessage(req, res);
      expect(res.status.calledWith(400)).to.be.true;
      
      // Reset
      res.status.resetHistory();
      
      // Test with missing message
      req.body = { userId: 'test-user-id' };
      await sendMessage(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should process a message and return AI response', async () => {
      req.body = {
        userId: 'test-user-id',
        message: 'Hello, this is a test message'
      };
      
      await sendMessage(req, res);
      
      expect(res.json.called).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property('message');
      expect(response).to.have.property('messageId');
    });

    it('should handle prompt context if provided', async () => {
      req.body = {
        userId: 'test-user-id',
        message: 'My response to the prompt',
        promptContext: 'How did you feel about yesterday?'
      };
      
      await sendMessage(req, res);
      
      expect(res.json.called).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property('message');
    });
  });

  describe('endChat', () => {
    beforeEach(() => {
      // Additional setup for endChat tests
      sinon.stub(models.DailySummary, 'findOne').resolves(null);
      sinon.stub(models.DailySummary.prototype, 'save').resolves({});
      sinon.stub(models.JournalEntry, 'find').resolves([]);
    });

    it('should return 400 if userId is missing', async () => {
      req.body = {};
      await endChat(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should process and save a chat session', async () => {
      // Setup global activeSessions with test data
      global.activeSessions = {
        'test-user-id': {
          history: [
            { role: 'user', content: 'Test message 1' },
            { role: 'assistant', content: 'Test response 1' },
            { role: 'user', content: 'Test message 2' },
            { role: 'assistant', content: 'Test response 2' }
          ]
        }
      };
      
      req.body = {
        userId: 'test-user-id',
        title: 'Test Journal',
        mood: 'Happy'
      };
      
      await endChat(req, res);
      
      expect(res.json.called).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property('success', true);
      expect(response).to.have.property('journalId');
      expect(response).to.have.property('analysis');
    });
  });

  describe('processLongFormJournal', () => {
    it('should return 400 if userId or content is missing', async () => {
      // Test with missing userId
      req.body = { content: 'Test long form content' };
      await processLongFormJournal(req, res);
      expect(res.status.calledWith(400)).to.be.true;
      
      // Reset
      res.status.resetHistory();
      
      // Test with missing content
      req.body = { userId: 'test-user-id' };
      await processLongFormJournal(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should process a long form journal entry', async () => {
      req.body = {
        userId: 'test-user-id',
        content: 'This is a test long form journal entry. It contains multiple sentences to analyze. I feel happy today but also a bit reflective about my past.',
        title: 'My Test Journal'
      };
      
      await processLongFormJournal(req, res);
      
      expect(res.json.called).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property('success', true);
      expect(response).to.have.property('journalId');
      expect(response).to.have.property('analysis');
      expect(response).to.have.property('sentimentScores');
    });

    it('should generate a title if none is provided', async () => {
      req.body = {
        userId: 'test-user-id',
        content: 'This is a test long form journal entry without a title.'
      };
      
      await processLongFormJournal(req, res);
      
      expect(res.json.called).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property('title');
    });
  });

  describe('deleteJournalEntry', () => {
    beforeEach(() => {
      sinon.stub(models.JournalEntry, 'findOneAndDelete').resolves({
        _id: 'test-journal-id',
        title: 'Deleted Entry'
      });
    });

    it('should return 400 if entry ID is missing', async () => {
      req.params = {};
      await deleteJournalEntry(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should delete a journal entry successfully', async () => {
      req.params = { id: 'test-journal-id' };
      
      await deleteJournalEntry(req, res);
      
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.called).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property('success', true);
    });
  });

  describe('getTodaySummary', () => {
    beforeEach(() => {
      // Setup for today's summary tests
      sinon.stub(models.DailySummary, 'findOne').resolves({
        _id: 'test-summary-id',
        user: 'test-user-id',
        date: new Date(),
        entryCount: 2,
        overview: 'Test overview',
        mood: ['happy', 'productive'],
        highlights: ['Completed a project', 'Had a good conversation'],
        concerns: ['Deadline approaching'],
        patterns: 'Test patterns',
        reflection: 'Test reflection',
        rawSummary: 'Full raw summary text',
        generatedAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      });
      
      sinon.stub(models.JournalEntry, 'find').resolves([
        {
          _id: 'entry-1',
          title: 'Morning Entry',
          content: 'This is my morning journal',
          moods: ['sleepy', 'hopeful'],
          createdAt: new Date()
        },
        {
          _id: 'entry-2',
          title: 'Evening Entry',
          content: 'This is my evening journal',
          moods: ['tired', 'satisfied'],
          createdAt: new Date()
        }
      ]);
    });

    it('should return 400 if userId is missing', async () => {
      req.params = {};
      await getTodaySummary(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should return existing summary if recent', async () => {
      req.params = { userId: 'test-user-id' };
      
      await getTodaySummary(req, res);
      
      expect(res.json.called).to.be.true;
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property('fromCache', true);
      expect(response).to.have.property('summary');
    });
  });

  describe('cleanupSessions', () => {
    it('should remove inactive sessions', () => {
      // Setup sessions with different activity times
      global.activeSessions = {
        'recent-user': {
          lastActivity: Date.now() - 10 * 60 * 1000  // 10 minutes ago
        },
        'old-user': {
          lastActivity: Date.now() - 40 * 60 * 1000  // 40 minutes ago
        }
      };
      
      cleanupSessions();
      
      // Should keep recent session and remove old one
      expect(global.activeSessions).to.have.property('recent-user');
      expect(global.activeSessions).to.not.have.property('old-user');
    });
  });
});