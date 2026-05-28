/**
 * Data structure animation generators for:
 *   - BFS (graph/tree breadth-first search)
 *   - DFS (graph/tree depth-first search)
 *   - Dynamic Programming (Fibonacci / tabulation)
 *   - Two-Pointer technique
 *   - Sliding Window
 *   - HashMap / frequency counting
 *   - Set operations (union, intersection, membership)
 *   - String operations (reverse, palindrome check)
 *
 * Each function returns { steps, resultArray } in the same format as
 * animationEngine.js. Steps include a `dataStructures` field for the
 * CombinedAnimationPlayer to render multiple panels.
 */

/**
 * BFS (Breadth-First Search) on a graph/tree represented as adjacency list.
 * Shows Queue + Visited Set + traversal order changing at each step.
 * @param {number[]} inputArray - Adjacency list encoded as flat array (node count as first element)
 */
function bfs(inputArray) {
  // Build adjacency list from input: default small graph
  const nodeCount = inputArray.length > 0 ? Math.min(inputArray[0] || 6, 10) : 6;
  // Default edges for a sample graph
  const edges = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [3, 5],
  ].filter(([a, b]) => a < nodeCount && b < nodeCount);

  const adj = Array.from({ length: nodeCount }, () => []);
  edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });

  const steps = [];
  let stepNum = 1;
  const visited = new Set();
  const queue = [0];
  visited.add(0);
  const result = [];

  // Helper snapshots
  const qSnap = () => [...queue];
  const vSnap = () => [...visited];

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Starting BFS from node 0. Queue: [0]. Visited: {0}. Graph has ${nodeCount} nodes.`,
    state: { elements: Array.from({ length: nodeCount }, (_, i) => i), variables: {} },
    dataStructures: {
      graph: { nodes: nodeCount, edges, highlighted: [0], label: 'Graph' },
      queue: { elements: qSnap(), highlighted: [0], label: 'Queue' },
      set: { elements: vSnap(), highlighted: [0], label: 'Visited Set' },
      resultList: { elements: [], highlighted: [], label: 'Traversal Order' },
    },
    highlightIndices: [0],
    activeElements: [],
  });

  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node);

    steps.push({
      stepNumber: stepNum++,
      operation: 'dequeue',
      description: `Dequeue node ${node} from queue. Process it. Queue: [${queue.join(', ')}].`,
      state: { elements: Array.from({ length: nodeCount }, (_, i) => i), variables: { current: node } },
      dataStructures: {
        graph: { nodes: nodeCount, edges, highlighted: [node], label: 'Graph' },
        queue: { elements: qSnap(), highlighted: [], label: 'Queue' },
        set: { elements: vSnap(), highlighted: [node], label: 'Visited Set' },
        resultList: { elements: [...result], highlighted: [result.length - 1], label: 'Traversal Order' },
      },
      highlightIndices: [node],
      activeElements: [node],
    });

    // Visit unvisited neighbors
    for (const neighbor of adj[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);

        steps.push({
          stepNumber: stepNum++,
          operation: 'enqueue',
          description: `Visit neighbor ${neighbor} of node ${node}. Enqueue ${neighbor}. Queue: [${queue.join(', ')}]. Visited: {${[...visited].join(', ')}}.`,
          state: { elements: Array.from({ length: nodeCount }, (_, i) => i), variables: { current: node, neighbor } },
          dataStructures: {
            graph: { nodes: nodeCount, edges, highlighted: [node, neighbor], label: 'Graph' },
            queue: { elements: qSnap(), highlighted: [queue.length - 1], label: 'Queue' },
            set: { elements: vSnap(), highlighted: [...visited].length - 1 >= 0 ? [[...visited].length - 1] : [], label: 'Visited Set' },
            resultList: { elements: [...result], highlighted: [], label: 'Traversal Order' },
          },
          highlightIndices: [node, neighbor],
          activeElements: [neighbor],
        });
      }
    }
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `BFS complete! Traversal order: [${result.join(', ')}]. All reachable nodes visited.`,
    state: { elements: [...result], variables: {} },
    dataStructures: {
      graph: { nodes: nodeCount, edges, highlighted: result, label: 'Graph' },
      queue: { elements: [], highlighted: [], label: 'Queue' },
      set: { elements: vSnap(), highlighted: [], label: 'Visited Set' },
      resultList: { elements: [...result], highlighted: result.map((_, i) => i), label: 'Traversal Order' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, resultArray: result };
}

/**
 * DFS (Depth-First Search) on a graph using explicit stack.
 * Shows Stack + Visited Set + traversal order.
 */
function dfs(inputArray) {
  const nodeCount = inputArray.length > 0 ? Math.min(inputArray[0] || 6, 10) : 6;
  const edges = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [3, 5],
  ].filter(([a, b]) => a < nodeCount && b < nodeCount);

  const adj = Array.from({ length: nodeCount }, () => []);
  edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });

  const steps = [];
  let stepNum = 1;
  const visited = new Set();
  const stack = [0];
  const result = [];

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Starting DFS from node 0. Stack: [0]. Graph has ${nodeCount} nodes.`,
    state: { elements: Array.from({ length: nodeCount }, (_, i) => i), variables: {} },
    dataStructures: {
      graph: { nodes: nodeCount, edges, highlighted: [0], label: 'Graph' },
      stack: { elements: [0], highlighted: [0], label: 'Stack' },
      set: { elements: [], highlighted: [], label: 'Visited Set' },
      resultList: { elements: [], highlighted: [], label: 'Traversal Order' },
    },
    highlightIndices: [0],
    activeElements: [],
  });

  while (stack.length > 0) {
    const node = stack.pop();
    if (visited.has(node)) continue;

    visited.add(node);
    result.push(node);

    steps.push({
      stepNumber: stepNum++,
      operation: 'pop',
      description: `Pop node ${node} from stack. Mark visited. Stack: [${stack.join(', ')}]. Visited: {${[...visited].join(', ')}}.`,
      state: { elements: Array.from({ length: nodeCount }, (_, i) => i), variables: { current: node } },
      dataStructures: {
        graph: { nodes: nodeCount, edges, highlighted: [node], label: 'Graph' },
        stack: { elements: [...stack], highlighted: [], label: 'Stack' },
        set: { elements: [...visited], highlighted: [[...visited].length - 1], label: 'Visited Set' },
        resultList: { elements: [...result], highlighted: [result.length - 1], label: 'Traversal Order' },
      },
      highlightIndices: [node],
      activeElements: [node],
    });

    // Push unvisited neighbors (in reverse for left-to-right traversal)
    const unvisitedNeighbors = adj[node].filter((n) => !visited.has(n)).reverse();
    for (const neighbor of unvisitedNeighbors) {
      stack.push(neighbor);
    }

    if (unvisitedNeighbors.length > 0) {
      steps.push({
        stepNumber: stepNum++,
        operation: 'push',
        description: `Push unvisited neighbors of ${node}: [${unvisitedNeighbors.reverse().join(', ')}]. Stack: [${stack.join(', ')}].`,
        state: { elements: Array.from({ length: nodeCount }, (_, i) => i), variables: { current: node } },
        dataStructures: {
          graph: { nodes: nodeCount, edges, highlighted: [node, ...unvisitedNeighbors], label: 'Graph' },
          stack: { elements: [...stack], highlighted: [stack.length - 1], label: 'Stack' },
          set: { elements: [...visited], highlighted: [], label: 'Visited Set' },
          resultList: { elements: [...result], highlighted: [], label: 'Traversal Order' },
        },
        highlightIndices: unvisitedNeighbors,
        activeElements: unvisitedNeighbors,
      });
    }
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `DFS complete! Traversal order: [${result.join(', ')}]. All reachable nodes visited.`,
    state: { elements: [...result], variables: {} },
    dataStructures: {
      graph: { nodes: nodeCount, edges, highlighted: result, label: 'Graph' },
      stack: { elements: [], highlighted: [], label: 'Stack' },
      set: { elements: [...visited], highlighted: [], label: 'Visited Set' },
      resultList: { elements: [...result], highlighted: result.map((_, i) => i), label: 'Traversal Order' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, resultArray: result };
}

/**
 * Dynamic Programming — Fibonacci with tabulation.
 * Shows DP array being filled + current computation.
 */
function dpFibonacci(inputArray) {
  const n = inputArray.length > 0 ? Math.min(inputArray[0] || 8, 15) : 8;
  const dp = new Array(n + 1).fill(0);
  dp[1] = 1;

  const steps = [];
  let stepNum = 1;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Starting Fibonacci DP tabulation for n=${n}. dp[0]=0, dp[1]=1. Fill dp[2] to dp[${n}].`,
    state: { elements: [...dp], variables: { n } },
    dataStructures: {
      array: { elements: dp.slice(0, Math.min(n + 1, dp.length)), highlighted: [0, 1], label: `DP Array (size ${n + 1})` },
      resultList: { elements: [0, 1], highlighted: [], label: 'Computed Values' },
    },
    highlightIndices: [0, 1],
    activeElements: [],
  });

  for (let i = 2; i <= n; i++) {
    steps.push({
      stepNumber: stepNum++,
      operation: 'compute',
      description: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = ${dp[i - 1] + dp[i - 2]}`,
      state: { elements: [...dp], variables: { i, 'dp[i-1]': dp[i - 1], 'dp[i-2]': dp[i - 2] } },
      dataStructures: {
        array: { elements: dp.slice(0, Math.min(n + 1, dp.length)), highlighted: [i, i - 1, i - 2], label: `DP Array (size ${n + 1})` },
        resultList: { elements: dp.slice(0, i).filter((_, idx) => idx <= i), highlighted: [], label: 'Computed Values' },
      },
      highlightIndices: [i - 2, i - 1, i],
      activeElements: [i],
    });

    dp[i] = dp[i - 1] + dp[i - 2];

    steps.push({
      stepNumber: stepNum++,
      operation: 'store',
      description: `Stored dp[${i}] = ${dp[i]}. DP table so far: [${dp.slice(0, i + 1).join(', ')}].`,
      state: { elements: [...dp], variables: { i, result: dp[i] } },
      dataStructures: {
        array: { elements: dp.slice(0, Math.min(n + 1, dp.length)), highlighted: [i], label: `DP Array (size ${n + 1})` },
        resultList: { elements: dp.slice(0, i + 1), highlighted: [i], label: 'Computed Values' },
      },
      highlightIndices: [i],
      activeElements: [],
    });
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Fibonacci DP complete! F(${n}) = ${dp[n]}. Full table: [${dp.slice(0, n + 1).join(', ')}].`,
    state: { elements: dp.slice(0, n + 1), variables: {} },
    dataStructures: {
      array: { elements: dp.slice(0, n + 1), highlighted: [n], label: `DP Array (size ${n + 1})` },
      resultList: { elements: dp.slice(0, n + 1), highlighted: dp.slice(0, n + 1).map((_, i) => i), label: 'Fibonacci Sequence' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, resultArray: dp.slice(0, n + 1) };
}

/**
 * Two-Pointer technique — find pair with target sum in sorted array.
 * Shows Array + two moving pointers.
 */
function twoPointer(inputArray) {
  const arr = inputArray.length > 1 ? [...inputArray].sort((a, b) => a - b) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const target = arr[Math.floor(arr.length / 3)] + arr[Math.floor(2 * arr.length / 3)];
  let left = 0;
  let right = arr.length - 1;

  const steps = [];
  let stepNum = 1;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Two-Pointer on sorted array [${arr.join(', ')}]. Target sum = ${target}. left=0, right=${right}.`,
    state: { elements: [...arr], variables: { left, right, target } },
    dataStructures: {
      array: { elements: [...arr], highlighted: [left, right], label: 'Sorted Array' },
      pointerState: { left: `${left} (${arr[left]})`, right: `${right} (${arr[right]})`, sum: arr[left] + arr[right], target, label: 'Pointers' },
      resultList: { elements: [], highlighted: [], label: 'Found Pairs' },
    },
    highlightIndices: [left, right],
    activeElements: [],
  });

  const foundPairs = [];
  while (left < right) {
    const sum = arr[left] + arr[right];

    steps.push({
      stepNumber: stepNum++,
      operation: sum === target ? 'found' : sum < target ? 'move_left' : 'move_right',
      description: sum === target
        ? `arr[${left}] + arr[${right}] = ${arr[left]} + ${arr[right]} = ${sum} = target! Found pair (${arr[left]}, ${arr[right]}).`
        : sum < target
          ? `arr[${left}] + arr[${right}] = ${arr[left]} + ${arr[right]} = ${sum} < ${target}. Move left pointer right to increase sum.`
          : `arr[${left}] + arr[${right}] = ${arr[left]} + ${arr[right]} = ${sum} > ${target}. Move right pointer left to decrease sum.`,
      state: { elements: [...arr], variables: { left, right, sum, target } },
      dataStructures: {
        array: { elements: [...arr], highlighted: [left, right], label: 'Sorted Array' },
        pointerState: { left: `${left} (${arr[left]})`, right: `${right} (${arr[right]})`, sum, target, label: 'Pointers' },
        resultList: { elements: foundPairs.map(([a, b]) => `(${a},${b})`), highlighted: [], label: 'Found Pairs' },
      },
      highlightIndices: [left, right],
      activeElements: [left, right],
    });

    if (sum === target) {
      foundPairs.push([arr[left], arr[right]]);
      left++;
      right--;
    } else if (sum < target) {
      left++;
    } else {
      right--;
    }
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Two-Pointer complete! Found ${foundPairs.length} pair(s) with sum = ${target}: ${foundPairs.map(([a, b]) => `(${a},${b})`).join(', ') || 'none'}.`,
    state: { elements: [...arr], variables: {} },
    dataStructures: {
      array: { elements: [...arr], highlighted: [], label: 'Sorted Array' },
      pointerState: { left: 'done', right: 'done', sum: '-', target, label: 'Pointers' },
      resultList: { elements: foundPairs.map(([a, b]) => `(${a},${b})`), highlighted: foundPairs.map((_, i) => i), label: 'Found Pairs' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, resultArray: foundPairs.flat() };
}

/**
 * Sliding Window — find maximum sum subarray of size k.
 * Shows Array with window highlight + running sum.
 */
function slidingWindow(inputArray) {
  const arr = inputArray.length > 2 ? [...inputArray] : [2, 1, 5, 1, 3, 2, 7, 4];
  const k = Math.min(3, Math.floor(arr.length / 2));

  const steps = [];
  let stepNum = 1;
  let windowSum = 0;
  let maxSum = 0;
  let maxStart = 0;

  // Compute initial window
  for (let i = 0; i < k; i++) windowSum += arr[i];
  maxSum = windowSum;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Sliding Window of size ${k} on [${arr.join(', ')}]. Initial window sum = ${windowSum}.`,
    state: { elements: [...arr], variables: { k, windowSum, maxSum } },
    dataStructures: {
      array: { elements: [...arr], highlighted: Array.from({ length: k }, (_, i) => i), label: 'Array' },
      pointerState: { windowStart: 0, windowEnd: k - 1, sum: windowSum, maxSum, label: 'Window State' },
      resultList: { elements: [`Sum: ${windowSum}`], highlighted: [0], label: 'Window Sums' },
    },
    highlightIndices: Array.from({ length: k }, (_, i) => i),
    activeElements: [],
  });

  const sums = [windowSum];

  for (let i = k; i < arr.length; i++) {
    const removed = arr[i - k];
    const added = arr[i];
    windowSum = windowSum - removed + added;
    sums.push(windowSum);

    steps.push({
      stepNumber: stepNum++,
      operation: windowSum > maxSum ? 'new_max' : 'slide',
      description: `Slide window: remove arr[${i - k}]=${removed}, add arr[${i}]=${added}. Sum = ${windowSum - removed + removed} - ${removed} + ${added} = ${windowSum}.${windowSum > maxSum ? ' New max!' : ''}`,
      state: { elements: [...arr], variables: { windowStart: i - k + 1, windowEnd: i, removed, added, windowSum } },
      dataStructures: {
        array: { elements: [...arr], highlighted: Array.from({ length: k }, (_, j) => i - k + 1 + j), label: 'Array' },
        pointerState: { windowStart: i - k + 1, windowEnd: i, sum: windowSum, maxSum: Math.max(maxSum, windowSum), label: 'Window State' },
        resultList: { elements: sums.map((s) => `${s}`), highlighted: [sums.length - 1], label: 'Window Sums' },
      },
      highlightIndices: Array.from({ length: k }, (_, j) => i - k + 1 + j),
      activeElements: [i, i - k],
    });

    if (windowSum > maxSum) {
      maxSum = windowSum;
      maxStart = i - k + 1;
    }
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Sliding Window complete! Max sum = ${maxSum} at window [${maxStart}..${maxStart + k - 1}] = [${arr.slice(maxStart, maxStart + k).join(', ')}].`,
    state: { elements: [...arr], variables: {} },
    dataStructures: {
      array: { elements: [...arr], highlighted: Array.from({ length: k }, (_, i) => maxStart + i), label: 'Array' },
      pointerState: { windowStart: maxStart, windowEnd: maxStart + k - 1, sum: maxSum, maxSum, label: 'Window State' },
      resultList: { elements: sums.map((s) => `${s}`), highlighted: [sums.indexOf(maxSum)], label: 'Window Sums' },
    },
    highlightIndices: Array.from({ length: k }, (_, i) => maxStart + i),
    activeElements: [],
  });

  return { steps, resultArray: [maxSum] };
}

/**
 * HashMap / Frequency counting animation.
 * Shows Array + HashMap being built step by step.
 */
function hashMapCount(inputArray) {
  const arr = inputArray.length > 0 ? [...inputArray] : [1, 3, 2, 1, 4, 1, 3, 2];
  const map = {};
  const steps = [];
  let stepNum = 1;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Counting frequency of elements in [${arr.join(', ')}] using HashMap.`,
    state: { elements: [...arr], variables: {} },
    dataStructures: {
      array: { elements: [...arr], highlighted: [], label: 'Input Array' },
      map: { entries: {}, highlighted: [], label: 'HashMap (Frequency)' },
      resultList: { elements: [], highlighted: [], label: 'Entries' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    map[val] = (map[val] || 0) + 1;

    steps.push({
      stepNumber: stepNum++,
      operation: 'put',
      description: `Process arr[${i}] = ${val}. map[${val}] = ${map[val]}. HashMap: {${Object.entries(map).map(([k, v]) => `${k}:${v}`).join(', ')}}.`,
      state: { elements: [...arr], variables: { i, val, count: map[val] } },
      dataStructures: {
        array: { elements: [...arr], highlighted: [i], label: 'Input Array' },
        map: { entries: { ...map }, highlighted: [String(val)], label: 'HashMap (Frequency)' },
        resultList: { elements: Object.entries(map).map(([k, v]) => `${k}→${v}`), highlighted: [Object.keys(map).indexOf(String(val))], label: 'Entries' },
      },
      highlightIndices: [i],
      activeElements: [i],
    });
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `HashMap counting complete! Frequencies: {${Object.entries(map).map(([k, v]) => `${k}:${v}`).join(', ')}}.`,
    state: { elements: [...arr], variables: {} },
    dataStructures: {
      array: { elements: [...arr], highlighted: [], label: 'Input Array' },
      map: { entries: { ...map }, highlighted: [], label: 'HashMap (Frequency)' },
      resultList: { elements: Object.entries(map).map(([k, v]) => `${k}→${v}`), highlighted: Object.keys(map).map((_, i) => i), label: 'Entries' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, resultArray: arr };
}

/**
 * Set operations animation — demonstrates add, has, delete.
 * Shows Array + Set side by side.
 */
function setOperations(inputArray) {
  const arr = inputArray.length > 0 ? [...inputArray] : [3, 1, 4, 1, 5, 9, 2, 6, 5, 3];
  const set = new Set();
  const steps = [];
  let stepNum = 1;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Building a Set from [${arr.join(', ')}] to find unique elements.`,
    state: { elements: [...arr], variables: {} },
    dataStructures: {
      array: { elements: [...arr], highlighted: [], label: 'Input Array' },
      set: { elements: [], highlighted: [], label: 'Set (Unique)' },
      resultList: { elements: [], highlighted: [], label: 'Duplicates Found' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    const isDuplicate = set.has(val);

    if (isDuplicate) {
      duplicates.push(val);
      steps.push({
        stepNumber: stepNum++,
        operation: 'duplicate',
        description: `arr[${i}] = ${val} already in set → duplicate! Set unchanged: {${[...set].join(', ')}}.`,
        state: { elements: [...arr], variables: { i, val, isDuplicate: true } },
        dataStructures: {
          array: { elements: [...arr], highlighted: [i], label: 'Input Array' },
          set: { elements: [...set], highlighted: [], label: 'Set (Unique)' },
          resultList: { elements: [...duplicates], highlighted: [duplicates.length - 1], label: 'Duplicates Found' },
        },
        highlightIndices: [i],
        activeElements: [i],
      });
    } else {
      set.add(val);
      steps.push({
        stepNumber: stepNum++,
        operation: 'add',
        description: `arr[${i}] = ${val} not in set → add it. Set: {${[...set].join(', ')}}.`,
        state: { elements: [...arr], variables: { i, val, isDuplicate: false } },
        dataStructures: {
          array: { elements: [...arr], highlighted: [i], label: 'Input Array' },
          set: { elements: [...set], highlighted: [[...set].length - 1], label: 'Set (Unique)' },
          resultList: { elements: [...duplicates], highlighted: [], label: 'Duplicates Found' },
        },
        highlightIndices: [i],
        activeElements: [],
      });
    }
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Set operations complete! Unique: {${[...set].join(', ')}}. Duplicates: [${duplicates.join(', ')}].`,
    state: { elements: [...set], variables: {} },
    dataStructures: {
      array: { elements: [...arr], highlighted: [], label: 'Input Array' },
      set: { elements: [...set], highlighted: [...set].map((_, i) => i), label: 'Set (Unique)' },
      resultList: { elements: [...duplicates], highlighted: [], label: 'Duplicates Found' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, resultArray: [...set] };
}

/**
 * String reverse animation.
 * Shows the string being reversed character by character with two pointers.
 */
function stringReverse(inputArray) {
  const str = inputArray.length > 0 ? inputArray.map(String) : 'hello world'.split('');
  const chars = [...str];
  let left = 0;
  let right = chars.length - 1;

  const steps = [];
  let stepNum = 1;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Reversing string "${chars.join('')}" using two pointers. left=0, right=${right}.`,
    state: { elements: [...chars], variables: { left, right } },
    dataStructures: {
      array: { elements: [...chars], highlighted: [left, right], label: 'Character Array' },
      pointerState: { left: `${left} ('${chars[left]}')`, right: `${right} ('${chars[right]}')`, label: 'Pointers' },
      resultList: { elements: [], highlighted: [], label: 'Swapped Pairs' },
    },
    highlightIndices: [left, right],
    activeElements: [],
  });

  const swapped = [];
  while (left < right) {
    swapped.push(`${chars[left]}↔${chars[right]}`);

    steps.push({
      stepNumber: stepNum++,
      operation: 'swap',
      description: `Swap chars[${left}]='${chars[left]}' ↔ chars[${right}]='${chars[right]}'.`,
      state: { elements: [...chars], variables: { left, right } },
      dataStructures: {
        array: { elements: [...chars], highlighted: [left, right], label: 'Character Array' },
        pointerState: { left: `${left} ('${chars[left]}')`, right: `${right} ('${chars[right]}')`, label: 'Pointers' },
        resultList: { elements: [...swapped], highlighted: [swapped.length - 1], label: 'Swapped Pairs' },
      },
      highlightIndices: [left, right],
      activeElements: [left, right],
    });

    [chars[left], chars[right]] = [chars[right], chars[left]];
    left++;
    right--;
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `String reversed! Result: "${chars.join('')}".`,
    state: { elements: [...chars], variables: {} },
    dataStructures: {
      array: { elements: [...chars], highlighted: chars.map((_, i) => i), label: 'Character Array' },
      pointerState: { left: 'done', right: 'done', label: 'Pointers' },
      resultList: { elements: [...swapped], highlighted: swapped.map((_, i) => i), label: 'Swapped Pairs' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, resultArray: chars };
}

module.exports = {
  bfs,
  dfs,
  dpFibonacci,
  twoPointer,
  slidingWindow,
  hashMapCount,
  setOperations,
  stringReverse,
};
