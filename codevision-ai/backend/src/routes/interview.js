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

// Comprehensive interview questions organized by category and topic.
// Covers ALL major DSA, System Design, and Production concepts.
const INTERVIEW_QUESTIONS = {
  dsa: {
    label: 'Data Structures & Algorithms',
    topics: {
      arrays: {
        label: 'Arrays',
        questions: [
          'What is the difference between an array and a dynamic array (ArrayList)?',
          'How do you find duplicates in an array in O(n) time?',
          'Explain the two-pointer technique with an example.',
          'How does the sliding window technique work? Give a real problem.',
          'What is the time complexity of common array operations (access, insert, delete)?',
          'How do you rotate an array by k positions?',
          'Find the maximum subarray sum (Kadane\'s algorithm).',
          'How do you merge two sorted arrays in-place?',
          'What is a prefix sum array and when is it useful?',
          'How do you find the missing number in an array of 1 to n?',
        ],
      },
      strings: {
        label: 'Strings',
        questions: [
          'How do you check if two strings are anagrams?',
          'Explain the KMP string matching algorithm.',
          'What is the Rabin-Karp algorithm for pattern matching?',
          'How do you find the longest palindromic substring?',
          'What is a rolling hash and where is it used?',
          'How do you reverse words in a string without extra space?',
          'Explain Z-algorithm for pattern matching.',
          'How do you find the longest common substring of two strings?',
          'What is string interning and why does it matter?',
          'How do you check if a string has all unique characters?',
        ],
      },
      linked_lists: {
        label: 'Linked Lists',
        questions: [
          'What are the types of linked lists (singly, doubly, circular)?',
          'How do you reverse a linked list iteratively and recursively?',
          'How do you detect a cycle in a linked list (Floyd\'s algorithm)?',
          'How do you find the middle of a linked list in one pass?',
          'How do you merge two sorted linked lists?',
          'How do you remove the nth node from the end?',
          'What is the difference between arrays and linked lists in terms of memory?',
          'How do you check if a linked list is a palindrome?',
          'How do you find the intersection point of two linked lists?',
          'How do you flatten a multilevel doubly linked list?',
        ],
      },
      stacks: {
        label: 'Stacks',
        questions: [
          'How do you implement a stack using arrays vs linked lists?',
          'How do you implement a stack using two queues?',
          'What are monotonic stacks and their applications?',
          'Explain the next greater element problem.',
          'How do you evaluate a postfix expression using a stack?',
          'How do you check balanced parentheses using a stack?',
          'What is a min stack (get minimum in O(1))?',
          'How do you implement browser back/forward using stacks?',
          'What is the stock span problem?',
          'How do you sort a stack using another stack?',
        ],
      },
      queues: {
        label: 'Queues',
        questions: [
          'What is the difference between a queue and a deque?',
          'How does a priority queue (heap) work internally?',
          'How do you implement a queue using two stacks?',
          'What is a circular queue and when is it useful?',
          'Explain the sliding window maximum problem using a deque.',
          'How do you implement a LRU cache?',
          'What is a blocking queue and where is it used?',
          'How do you design a task scheduler using a queue?',
          'What is a monotonic queue?',
          'Explain the difference between BFS queue and DFS stack approaches.',
        ],
      },
      hashing: {
        label: 'Hashing & HashMaps',
        questions: [
          'How does a hash table work internally?',
          'What are collision resolution techniques (chaining, open addressing)?',
          'What is the difference between HashMap, HashSet, and TreeMap?',
          'How do you design a good hash function?',
          'What is consistent hashing and where is it used?',
          'How do you find two numbers that sum to a target using hashing?',
          'What is the load factor in a hash table?',
          'How do you group anagrams using a hash map?',
          'What is a bloom filter and when would you use it?',
          'How do you find the first non-repeating character in a string?',
        ],
      },
      trees: {
        label: 'Binary Trees',
        questions: [
          'What are the different types of binary trees (full, complete, perfect, BST)?',
          'Explain inorder, preorder, and postorder traversals with use cases.',
          'How do you find the height/depth of a binary tree?',
          'What is the lowest common ancestor (LCA) of two nodes?',
          'How do you check if a binary tree is balanced?',
          'How do you serialize and deserialize a binary tree?',
          'What is a binary tree\'s diameter?',
          'How do you convert a sorted array to a balanced BST?',
          'What is level-order traversal and how is it implemented?',
          'How do you find the maximum path sum in a binary tree?',
        ],
      },
      bst: {
        label: 'Binary Search Trees',
        questions: [
          'What are the properties of a BST?',
          'How do you insert, delete, and search in a BST?',
          'What is the time complexity of BST operations in best/worst case?',
          'How do you validate if a tree is a BST?',
          'What is the kth smallest element in a BST?',
          'How do you find the inorder successor of a node in BST?',
          'What happens when a BST becomes skewed? How to fix it?',
          'How do you convert a BST to a sorted doubly linked list?',
          'What is the floor and ceiling of a value in a BST?',
          'How do you merge two BSTs?',
        ],
      },
      avl_rbt: {
        label: 'AVL Trees & Red-Black Trees',
        questions: [
          'What is an AVL tree and how does it maintain balance?',
          'Explain left rotation, right rotation, and double rotations.',
          'What is a Red-Black tree and its properties?',
          'Compare AVL trees vs Red-Black trees — when to use which?',
          'How does Java\'s TreeMap use Red-Black trees internally?',
          'What is the maximum height of an AVL tree with n nodes?',
          'How do you insert and delete in an AVL tree?',
          'What is a splay tree and when is it useful?',
          'What is a B-tree and where is it used (databases)?',
          'What is a B+ tree and how is it different from a B-tree?',
        ],
      },
      heaps: {
        label: 'Heaps & Priority Queues',
        questions: [
          'What is a heap and what are its types (min-heap, max-heap)?',
          'How do you build a heap from an array (heapify)?',
          'What is the time complexity of heap operations?',
          'How do you find the kth largest element using a heap?',
          'Explain heap sort step by step.',
          'How do you merge k sorted lists using a heap?',
          'What is a Fibonacci heap and when is it used?',
          'How do you implement a median finder using two heaps?',
          'What is the difference between a heap and a BST?',
          'How do you find top-k frequent elements?',
        ],
      },
      graphs: {
        label: 'Graphs',
        questions: [
          'What are the different ways to represent a graph (adjacency matrix, list)?',
          'Explain BFS and DFS with their applications.',
          'How do you detect a cycle in a directed graph?',
          'How do you detect a cycle in an undirected graph?',
          'What is topological sorting and when is it used?',
          'Explain Dijkstra\'s shortest path algorithm.',
          'What is Bellman-Ford algorithm and when to use it over Dijkstra?',
          'Explain Kruskal\'s and Prim\'s algorithms for MST.',
          'What is Floyd-Warshall algorithm?',
          'How do you find connected components in a graph?',
          'What is a bipartite graph and how do you check for it?',
          'Explain Union-Find (Disjoint Set Union) data structure.',
          'What is Tarjan\'s algorithm for strongly connected components?',
          'How do you find bridges and articulation points in a graph?',
          'What is the A* search algorithm?',
        ],
      },
      trie: {
        label: 'Trie (Prefix Tree)',
        questions: [
          'What is a trie and when would you use it?',
          'How do you implement insert, search, and startsWith in a trie?',
          'What is the time and space complexity of trie operations?',
          'How do you implement autocomplete using a trie?',
          'What is a compressed trie (radix tree)?',
          'How do you find the longest common prefix using a trie?',
          'How do you implement a dictionary/spell checker with a trie?',
          'What is a suffix trie and suffix tree?',
          'Compare trie vs hash map for string storage.',
          'How do you count distinct substrings of a string using a trie?',
        ],
      },
      segment_tree: {
        label: 'Segment Trees & BIT',
        questions: [
          'What is a segment tree and what problems does it solve?',
          'How do you build, query, and update a segment tree?',
          'What is lazy propagation in segment trees?',
          'What is a Binary Indexed Tree (Fenwick Tree)?',
          'Compare segment tree vs BIT — when to use which?',
          'How do you find range sum queries efficiently?',
          'How do you find range minimum/maximum queries?',
          'What is a merge sort tree?',
          'How do you handle range update queries?',
          'What is a persistent segment tree?',
        ],
      },
      sorting: {
        label: 'Sorting Algorithms',
        questions: [
          'Compare QuickSort vs MergeSort — when to use which?',
          'Explain how quicksort\'s partition works and its pivot selection strategies.',
          'What is the best sorting algorithm for nearly sorted data?',
          'How does counting sort work and when is it applicable?',
          'What is radix sort and what is its time complexity?',
          'What is bucket sort and when should you use it?',
          'What is the lower bound for comparison-based sorting (Ω(n log n))?',
          'How does TimSort work (Python/Java default)?',
          'What is the stability of a sorting algorithm and why does it matter?',
          'How do you sort a linked list efficiently?',
        ],
      },
      searching: {
        label: 'Searching Algorithms',
        questions: [
          'Explain binary search and its edge cases.',
          'How do you find the first and last occurrence of an element?',
          'What is the search in a rotated sorted array problem?',
          'How do you find peak element in an array?',
          'What is interpolation search and when is it better than binary search?',
          'How do you search in a 2D sorted matrix?',
          'What is exponential search?',
          'How do you find the square root of a number using binary search?',
          'What is ternary search?',
          'How do you find the smallest missing positive integer?',
        ],
      },
      dp: {
        label: 'Dynamic Programming',
        questions: [
          'What is dynamic programming and when should you use it?',
          'Explain memoization vs tabulation with examples.',
          'How do you identify if a problem can be solved with DP?',
          'Walk through the 0/1 knapsack problem.',
          'What is the longest common subsequence (LCS) problem?',
          'Explain the longest increasing subsequence (LIS).',
          'How do you solve the coin change problem?',
          'What is the edit distance problem?',
          'Explain matrix chain multiplication.',
          'What is the difference between top-down and bottom-up approaches?',
          'How do you solve the subset sum problem?',
          'What is the rod cutting problem?',
          'Explain DP on trees.',
          'What is DP with bitmask (bitmask DP)?',
          'How do you solve the word break problem?',
        ],
      },
      greedy: {
        label: 'Greedy Algorithms',
        questions: [
          'What is a greedy algorithm and how does it differ from DP?',
          'Explain the activity selection problem.',
          'How does Huffman coding work?',
          'What is the fractional knapsack problem?',
          'How do you solve the job sequencing problem?',
          'What is the minimum number of platforms problem?',
          'How do you find the minimum spanning tree (greedy approach)?',
          'When does a greedy approach fail? Give an example.',
          'What is the interval scheduling problem?',
          'How do you solve the jump game problem?',
        ],
      },
      backtracking: {
        label: 'Backtracking',
        questions: [
          'What is backtracking and how does it differ from brute force?',
          'How do you solve the N-Queens problem?',
          'Explain the Sudoku solver algorithm.',
          'How do you generate all permutations of a string/array?',
          'How do you generate all subsets (power set)?',
          'What is the rat in a maze problem?',
          'How do you solve the word search problem on a grid?',
          'What is the combination sum problem?',
          'How do you solve the graph coloring problem?',
          'What is the knight\'s tour problem?',
        ],
      },
      bit_manipulation: {
        label: 'Bit Manipulation',
        questions: [
          'What are common bitwise operators (AND, OR, XOR, NOT, shifts)?',
          'How do you check if a number is a power of 2?',
          'How do you count the number of set bits (Brian Kernighan\'s algorithm)?',
          'What is XOR and how is it used to find the single non-duplicate element?',
          'How do you swap two numbers without a temporary variable?',
          'What is a bitmask and how is it used in DP?',
          'How do you find the two non-repeating elements in an array?',
          'What is the difference between arithmetic and logical shifts?',
          'How do you reverse bits of a number?',
          'How do you find the missing number using XOR?',
        ],
      },
      recursion: {
        label: 'Recursion',
        questions: [
          'What is recursion and what are its base case and recursive case?',
          'How do you convert a recursive solution to iterative?',
          'What is tail recursion and why is it important?',
          'Explain the Tower of Hanoi problem.',
          'How does recursion use the call stack?',
          'What is the time complexity of recursive Fibonacci? How to optimize?',
          'How do you print all subsequences of a string recursively?',
          'What is mutual recursion?',
          'How do you solve the staircase problem recursively?',
          'What are the risks of deep recursion (stack overflow)?',
        ],
      },
      divide_conquer: {
        label: 'Divide & Conquer',
        questions: [
          'What is the divide and conquer paradigm?',
          'How does merge sort use divide and conquer?',
          'What is the closest pair of points problem?',
          'How do you count inversions in an array using merge sort?',
          'What is Strassen\'s matrix multiplication?',
          'How does quick select (finding kth element) work?',
          'What is the maximum subarray problem (D&C approach)?',
          'How do you compute power(x, n) in O(log n)?',
          'What is the master theorem for recurrence relations?',
          'How do you multiply two large numbers (Karatsuba algorithm)?',
        ],
      },
      math_number_theory: {
        label: 'Math & Number Theory',
        questions: [
          'How do you check if a number is prime efficiently?',
          'What is the Sieve of Eratosthenes?',
          'Explain GCD and the Euclidean algorithm.',
          'What is modular arithmetic and why is it used in competitive programming?',
          'How do you compute modular exponentiation?',
          'What is Fermat\'s little theorem?',
          'How do you find the prime factorization of a number?',
          'What is the Chinese Remainder Theorem?',
          'How do you count trailing zeros in n factorial?',
          'What is the catalan number and its applications?',
        ],
      },
      advanced_ds: {
        label: 'Advanced Data Structures',
        questions: [
          'What is a skip list and how does it work?',
          'What is a Disjoint Set (Union-Find) with path compression and union by rank?',
          'What is an interval tree?',
          'What is a K-D tree and where is it used?',
          'What is a sparse table and when is it useful?',
          'What is a LRU cache and how do you implement it?',
          'What is a LFU cache?',
          'What is a Bloom filter and its false positive rate?',
          'What is a rope data structure for strings?',
          'What is an order-statistic tree?',
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
          'What are ACID properties in databases?',
          'What is BASE (Basically Available, Soft State, Eventually Consistent)?',
          'Explain the difference between latency and throughput.',
          'What is the difference between availability and reliability?',
          'What is a single point of failure and how do you eliminate it?',
        ],
      },
      networking: {
        label: 'Networking & Protocols',
        questions: [
          'Explain the difference between TCP and UDP.',
          'How does HTTP/HTTPS work? What is TLS?',
          'What is a WebSocket and when should you use it over HTTP?',
          'What is gRPC and how does it differ from REST?',
          'Explain DNS resolution step by step.',
          'What is a reverse proxy and how does it differ from a forward proxy?',
          'What is GraphQL and when to use it over REST?',
          'What is long polling vs WebSockets vs Server-Sent Events?',
          'How does a CDN work and when should you use one?',
          'What is an API gateway?',
        ],
      },
      databases: {
        label: 'Database Design',
        questions: [
          'How do you design a database schema for a social media app?',
          'What is database normalization (1NF, 2NF, 3NF, BCNF)?',
          'When should you denormalize a database?',
          'What are database indexes and how do they work (B-tree, Hash)?',
          'Explain database replication (master-slave, master-master).',
          'What is a write-ahead log (WAL)?',
          'What is MVCC (Multi-Version Concurrency Control)?',
          'When to choose PostgreSQL vs MySQL vs MongoDB vs Cassandra?',
          'What is a materialized view?',
          'How do you handle database migrations safely?',
        ],
      },
      architecture: {
        label: 'Architecture Patterns',
        questions: [
          'Explain microservices vs monolithic architecture with trade-offs.',
          'What is event-driven architecture?',
          'How does a message queue improve system reliability?',
          'What is CQRS (Command Query Responsibility Segregation)?',
          'Explain the circuit breaker pattern.',
          'What is the saga pattern for distributed transactions?',
          'What is service mesh (Istio, Envoy)?',
          'What is the strangler fig pattern for migration?',
          'Explain domain-driven design (DDD) bounded contexts.',
          'What is the sidecar pattern?',
        ],
      },
      caching: {
        label: 'Caching Strategies',
        questions: [
          'What are the different caching strategies (cache-aside, read-through, write-through, write-behind)?',
          'Explain cache invalidation strategies (TTL, event-based, versioning).',
          'What is Redis and how is it used in production?',
          'How do you handle cache stampede (thundering herd)?',
          'What is Memcached and how does it compare to Redis?',
          'What is a distributed cache?',
          'How do you handle cache consistency in a distributed system?',
          'What is cache eviction policy (LRU, LFU, FIFO)?',
          'When should you NOT use caching?',
          'How do you warm up a cache?',
        ],
      },
      message_queues: {
        label: 'Message Queues & Streaming',
        questions: [
          'What is a message queue and why is it important?',
          'Compare Kafka vs RabbitMQ vs SQS.',
          'What is the publish-subscribe pattern?',
          'How does Kafka ensure message ordering?',
          'What is a dead-letter queue?',
          'How do you handle exactly-once delivery?',
          'What is event sourcing?',
          'How do you handle backpressure in streaming systems?',
          'What is the difference between a queue and a topic?',
          'How do you process millions of events per second?',
        ],
      },
      api_design: {
        label: 'API Design',
        questions: [
          'What are REST API best practices?',
          'How do you version an API?',
          'What is rate limiting and how do you implement it?',
          'How do you design pagination for large datasets?',
          'What is idempotency and why is it important in APIs?',
          'How do you handle authentication in APIs (JWT, OAuth, API keys)?',
          'What is HATEOAS in REST?',
          'How do you design webhooks?',
          'What is API throttling vs rate limiting?',
          'How do you document an API (OpenAPI/Swagger)?',
        ],
      },
      distributed_systems: {
        label: 'Distributed Systems',
        questions: [
          'What is eventual consistency?',
          'Explain the Paxos or Raft consensus algorithm.',
          'What is a distributed lock and how do you implement one?',
          'How does consistent hashing work?',
          'What is a vector clock?',
          'How do you handle network partitions?',
          'What is the split-brain problem?',
          'Explain the two-phase commit (2PC) protocol.',
          'What is gossip protocol?',
          'How do leader election algorithms work?',
        ],
      },
      real_systems: {
        label: 'Design Real Systems',
        questions: [
          'How would you design a URL shortener (like bit.ly)?',
          'Design a chat messaging system like WhatsApp.',
          'How would you design a rate limiter?',
          'Design a notification system for millions of users.',
          'How would you design a social media news feed (Twitter/Facebook)?',
          'Design a file storage service like Google Drive/Dropbox.',
          'How would you design a video streaming service like YouTube?',
          'Design a ride-sharing service like Uber.',
          'How would you design a search engine?',
          'Design an e-commerce system like Amazon.',
          'How would you design a payment processing system?',
          'Design a real-time collaborative editor like Google Docs.',
          'How would you design a recommendation engine?',
          'Design a metrics/monitoring system like Prometheus.',
          'How would you design a distributed task scheduler?',
        ],
      },
      data_at_scale: {
        label: 'Data at Scale',
        questions: [
          'How do you handle 1 million concurrent users?',
          'What is data partitioning (horizontal, vertical, functional)?',
          'How do you design a system for high write throughput?',
          'What is a data lake vs data warehouse?',
          'How do you handle time-series data at scale?',
          'What is MapReduce and how does it work?',
          'How do you handle large file uploads (chunking, resumable)?',
          'What is a CDC (Change Data Capture) pipeline?',
          'How do you design a global multi-region system?',
          'What is data replication lag and how do you handle it?',
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
          'What is infrastructure as code (Terraform, Pulumi)?',
          'What is GitOps?',
          'How do you implement feature flags?',
          'What is A/B testing in production?',
          'How do you handle rollbacks?',
          'What is a build artifact and how do you manage versions?',
        ],
      },
      containers: {
        label: 'Docker & Containers',
        questions: [
          'What is Docker and how does containerization work?',
          'What is the difference between a Docker image and a container?',
          'How do you write an efficient Dockerfile?',
          'What is Docker Compose and when do you use it?',
          'How do you manage persistent data in containers (volumes)?',
          'What is a multi-stage Docker build?',
          'How do you debug a running container?',
          'What is the difference between COPY and ADD in Dockerfile?',
          'How do you scan Docker images for vulnerabilities?',
          'What is Docker networking (bridge, host, overlay)?',
        ],
      },
      kubernetes: {
        label: 'Kubernetes & Orchestration',
        questions: [
          'What is Kubernetes and why do you need it?',
          'Explain Pods, Deployments, Services, and Ingress.',
          'How do you scale applications in Kubernetes (HPA, VPA)?',
          'What are ConfigMaps and Secrets in Kubernetes?',
          'How does Kubernetes handle service discovery?',
          'What is a StatefulSet vs Deployment?',
          'How do you handle persistent storage in Kubernetes?',
          'What are readiness and liveness probes?',
          'How does Kubernetes networking work (CNI, kube-proxy)?',
          'What is a Helm chart?',
        ],
      },
      monitoring: {
        label: 'Monitoring & Observability',
        questions: [
          'What metrics should you monitor in production (RED, USE, Four Golden Signals)?',
          'Explain the difference between logs, metrics, and traces.',
          'How do you set up alerting without alert fatigue?',
          'What is distributed tracing (Jaeger, Zipkin)?',
          'How do you debug production issues?',
          'What is Prometheus and Grafana?',
          'How do you implement structured logging?',
          'What is an ELK/EFK stack?',
          'How do you handle log aggregation at scale?',
          'What is OpenTelemetry?',
        ],
      },
      security: {
        label: 'Security',
        questions: [
          'How do you prevent SQL injection?',
          'What is XSS (Cross-Site Scripting) and how do you prevent it?',
          'Explain OAuth 2.0 and OpenID Connect flow.',
          'What is CORS and why is it important?',
          'How do you handle secrets in production (Vault, KMS)?',
          'What is the principle of least privilege?',
          'How do you implement HTTPS/TLS?',
          'What is CSRF and how do you prevent it?',
          'How do you handle authentication vs authorization?',
          'What is a JWT and what are its security implications?',
          'How do you implement role-based access control (RBAC)?',
          'What is a DDoS attack and how do you mitigate it?',
          'How do you secure a REST API?',
          'What is content security policy (CSP)?',
          'How do you audit and rotate secrets/keys?',
        ],
      },
      reliability: {
        label: 'Reliability & SRE',
        questions: [
          'What is an SLA/SLO/SLI? How do you define them?',
          'How do you handle a service outage? What is an incident response process?',
          'What is graceful degradation?',
          'Explain chaos engineering (Netflix Chaos Monkey).',
          'How do you do capacity planning?',
          'What is a postmortem and blameless culture?',
          'How do you implement health checks?',
          'What is a circuit breaker pattern in production?',
          'How do you handle cascading failures?',
          'What is an error budget?',
        ],
      },
      performance: {
        label: 'Performance & Optimization',
        questions: [
          'How do you profile a slow application?',
          'What is the N+1 query problem and how do you fix it?',
          'How do you optimize database queries (indexing, query plans)?',
          'What is connection pooling?',
          'How do you handle memory leaks in production?',
          'What is lazy loading vs eager loading?',
          'How do you optimize frontend performance (Core Web Vitals)?',
          'What is a CDN and how does it improve performance?',
          'How do you benchmark API performance (load testing)?',
          'What is tail latency and why does it matter (p99, p95)?',
        ],
      },
      testing: {
        label: 'Testing Strategies',
        questions: [
          'What is the testing pyramid (unit, integration, E2E)?',
          'How do you write good unit tests?',
          'What is TDD (Test-Driven Development)?',
          'How do you mock external dependencies in tests?',
          'What is integration testing vs E2E testing?',
          'How do you implement contract testing for microservices?',
          'What is property-based testing?',
          'How do you test for race conditions?',
          'What is mutation testing?',
          'How do you achieve good test coverage without over-testing?',
        ],
      },
      cloud: {
        label: 'Cloud & Infrastructure',
        questions: [
          'Compare AWS vs GCP vs Azure at a high level.',
          'What are the different types of cloud services (IaaS, PaaS, SaaS)?',
          'What is a VPC and how do you design network isolation?',
          'How does auto-scaling work in the cloud?',
          'What is a serverless function (Lambda, Cloud Functions)?',
          'How do you manage costs in the cloud?',
          'What is a load balancer (ALB, NLB, CLB) in AWS?',
          'How do you set up multi-region architecture?',
          'What is S3 and how is object storage used?',
          'How do you design for disaster recovery?',
        ],
      },
      linux_os: {
        label: 'Linux & OS Concepts',
        questions: [
          'What is a process vs a thread?',
          'Explain virtual memory and paging.',
          'What is a context switch?',
          'How does the Linux filesystem hierarchy work?',
          'What are file descriptors and how do they work?',
          'How do you debug a high CPU/memory process?',
          'What is a system call?',
          'Explain process scheduling algorithms.',
          'What is a deadlock and how do you prevent it?',
          'What are signals in Linux?',
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
