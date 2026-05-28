/**
 * Interview preparation route.
 * Handles interview question answering for DSA, System Design, and Production topics.
 * Uses AI to generate detailed answers with examples.
 */
const express = require('express');
const router = express.Router();
const { chatCompletion } = require('../services/openai');

// Interview question answering prompt
const INTERVIEW_PROMPT = `You are an expert interview coach for CodeVision AI. The user is preparing for a technical interview.

Category: {category}
Topic: {topic}
Question: {question}
Difficulty: {difficulty}

Provide a comprehensive, structured answer that would impress an interviewer.

Respond in JSON format:
{
  "answer": "Clear, well-structured answer to the question",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "example": "A concrete example or code snippet demonstrating the concept",
  "howToAchieve": "Step-by-step approach to implement or achieve this",
  "commonMistakes": ["mistake 1 to avoid", "mistake 2 to avoid"],
  "followUpQuestions": ["likely follow-up question 1", "likely follow-up question 2"],
  "interviewTip": "A tip for answering this type of question in interviews"
}`;

// Predefined interview questions organized by category and topic
const INTERVIEW_QUESTIONS = {
  dsa: {
    label: 'Data Structures & Algorithms',
    topics: {
      arrays: {
        label: 'Arrays & Strings',
        questions: [
          'What is the difference between an array and a linked list?',
          'How do you find duplicates in an array?',
          'Explain the two-pointer technique with an example.',
          'How does sliding window technique work?',
          'What is the time complexity of common array operations?',
        ],
      },
      trees: {
        label: 'Trees & Graphs',
        questions: [
          'What is the difference between BFS and DFS?',
          'Explain different types of binary tree traversals.',
          'What is a balanced binary tree and why does it matter?',
          'How do you detect a cycle in a graph?',
          'What is a trie and when would you use it?',
        ],
      },
      sorting: {
        label: 'Sorting & Searching',
        questions: [
          'Compare QuickSort vs MergeSort — when to use which?',
          'Explain binary search and its variations.',
          'What is the best sorting algorithm for nearly sorted data?',
          'How does heap sort work?',
          'What is the lower bound for comparison-based sorting?',
        ],
      },
      dp: {
        label: 'Dynamic Programming',
        questions: [
          'What is dynamic programming and when should you use it?',
          'Explain memoization vs tabulation.',
          'How do you identify if a problem can be solved with DP?',
          'Walk through the knapsack problem.',
          'What is the difference between top-down and bottom-up approaches?',
        ],
      },
      stacks: {
        label: 'Stacks & Queues',
        questions: [
          'How do you implement a stack using queues?',
          'What are monotonic stacks and their applications?',
          'Explain the next greater element problem.',
          'How does a priority queue work internally?',
          'What is a deque and when is it useful?',
        ],
      },
    },
  },
  system_design: {
    label: 'System Design',
    topics: {
      fundamentals: {
        label: 'Fundamentals',
        questions: [
          'What is horizontal vs vertical scaling?',
          'Explain CAP theorem with real-world examples.',
          'What is a load balancer and how does it work?',
          'Explain the difference between SQL and NoSQL databases.',
          'What is database sharding and when should you use it?',
        ],
      },
      architecture: {
        label: 'Architecture Patterns',
        questions: [
          'Explain microservices vs monolithic architecture.',
          'What is event-driven architecture?',
          'How does a message queue improve system reliability?',
          'What is CQRS and when should you use it?',
          'Explain the circuit breaker pattern.',
        ],
      },
      caching: {
        label: 'Caching & Performance',
        questions: [
          'How does a CDN work and when should you use one?',
          'Explain cache invalidation strategies.',
          'What is Redis and how is it used in production?',
          'How do you handle cache stampede?',
          'What is write-through vs write-back caching?',
        ],
      },
      real_systems: {
        label: 'Design Real Systems',
        questions: [
          'How would you design a URL shortener?',
          'Design a chat messaging system like WhatsApp.',
          'How would you design a rate limiter?',
          'Design a notification system.',
          'How would you design a social media feed?',
        ],
      },
    },
  },
  production: {
    label: 'Production & DevOps',
    topics: {
      deployment: {
        label: 'Deployment & CI/CD',
        questions: [
          'What is blue-green deployment?',
          'Explain CI/CD pipeline best practices.',
          'What is canary deployment and when to use it?',
          'How do you handle database migrations in production?',
          'What is infrastructure as code?',
        ],
      },
      monitoring: {
        label: 'Monitoring & Observability',
        questions: [
          'What metrics should you monitor in production?',
          'Explain the difference between logs, metrics, and traces.',
          'How do you set up alerting without alert fatigue?',
          'What is distributed tracing?',
          'How do you debug production issues?',
        ],
      },
      security: {
        label: 'Security',
        questions: [
          'How do you prevent SQL injection?',
          'Explain OAuth 2.0 flow.',
          'What is CORS and why is it important?',
          'How do you handle secrets in production?',
          'What is the principle of least privilege?',
        ],
      },
      reliability: {
        label: 'Reliability & Scaling',
        questions: [
          'How do you handle a service outage?',
          'What is an SLA/SLO/SLI?',
          'How do you do capacity planning?',
          'Explain chaos engineering.',
          'What is graceful degradation?',
        ],
      },
    },
  },
};

// GET — return all interview questions organized by category
router.get('/questions', (req, res) => {
  res.json(INTERVIEW_QUESTIONS);
});

// POST — answer an interview question with AI
router.post('/answer', async (req, res) => {
  try {
    const { category, topic, question, difficulty } = req.body;

    if (!question || !category) {
      return res.status(400).json({ error: 'Question and category are required' });
    }

    const prompt = INTERVIEW_PROMPT
      .replace('{category}', category || 'General')
      .replace('{topic}', topic || 'General')
      .replace('{question}', question)
      .replace('{difficulty}', difficulty || 'intermediate');

    // chatCompletion returns parsed JSON object directly
    const result = await chatCompletion(prompt, `Question: ${question}`);
    res.json(result);
  } catch (err) {
    console.error('Interview answer error:', err.message);
    res.status(500).json({ error: 'Failed to generate answer', message: err.message });
  }
});

module.exports = router;
