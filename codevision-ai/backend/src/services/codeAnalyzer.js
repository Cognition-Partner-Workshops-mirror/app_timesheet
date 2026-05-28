/**
 * Universal Code Analyzer — detects data structures and algorithm patterns from source code.
 *
 * Scans code for:
 *   - Data structure declarations/usage (Array, ArrayList, Set, Map, Stack, Queue,
 *     LinkedList, Tree, Graph, Heap, String, Matrix)
 *   - Algorithm patterns (sorting, searching, BFS, DFS, DP, two-pointer,
 *     sliding window, backtracking, greedy, divide-and-conquer)
 *   - Variable names and their likely types
 *
 * Returns a structured analysis that the animation engine uses to pick the right
 * combined visualization layout and generate step-by-step animation data.
 */

// Data structure detection patterns — each entry matches common declarations
// across Java, Python, JavaScript, and C++
const DS_PATTERNS = {
  array: {
    label: 'Array',
    patterns: [
      /int\s*\[\s*\]|int\[\]|new\s+int\s*\[/i,
      /float\s*\[\s*\]|double\s*\[\s*\]/i,
      /string\s*\[\s*\]|char\s*\[\s*\]/i,
      /\bint\s+\w+\s*\[\s*\d*\s*\]/i,       // C-style: int arr[10]
      /\[\s*\d+\s*(,\s*\d+\s*)*\]/,          // Literal: [1, 2, 3]
      /\bnums\b|\barr\b|\barray\b|\belements\b/i,
    ],
  },
  arrayList: {
    label: 'ArrayList / List',
    patterns: [
      /ArrayList\s*</i,
      /new\s+ArrayList/i,
      /List\s*<\s*\w+\s*>/i,
      /\.add\s*\(|\.remove\s*\(|\.get\s*\(/i,
      /\blist\b\s*[.=]/i,
      /\[\]\s*=\s*\[\s*\]/,                   // JS: let list = []
      /\.append\s*\(|\.extend\s*\(/i,         // Python
      /vector\s*</i,                           // C++ vector
    ],
  },
  set: {
    label: 'Set / HashSet',
    patterns: [
      /HashSet\s*</i,
      /TreeSet\s*</i,
      /new\s+Set\s*\(/i,
      /new\s+HashSet/i,
      /\bset\(\)|set\s*\(\s*\[/i,             // Python set()
      /\.has\s*\(|\.contains\s*\(/i,          // Set membership check
      /unordered_set\s*</i,                   // C++
      /\bvisited\b.*\bHashSet\b|\bHashSet\b.*\bvisited\b/i,
    ],
  },
  map: {
    label: 'Map / HashMap',
    patterns: [
      /HashMap\s*</i,
      /TreeMap\s*</i,
      /new\s+Map\s*\(/i,
      /new\s+HashMap/i,
      /\bdict\s*\(|{\s*['"\w]+\s*:/i,         // Python dict / JS object
      /\.put\s*\(|\.get\s*\(.*map/i,
      /\.getOrDefault\s*\(/i,
      /unordered_map\s*</i,                   // C++
      /\bcounter\b|\bfrequency\b|\bfreq\b/i,
    ],
  },
  stack: {
    label: 'Stack',
    patterns: [
      /new\s+Stack/i,
      /Stack\s*</i,
      /Deque.*stack|ArrayDeque.*stack/i,
      /\.push\s*\([\s\S]*\.pop\s*\(/i,
      /\bstack\b\s*[.=\[]/i,
      /LIFO/i,
    ],
  },
  queue: {
    label: 'Queue',
    patterns: [
      /new\s+Queue/i,
      /Queue\s*</i,
      /LinkedList.*queue|ArrayDeque.*queue/i,
      /PriorityQueue\s*</i,
      /\.offer\s*\(|\.poll\s*\(/i,
      /\.enqueue\s*\(|\.dequeue\s*\(/i,
      /\bqueue\b\s*[.=\[]/i,
      /deque\s*\(/i,                           // Python deque
      /FIFO/i,
    ],
  },
  linkedList: {
    label: 'Linked List',
    patterns: [
      /ListNode/i,
      /LinkedList/i,
      /\.next\s*[;=]/i,
      /\.prev\s*[;=]/i,
      /\bhead\b.*\bnext\b/i,
      /\->next/i,                              // C++ node->next
      /\bnode\b.*\bnext\b/i,
    ],
  },
  tree: {
    label: 'Binary Tree',
    patterns: [
      /TreeNode/i,
      /BinaryTree/i,
      /\.left\b.*\.right\b|\.right\b.*\.left\b/i,
      /\broot\b.*\bleft\b.*\bright\b/i,
      /BST|BinarySearchTree/i,
    ],
  },
  graph: {
    label: 'Graph',
    patterns: [
      /\bgraph\b\s*[.=\[{]/i,
      /adjacency\s*(list|matrix)/i,
      /\badj\b\s*[.=\[{]/i,
      /\bedges\b.*\bvertices\b|\bvertices\b.*\bedges\b/i,
      /\bneighbors\b|\bneighbours\b/i,
      /addEdge|add_edge/i,
    ],
  },
  heap: {
    label: 'Heap / Priority Queue',
    patterns: [
      /PriorityQueue\s*</i,
      /MinHeap|MaxHeap|min.?heap|max.?heap/i,
      /heapq\.|heappush|heappop/i,            // Python heapq
      /priority_queue\s*</i,                   // C++
    ],
  },
  string: {
    label: 'String',
    patterns: [
      /\.charAt\s*\(|\.substring\s*\(|\.indexOf\s*\(/i,
      /\.split\s*\(|\.join\s*\(/i,
      /\.toCharArray\s*\(/i,
      /StringBuilder|StringBuffer/i,
      /\bstr\b\s*[.=\[]/i,
      /\.replace\s*\(|\.toLowerCase\s*\(|\.toUpperCase\s*\(/i,
    ],
  },
  matrix: {
    label: 'Matrix / 2D Array',
    patterns: [
      /int\s*\[\s*\]\s*\[\s*\]/i,
      /\w+\s*\[\s*\w+\s*\]\s*\[\s*\w+\s*\]/i,  // arr[i][j]
      /\bgrid\b|\bmatrix\b|\bboard\b/i,
      /\brows?\b.*\bcols?\b|\bcols?\b.*\brows?\b/i,
    ],
  },
};

// Algorithm pattern detection — identifies the technique/approach
const ALGO_PATTERNS = {
  bubble_sort: {
    label: 'Bubble Sort',
    patterns: [/bubble/i, /\bswap\b.*\bfor\b.*\bfor\b/i],
    requireAll: [/for.*for/, /swap|temp.*=|>\s*\w+\s*\[/i],
  },
  selection_sort: {
    label: 'Selection Sort',
    patterns: [/selection/i, /\bmin\w*\s*=\s*\w+.*for.*for/i],
  },
  insertion_sort: {
    label: 'Insertion Sort',
    patterns: [/insertion/i, /\bkey\b.*while.*</i],
  },
  merge_sort: {
    label: 'Merge Sort',
    patterns: [/merge.?sort/i, /\bmerge\b.*\bleft\b.*\bright\b/i],
  },
  quick_sort: {
    label: 'Quick Sort',
    patterns: [/quick.?sort/i, /\bpivot\b.*\bpartition\b/i],
  },
  binary_search: {
    label: 'Binary Search',
    patterns: [/binary.?search/i, /\blow\b.*\bhigh\b.*\bmid\b/i, /\bleft\b.*\bright\b.*\bmid\b(?!.*merge)/i],
  },
  linear_search: {
    label: 'Linear Search',
    patterns: [/linear.?search/i],
  },
  bfs: {
    label: 'BFS (Breadth-First Search)',
    patterns: [
      /\bbfs\b/i,
      /breadth.?first/i,
      /queue.*while.*poll|queue.*while.*dequeue|queue.*while.*shift/i,
      /\bqueue\b.*\bvisited\b|\bvisited\b.*\bqueue\b/i,
      /level.?order/i,
    ],
  },
  dfs: {
    label: 'DFS (Depth-First Search)',
    patterns: [
      /\bdfs\b/i,
      /depth.?first/i,
      /stack.*while.*pop|recursive.*visit/i,
      /\bstack\b.*\bvisited\b|\bvisited\b.*\bstack\b/i,
    ],
  },
  dp: {
    label: 'Dynamic Programming',
    patterns: [
      /\bdp\b\s*[\[=]/i,
      /\bmemo\b|\bmemoiz/i,
      /\btabulation\b/i,
      /dp\s*\[\s*\w+\s*\]\s*\[\s*\w+\s*\]\s*=/i,  // dp[i][j] =
      /dp\s*\[\s*\w+\s*\]\s*=\s*.*dp\s*\[/i,       // dp[i] = ... dp[
      /fibonacci|fib\s*\(/i,
      /knapsack/i,
      /longest.?common|lcs\b/i,
    ],
  },
  two_pointer: {
    label: 'Two Pointer',
    patterns: [
      /two.?pointer/i,
      /\bleft\b.*\bright\b.*while.*left\s*<\s*right/i,
      /\bstart\b.*\bend\b.*while.*start\s*<\s*end/i,
      /\bslow\b.*\bfast\b/i,                     // Floyd's / fast-slow pointer
    ],
  },
  sliding_window: {
    label: 'Sliding Window',
    patterns: [
      /sliding.?window/i,
      /window.?size|window.?start|window.?end/i,
      /\bwindow\b.*for.*while/i,
    ],
  },
  backtracking: {
    label: 'Backtracking',
    patterns: [
      /backtrack/i,
      /\bsolve\b.*\bbase\b.*\brecurse\b/i,
      /permut|combinat/i,
    ],
  },
  greedy: {
    label: 'Greedy',
    patterns: [
      /greedy/i,
      /\bsort\b.*for.*\bmax\b|\bsort\b.*for.*\bmin\b/i,
    ],
  },
  linked_list_reversal: {
    label: 'Linked List Reversal',
    patterns: [
      /reverse.*list|reverselist/i,
      /ListNode.*prev.*curr.*next/i,
      /prev\s*=\s*null.*curr.*while.*\.next\s*=\s*prev/is,
      /curr\.next\s*=\s*prev/i,
    ],
  },
  hashmap_count: {
    label: 'HashMap Frequency Count',
    patterns: [
      /getOrDefault\s*\(/i,
      /frequency|freq.*map|count.*map/i,
      /HashMap.*for.*put|Map.*for.*set/i,
    ],
  },
  set_operations: {
    label: 'Set Operations',
    patterns: [
      /HashSet.*contains|new\s+Set.*has\s*\(/i,
      /set\s*\.\s*add.*duplicate/i,
      /contains\s*duplicate|find.*duplicate/i,
    ],
  },
  string_reverse: {
    label: 'String Reverse',
    patterns: [
      /reverse.*string|string.*reverse/i,
      /StringBuilder.*reverse|toCharArray.*reverse/i,
      /palindrome/i,
    ],
  },
  inorder_traversal: {
    label: 'Inorder Traversal',
    patterns: [
      /inorder|in.?order/i,
      /\bleft\b.*\broot\b.*\bright\b.*traversal/i,
    ],
  },
  preorder_traversal: {
    label: 'Preorder Traversal',
    patterns: [
      /preorder|pre.?order/i,
      /\broot\b.*\bleft\b.*\bright\b.*traversal/i,
    ],
  },
  postorder_traversal: {
    label: 'Postorder Traversal',
    patterns: [/postorder|post.?order/i],
  },
};

/**
 * Analyzes source code to detect data structures and algorithm patterns.
 * Returns a structured result with all detected DS, the primary algorithm,
 * and suggested visualization layout.
 *
 * @param {string} code - Source code to analyze
 * @returns {object} Analysis result with detectedDS, algorithm, variables, etc.
 */
function analyzeCode(code) {
  if (!code || typeof code !== 'string') {
    return { detectedDS: [], algorithm: null, variables: [], visualization: 'standard' };
  }

  const lower = code.toLowerCase();

  // 1. Detect all data structures used in the code
  const detectedDS = [];
  for (const [dsKey, dsDef] of Object.entries(DS_PATTERNS)) {
    const matched = dsDef.patterns.some((p) => p.test(code));
    if (matched) {
      detectedDS.push({ key: dsKey, label: dsDef.label });
    }
  }

  // 2. Detect the primary algorithm/technique
  let algorithm = null;
  let bestScore = 0;
  for (const [algoKey, algoDef] of Object.entries(ALGO_PATTERNS)) {
    let score = 0;
    for (const p of algoDef.patterns) {
      if (p.test(code)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      algorithm = { key: algoKey, label: algoDef.label, confidence: score };
    }
  }

  // 3. Extract variable names that look like data structures
  const variables = extractVariables(code);

  // 4. Determine visualization type based on detected DS count
  let visualization = 'standard';
  if (detectedDS.length >= 2) {
    visualization = 'combined';
  } else if (detectedDS.some((d) => ['tree', 'graph', 'linkedList'].includes(d.key))) {
    visualization = 'combined';
  }

  return {
    detectedDS,
    algorithm,
    variables,
    visualization,
    dsCount: detectedDS.length,
  };
}

/**
 * Extracts variable names and their likely types from code.
 * @param {string} code - Source code
 * @returns {Array<{name: string, type: string}>}
 */
function extractVariables(code) {
  const vars = [];
  const patterns = [
    // Java: Type varName
    { regex: /(?:int|long|String|ListNode|TreeNode|List|ArrayList|Stack|Queue|Set|Map|HashMap|int\[\])\s+(\w+)/g, type: 'from_declaration' },
    // Python: varName = value
    { regex: /(\w+)\s*=\s*(?:\[|\{|set\(|dict\(|deque\()/g, type: 'from_assignment' },
    // JS: let/const/var name = 
    { regex: /(?:let|const|var)\s+(\w+)/g, type: 'from_declaration' },
  ];

  const seen = new Set();
  for (const { regex } of patterns) {
    let match;
    while ((match = regex.exec(code)) !== null) {
      const name = match[1];
      if (!seen.has(name) && name.length > 1 && !['int', 'new', 'null', 'void', 'return', 'while', 'for', 'if'].includes(name)) {
        seen.add(name);
        vars.push({ name, type: guessVarType(name, code) });
      }
    }
  }
  return vars;
}

/**
 * Guesses the type of a variable based on its name and usage context.
 * @param {string} name - Variable name
 * @param {string} code - Full source code
 * @returns {string} Guessed type
 */
function guessVarType(name, code) {
  const lower = name.toLowerCase();
  if (lower.includes('stack')) return 'stack';
  if (lower.includes('queue') || lower.includes('deque')) return 'queue';
  if (lower.includes('map') || lower.includes('dict') || lower.includes('hash') || lower.includes('freq') || lower.includes('count')) return 'map';
  if (lower.includes('set') || lower.includes('visited') || lower.includes('seen')) return 'set';
  if (lower.includes('list') || lower.includes('result') || lower.includes('output') || lower.includes('ans')) return 'arrayList';
  if (lower.includes('node') || lower.includes('head') || lower.includes('curr') || lower.includes('prev')) return 'linkedList';
  if (lower.includes('root') || lower.includes('tree')) return 'tree';
  if (lower.includes('graph') || lower.includes('adj')) return 'graph';
  if (lower.includes('grid') || lower.includes('matrix') || lower.includes('board')) return 'matrix';
  if (lower.includes('arr') || lower.includes('nums') || lower.includes('dp')) return 'array';
  // Check usage in code
  const nameRegex = new RegExp(`${name}\\s*\\.push\\s*\\(|${name}\\s*\\.pop\\s*\\(`, 'i');
  if (nameRegex.test(code)) return 'stack';
  return 'unknown';
}

module.exports = { analyzeCode, DS_PATTERNS, ALGO_PATTERNS };
