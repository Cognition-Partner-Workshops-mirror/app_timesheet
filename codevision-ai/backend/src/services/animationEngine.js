/**
 * Local algorithm animation engine.
 * Generates step-by-step animation data for common algorithms
 * without requiring OpenAI API. Each algorithm produces
 * structured steps with state snapshots for the frontend player.
 */

// Generate animation steps for bubble sort
function bubbleSort(inputArray) {
  const arr = [...inputArray];
  const steps = [];
  const n = arr.length;

  steps.push({
    stepNumber: 1,
    operation: 'init',
    description: `Starting Bubble Sort with array [${arr.join(', ')}]. We will compare adjacent elements and swap if needed.`,
    state: { elements: [...arr], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  let stepNum = 2;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      // Compare step
      steps.push({
        stepNumber: stepNum++,
        operation: 'compare',
        description: `Compare arr[${j}]=${arr[j]} and arr[${j + 1}]=${arr[j + 1]}`,
        state: { elements: [...arr], variables: { i, j } },
        highlightIndices: [j, j + 1],
        activeElements: [j, j + 1],
      });

      if (arr[j] > arr[j + 1]) {
        // Swap
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        steps.push({
          stepNumber: stepNum++,
          operation: 'swap',
          description: `Swap arr[${j}]=${arr[j + 1]} and arr[${j + 1}]=${arr[j]} because ${arr[j + 1]} > ${arr[j]}`,
          state: { elements: [...arr], variables: { i, j } },
          highlightIndices: [j, j + 1],
          activeElements: [j, j + 1],
        });
      }
    }
    // Mark sorted element
    steps.push({
      stepNumber: stepNum++,
      operation: 'sorted',
      description: `Element at index ${n - i - 1} (value ${arr[n - i - 1]}) is now in its final sorted position.`,
      state: { elements: [...arr], variables: { i } },
      highlightIndices: [n - i - 1],
      activeElements: [],
    });
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Bubble Sort complete! Sorted array: [${arr.join(', ')}]`,
    state: { elements: [...arr], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, sortedArray: arr };
}

// Generate animation steps for selection sort
function selectionSort(inputArray) {
  const arr = [...inputArray];
  const steps = [];
  const n = arr.length;
  let stepNum = 1;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Starting Selection Sort with array [${arr.join(', ')}]. Find the minimum element and place it at the beginning.`,
    state: { elements: [...arr], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    steps.push({
      stepNumber: stepNum++,
      operation: 'select',
      description: `Pass ${i + 1}: Looking for minimum starting from index ${i}. Current minimum: arr[${minIdx}]=${arr[minIdx]}`,
      state: { elements: [...arr], variables: { i, minIdx } },
      highlightIndices: [i],
      activeElements: [minIdx],
    });

    for (let j = i + 1; j < n; j++) {
      steps.push({
        stepNumber: stepNum++,
        operation: 'compare',
        description: `Compare arr[${j}]=${arr[j]} with current min arr[${minIdx}]=${arr[minIdx]}`,
        state: { elements: [...arr], variables: { i, j, minIdx } },
        highlightIndices: [j, minIdx],
        activeElements: [j],
      });

      if (arr[j] < arr[minIdx]) {
        minIdx = j;
        steps.push({
          stepNumber: stepNum++,
          operation: 'new_min',
          description: `New minimum found: arr[${minIdx}]=${arr[minIdx]}`,
          state: { elements: [...arr], variables: { i, j, minIdx } },
          highlightIndices: [minIdx],
          activeElements: [minIdx],
        });
      }
    }

    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      steps.push({
        stepNumber: stepNum++,
        operation: 'swap',
        description: `Swap arr[${i}] and arr[${minIdx}]. Placing ${arr[i]} at index ${i}.`,
        state: { elements: [...arr], variables: { i, minIdx } },
        highlightIndices: [i, minIdx],
        activeElements: [i, minIdx],
      });
    }
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Selection Sort complete! Sorted array: [${arr.join(', ')}]`,
    state: { elements: [...arr], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, sortedArray: arr };
}

// Generate animation steps for insertion sort
function insertionSort(inputArray) {
  const arr = [...inputArray];
  const steps = [];
  const n = arr.length;
  let stepNum = 1;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Starting Insertion Sort with array [${arr.join(', ')}]. Build sorted portion one element at a time.`,
    state: { elements: [...arr], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;
    steps.push({
      stepNumber: stepNum++,
      operation: 'pick',
      description: `Pick element arr[${i}]=${key} to insert into the sorted portion [0..${i - 1}].`,
      state: { elements: [...arr], variables: { i, key } },
      highlightIndices: [i],
      activeElements: [i],
    });

    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      steps.push({
        stepNumber: stepNum++,
        operation: 'shift',
        description: `Shift arr[${j}]=${arr[j]} to index ${j + 1} to make room for ${key}.`,
        state: { elements: [...arr], variables: { i, j, key } },
        highlightIndices: [j, j + 1],
        activeElements: [j + 1],
      });
      j--;
    }
    arr[j + 1] = key;
    steps.push({
      stepNumber: stepNum++,
      operation: 'insert',
      description: `Insert ${key} at index ${j + 1}. Sorted portion: [${arr.slice(0, i + 1).join(', ')}]`,
      state: { elements: [...arr], variables: { i, j: j + 1, key } },
      highlightIndices: [j + 1],
      activeElements: [j + 1],
    });
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Insertion Sort complete! Sorted array: [${arr.join(', ')}]`,
    state: { elements: [...arr], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, sortedArray: arr };
}

// Generate animation steps for linear search
function linearSearch(inputArray, target) {
  const arr = [...inputArray];
  const steps = [];
  let stepNum = 1;
  const searchTarget = target !== undefined ? target : arr[Math.floor(Math.random() * arr.length)];

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Linear Search: Looking for ${searchTarget} in array [${arr.join(', ')}]. Check each element one by one.`,
    state: { elements: [...arr], variables: { target: searchTarget } },
    highlightIndices: [],
    activeElements: [],
  });

  for (let i = 0; i < arr.length; i++) {
    steps.push({
      stepNumber: stepNum++,
      operation: 'check',
      description: `Check index ${i}: arr[${i}]=${arr[i]}. Is ${arr[i]} === ${searchTarget}? ${arr[i] === searchTarget ? 'YES!' : 'No, move to next.'}`,
      state: { elements: [...arr], variables: { i, target: searchTarget } },
      highlightIndices: [i],
      activeElements: [i],
    });

    if (arr[i] === searchTarget) {
      steps.push({
        stepNumber: stepNum,
        operation: 'found',
        description: `Found ${searchTarget} at index ${i}! Search complete.`,
        state: { elements: [...arr], variables: { i, target: searchTarget } },
        highlightIndices: [i],
        activeElements: [i],
      });
      return { steps, foundIndex: i };
    }
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'not_found',
    description: `${searchTarget} not found in the array after checking all elements.`,
    state: { elements: [...arr], variables: { target: searchTarget } },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, foundIndex: -1 };
}

// Generate animation steps for binary search
function binarySearch(inputArray, target) {
  const arr = [...inputArray].sort((a, b) => a - b);
  const steps = [];
  let stepNum = 1;
  const searchTarget = target !== undefined ? target : arr[Math.floor(Math.random() * arr.length)];

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Binary Search: Looking for ${searchTarget} in sorted array [${arr.join(', ')}]. Uses divide-and-conquer.`,
    state: { elements: [...arr], variables: { target: searchTarget } },
    highlightIndices: [],
    activeElements: [],
  });

  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    steps.push({
      stepNumber: stepNum++,
      operation: 'check_mid',
      description: `Check middle: left=${left}, right=${right}, mid=${mid}, arr[mid]=${arr[mid]}. Target=${searchTarget}.`,
      state: { elements: [...arr], variables: { left, right, mid, target: searchTarget } },
      highlightIndices: [mid],
      activeElements: Array.from({ length: right - left + 1 }, (_, i) => left + i),
    });

    if (arr[mid] === searchTarget) {
      steps.push({
        stepNumber: stepNum,
        operation: 'found',
        description: `Found ${searchTarget} at index ${mid}!`,
        state: { elements: [...arr], variables: { left, right, mid, target: searchTarget } },
        highlightIndices: [mid],
        activeElements: [mid],
      });
      return { steps, foundIndex: mid };
    } else if (arr[mid] < searchTarget) {
      steps.push({
        stepNumber: stepNum++,
        operation: 'go_right',
        description: `arr[mid]=${arr[mid]} < ${searchTarget}. Search right half: left=${mid + 1}, right=${right}.`,
        state: { elements: [...arr], variables: { left: mid + 1, right, mid, target: searchTarget } },
        highlightIndices: [mid],
        activeElements: Array.from({ length: right - mid }, (_, i) => mid + 1 + i),
      });
      left = mid + 1;
    } else {
      steps.push({
        stepNumber: stepNum++,
        operation: 'go_left',
        description: `arr[mid]=${arr[mid]} > ${searchTarget}. Search left half: left=${left}, right=${mid - 1}.`,
        state: { elements: [...arr], variables: { left, right: mid - 1, mid, target: searchTarget } },
        highlightIndices: [mid],
        activeElements: Array.from({ length: mid - left }, (_, i) => left + i),
      });
      right = mid - 1;
    }
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'not_found',
    description: `${searchTarget} not found in the array.`,
    state: { elements: [...arr], variables: { target: searchTarget } },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, foundIndex: -1 };
}

// Generate animation steps for stack operations
function stackOperations(inputArray) {
  const arr = inputArray.length > 0 ? inputArray : [10, 20, 30, 40, 50];
  const steps = [];
  const stack = [];
  let stepNum = 1;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Stack: Last-In-First-Out (LIFO). We will push elements then pop them.`,
    state: { elements: [], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  // Push all elements
  for (const val of arr) {
    stack.push(val);
    steps.push({
      stepNumber: stepNum++,
      operation: 'push',
      description: `Push ${val} onto the stack. Stack: [${stack.join(', ')}]. Top = ${val}.`,
      state: { elements: [...stack], variables: { top: stack.length - 1 } },
      highlightIndices: [stack.length - 1],
      activeElements: [stack.length - 1],
    });
  }

  // Pop half the elements
  const popCount = Math.min(3, stack.length);
  for (let i = 0; i < popCount; i++) {
    const popped = stack.pop();
    steps.push({
      stepNumber: stepNum++,
      operation: 'pop',
      description: `Pop ${popped} from the stack. Stack: [${stack.join(', ')}].${stack.length > 0 ? ` New top = ${stack[stack.length - 1]}.` : ' Stack is empty.'}`,
      state: { elements: [...stack], variables: { popped, top: stack.length - 1 } },
      highlightIndices: stack.length > 0 ? [stack.length - 1] : [],
      activeElements: [],
    });
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Stack operations complete! Final stack: [${stack.join(', ')}]`,
    state: { elements: [...stack], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps };
}

// Generate animation steps for queue operations
function queueOperations(inputArray) {
  const arr = inputArray.length > 0 ? inputArray : [10, 20, 30, 40, 50];
  const steps = [];
  const queue = [];
  let stepNum = 1;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Queue: First-In-First-Out (FIFO). We will enqueue elements then dequeue them.`,
    state: { elements: [], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  for (const val of arr) {
    queue.push(val);
    steps.push({
      stepNumber: stepNum++,
      operation: 'enqueue',
      description: `Enqueue ${val}. Queue: [${queue.join(', ')}]. Front=${queue[0]}, Rear=${val}.`,
      state: { elements: [...queue], variables: { front: 0, rear: queue.length - 1 } },
      highlightIndices: [queue.length - 1],
      activeElements: [queue.length - 1],
    });
  }

  const dequeueCount = Math.min(3, queue.length);
  for (let i = 0; i < dequeueCount; i++) {
    const dequeued = queue.shift();
    steps.push({
      stepNumber: stepNum++,
      operation: 'dequeue',
      description: `Dequeue ${dequeued} from front. Queue: [${queue.join(', ')}].${queue.length > 0 ? ` New front = ${queue[0]}.` : ' Queue is empty.'}`,
      state: { elements: [...queue], variables: { dequeued, front: 0, rear: queue.length - 1 } },
      highlightIndices: queue.length > 0 ? [0] : [],
      activeElements: [],
    });
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Queue operations complete! Final queue: [${queue.join(', ')}]`,
    state: { elements: [...queue], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps };
}

// Quick sort with animation steps
function quickSort(inputArray) {
  const arr = [...inputArray];
  const steps = [];
  let stepNum = 1;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Starting Quick Sort with array [${arr.join(', ')}]. Pick a pivot, partition, then recurse.`,
    state: { elements: [...arr], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  function partition(low, high) {
    const pivot = arr[high];
    steps.push({
      stepNumber: stepNum++,
      operation: 'pivot',
      description: `Choose pivot = arr[${high}] = ${pivot}. Partition range [${low}..${high}].`,
      state: { elements: [...arr], variables: { low, high, pivot } },
      highlightIndices: [high],
      activeElements: Array.from({ length: high - low + 1 }, (_, i) => low + i),
    });

    let i = low - 1;
    for (let j = low; j < high; j++) {
      steps.push({
        stepNumber: stepNum++,
        operation: 'compare',
        description: `Compare arr[${j}]=${arr[j]} with pivot ${pivot}. ${arr[j] <= pivot ? `${arr[j]} <= ${pivot}, move to left partition.` : `${arr[j]} > ${pivot}, stay in right partition.`}`,
        state: { elements: [...arr], variables: { i, j, pivot, low, high } },
        highlightIndices: [j, high],
        activeElements: [j],
      });

      if (arr[j] <= pivot) {
        i++;
        if (i !== j) {
          [arr[i], arr[j]] = [arr[j], arr[i]];
          steps.push({
            stepNumber: stepNum++,
            operation: 'swap',
            description: `Swap arr[${i}] and arr[${j}].`,
            state: { elements: [...arr], variables: { i, j, pivot } },
            highlightIndices: [i, j],
            activeElements: [i, j],
          });
        }
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    steps.push({
      stepNumber: stepNum++,
      operation: 'place_pivot',
      description: `Place pivot ${pivot} at index ${i + 1}. Left side < pivot, right side > pivot.`,
      state: { elements: [...arr], variables: { pivotIndex: i + 1, pivot } },
      highlightIndices: [i + 1],
      activeElements: [i + 1],
    });
    return i + 1;
  }

  function qsHelper(low, high) {
    if (low < high) {
      const pi = partition(low, high);
      qsHelper(low, pi - 1);
      qsHelper(pi + 1, high);
    }
  }

  qsHelper(0, arr.length - 1);

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Quick Sort complete! Sorted array: [${arr.join(', ')}]`,
    state: { elements: [...arr], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, sortedArray: arr };
}

// Merge sort with animation steps
function mergeSort(inputArray) {
  const arr = [...inputArray];
  const steps = [];
  let stepNum = 1;

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Starting Merge Sort with array [${arr.join(', ')}]. Divide array in half, sort each half, then merge.`,
    state: { elements: [...arr], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  function msHelper(start, end) {
    if (start >= end) return;
    const mid = Math.floor((start + end) / 2);

    steps.push({
      stepNumber: stepNum++,
      operation: 'divide',
      description: `Divide [${start}..${end}] into [${start}..${mid}] and [${mid + 1}..${end}].`,
      state: { elements: [...arr], variables: { start, mid, end } },
      highlightIndices: [mid],
      activeElements: Array.from({ length: end - start + 1 }, (_, i) => start + i),
    });

    msHelper(start, mid);
    msHelper(mid + 1, end);

    // Merge
    const left = arr.slice(start, mid + 1);
    const right = arr.slice(mid + 1, end + 1);
    let i = 0, j = 0, k = start;

    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) {
        arr[k] = left[i];
        i++;
      } else {
        arr[k] = right[j];
        j++;
      }
      k++;
    }
    while (i < left.length) { arr[k] = left[i]; i++; k++; }
    while (j < right.length) { arr[k] = right[j]; j++; k++; }

    steps.push({
      stepNumber: stepNum++,
      operation: 'merge',
      description: `Merge [${left.join(', ')}] and [${right.join(', ')}] → [${arr.slice(start, end + 1).join(', ')}]`,
      state: { elements: [...arr], variables: { start, end } },
      highlightIndices: Array.from({ length: end - start + 1 }, (_, i) => start + i),
      activeElements: Array.from({ length: end - start + 1 }, (_, i) => start + i),
    });
  }

  msHelper(0, arr.length - 1);

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Merge Sort complete! Sorted array: [${arr.join(', ')}]`,
    state: { elements: [...arr], variables: {} },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, sortedArray: arr };
}

/**
 * Tree inorder traversal using stack — combined animation showing
 * Tree, Stack, and Result ArrayList changing together per step.
 * Each step includes state for all three data structures.
 */
function inorderTraversal(inputArray) {
  // Build a binary tree from the array (level-order / BFS style)
  const arr = [...inputArray];
  const nodes = arr.map((val, idx) => (val !== null ? { val, left: null, right: null, id: idx } : null));
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]) {
      const li = 2 * i + 1;
      const ri = 2 * i + 2;
      if (li < nodes.length) nodes[i].left = nodes[li];
      if (ri < nodes.length) nodes[i].right = nodes[ri];
    }
  }
  const root = nodes[0] || null;

  const steps = [];
  let stepNum = 1;
  const stack = [];
  const result = [];

  // Helper to snapshot tree node ids that are highlighted
  const treeSnapshot = () => nodes.filter(n => n).map(n => n.val);
  const stackSnapshot = () => stack.map(n => n.val);

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Starting Inorder Traversal. Tree: [${arr.join(', ')}]. Stack is empty. Result list is empty.`,
    state: {
      elements: treeSnapshot(),
      variables: { curr: root ? root.val : 'null' },
    },
    dataStructures: {
      tree: { nodes: arr, highlighted: [], label: 'Binary Tree' },
      stack: { elements: [], highlighted: [], label: 'Stack (leftEnds)' },
      resultList: { elements: [], highlighted: [], label: 'ArrayList (inorder)' },
    },
    highlightIndices: root ? [nodes.indexOf(root)] : [],
    activeElements: [],
  });

  let curr = root;
  while (stack.length > 0 || curr !== null) {
    // Push left nodes onto stack
    while (curr !== null) {
      stack.push(curr);
      const nodeIdx = nodes.indexOf(curr);
      steps.push({
        stepNumber: stepNum++,
        operation: 'push',
        description: `Push node ${curr.val} onto stack. Stack: [${stackSnapshot().join(', ')}]. Moving to left child.`,
        codeLineHighlight: 7, // leftEnds.push(curr)
        state: {
          elements: treeSnapshot(),
          variables: { curr: curr.val },
        },
        dataStructures: {
          tree: { nodes: arr, highlighted: [nodeIdx], label: 'Binary Tree' },
          stack: { elements: stackSnapshot(), highlighted: [stack.length - 1], label: 'Stack (leftEnds)' },
          resultList: { elements: [...result], highlighted: [], label: 'ArrayList (inorder)' },
        },
        highlightIndices: [nodeIdx],
        activeElements: [nodeIdx],
      });
      curr = curr.left;
    }

    // Pop from stack
    curr = stack.pop();
    const nodeIdx = nodes.indexOf(curr);
    steps.push({
      stepNumber: stepNum++,
      operation: 'pop',
      description: `Pop node ${curr.val} from stack. Stack: [${stackSnapshot().join(', ')}].`,
      codeLineHighlight: 10, // curr=leftEnds.pop()
      state: {
        elements: treeSnapshot(),
        variables: { curr: curr.val },
      },
      dataStructures: {
        tree: { nodes: arr, highlighted: [nodeIdx], label: 'Binary Tree' },
        stack: { elements: stackSnapshot(), highlighted: stack.length > 0 ? [stack.length - 1] : [], label: 'Stack (leftEnds)' },
        resultList: { elements: [...result], highlighted: [], label: 'ArrayList (inorder)' },
      },
      highlightIndices: [nodeIdx],
      activeElements: [nodeIdx],
    });

    // Add to result
    result.push(curr.val);
    steps.push({
      stepNumber: stepNum++,
      operation: 'add_result',
      description: `Add ${curr.val} to result list. Result: [${result.join(', ')}]. Moving to right child.`,
      codeLineHighlight: 11, // inorder.add(curr.val)
      state: {
        elements: treeSnapshot(),
        variables: { curr: curr.val },
      },
      dataStructures: {
        tree: { nodes: arr, highlighted: [nodeIdx], label: 'Binary Tree' },
        stack: { elements: stackSnapshot(), highlighted: [], label: 'Stack (leftEnds)' },
        resultList: { elements: [...result], highlighted: [result.length - 1], label: 'ArrayList (inorder)' },
      },
      highlightIndices: [nodeIdx],
      activeElements: [],
    });

    curr = curr.right;
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Inorder Traversal complete! Result: [${result.join(', ')}]`,
    state: {
      elements: [...result],
      variables: {},
    },
    dataStructures: {
      tree: { nodes: arr, highlighted: [], label: 'Binary Tree' },
      stack: { elements: [], highlighted: [], label: 'Stack (leftEnds)' },
      resultList: { elements: [...result], highlighted: [], label: 'ArrayList (inorder)' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, resultArray: result };
}

/**
 * Preorder traversal using stack — combined animation with Tree + Stack + Result.
 */
function preorderTraversal(inputArray) {
  const arr = [...inputArray];
  const nodes = arr.map((val, idx) => (val !== null ? { val, left: null, right: null, id: idx } : null));
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]) {
      const li = 2 * i + 1;
      const ri = 2 * i + 2;
      if (li < nodes.length) nodes[i].left = nodes[li];
      if (ri < nodes.length) nodes[i].right = nodes[ri];
    }
  }
  const root = nodes[0] || null;
  if (!root) return { steps: [], resultArray: [] };

  const steps = [];
  let stepNum = 1;
  const stack = [root];
  const result = [];

  const treeSnapshot = () => nodes.filter(n => n).map(n => n.val);
  const stackSnapshot = () => stack.map(n => n.val);

  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    description: `Starting Preorder Traversal. Push root ${root.val} onto stack.`,
    state: { elements: treeSnapshot(), variables: {} },
    dataStructures: {
      tree: { nodes: arr, highlighted: [0], label: 'Binary Tree' },
      stack: { elements: [root.val], highlighted: [0], label: 'Stack' },
      resultList: { elements: [], highlighted: [], label: 'Result' },
    },
    highlightIndices: [0],
    activeElements: [],
  });

  while (stack.length > 0) {
    const curr = stack.pop();
    const nodeIdx = nodes.indexOf(curr);
    result.push(curr.val);

    steps.push({
      stepNumber: stepNum++,
      operation: 'visit',
      description: `Pop ${curr.val}, add to result. Result: [${result.join(', ')}].`,
      state: { elements: treeSnapshot(), variables: { curr: curr.val } },
      dataStructures: {
        tree: { nodes: arr, highlighted: [nodeIdx], label: 'Binary Tree' },
        stack: { elements: stackSnapshot(), highlighted: [], label: 'Stack' },
        resultList: { elements: [...result], highlighted: [result.length - 1], label: 'Result' },
      },
      highlightIndices: [nodeIdx],
      activeElements: [nodeIdx],
    });

    // Push right then left (so left is processed first)
    if (curr.right) {
      stack.push(curr.right);
      steps.push({
        stepNumber: stepNum++,
        operation: 'push',
        description: `Push right child ${curr.right.val} onto stack. Stack: [${stackSnapshot().join(', ')}].`,
        state: { elements: treeSnapshot(), variables: {} },
        dataStructures: {
          tree: { nodes: arr, highlighted: [nodes.indexOf(curr.right)], label: 'Binary Tree' },
          stack: { elements: stackSnapshot(), highlighted: [stack.length - 1], label: 'Stack' },
          resultList: { elements: [...result], highlighted: [], label: 'Result' },
        },
        highlightIndices: [nodes.indexOf(curr.right)],
        activeElements: [],
      });
    }
    if (curr.left) {
      stack.push(curr.left);
      steps.push({
        stepNumber: stepNum++,
        operation: 'push',
        description: `Push left child ${curr.left.val} onto stack. Stack: [${stackSnapshot().join(', ')}].`,
        state: { elements: treeSnapshot(), variables: {} },
        dataStructures: {
          tree: { nodes: arr, highlighted: [nodes.indexOf(curr.left)], label: 'Binary Tree' },
          stack: { elements: stackSnapshot(), highlighted: [stack.length - 1], label: 'Stack' },
          resultList: { elements: [...result], highlighted: [], label: 'Result' },
        },
        highlightIndices: [nodes.indexOf(curr.left)],
        activeElements: [],
      });
    }
  }

  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    description: `Preorder Traversal complete! Result: [${result.join(', ')}]`,
    state: { elements: [...result], variables: {} },
    dataStructures: {
      tree: { nodes: arr, highlighted: [], label: 'Binary Tree' },
      stack: { elements: [], highlighted: [], label: 'Stack' },
      resultList: { elements: [...result], highlighted: [], label: 'Result' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, resultArray: result };
}

/**
 * Linked list reversal animation — combined visualization showing:
 *   1. Linked List: nodes with arrows showing next pointers
 *   2. Pointers: curr, prev, temp pointer positions
 *   3. Result: the reversed list building up
 *
 * Animates the classic iterative reversal algorithm:
 *   prev = null, curr = head
 *   while (curr != null): temp = curr.next; curr.next = prev; prev = curr; curr = temp
 */
function linkedListReversal(inputArray) {
  const arr = [...inputArray];
  const steps = [];
  let stepNum = 1;

  // Build a linked list from the input array
  // Each node: { val, nextIdx } — nextIdx is the index of the next node (-1 for null)
  const nodes = arr.map((val, idx) => ({
    val,
    nextIdx: idx < arr.length - 1 ? idx + 1 : -1,
  }));

  // Helper: snapshot the linked list as array of { val, nextIdx } for the frontend
  const listSnapshot = () => nodes.map(n => ({ val: n.val, nextIdx: n.nextIdx }));

  // Helper: follow the linked list from a given index and return the values in order
  const listFromIdx = (startIdx) => {
    const result = [];
    let idx = startIdx;
    const visited = new Set();
    while (idx !== -1 && !visited.has(idx)) {
      visited.add(idx);
      result.push(nodes[idx].val);
      idx = nodes[idx].nextIdx;
    }
    return result;
  };

  // Initial state: head → 1 → 2 → 3 → 4 → 5 → null
  steps.push({
    stepNumber: stepNum++,
    operation: 'init',
    codeLineHighlight: null,
    description: `Starting Linked List Reversal. List: ${arr.join(' → ')} → null. Set curr = head (${arr[0]}), prev = null.`,
    state: { elements: [...arr], variables: { curr: arr[0], prev: 'null', temp: 'null' } },
    dataStructures: {
      linkedList: { nodes: listSnapshot(), highlighted: [0], pointers: { curr: 0, prev: -1, temp: -1 }, label: 'Linked List' },
      pointerState: { curr: arr[0], prev: 'null', temp: 'null', label: 'Pointers' },
      resultList: { elements: [], highlighted: [], label: 'Reversed List' },
    },
    highlightIndices: [0],
    activeElements: [],
  });

  // Simulate: prev = null, curr = head (index 0)
  let currIdx = 0;
  let prevIdx = -1;

  while (currIdx !== -1) {
    const currVal = nodes[currIdx].val;
    const tempIdx = nodes[currIdx].nextIdx;
    const tempVal = tempIdx !== -1 ? nodes[tempIdx].val : 'null';

    // Step: temp = curr.next
    steps.push({
      stepNumber: stepNum++,
      operation: 'assign',
      codeLineHighlight: null,
      description: `temp = curr.next → temp points to ${tempVal}. Saving reference to next node before we break the link.`,
      state: {
        elements: [...arr],
        variables: { curr: currVal, prev: prevIdx !== -1 ? nodes[prevIdx].val : 'null', temp: tempVal },
      },
      dataStructures: {
        linkedList: {
          nodes: listSnapshot(),
          highlighted: tempIdx !== -1 ? [currIdx, tempIdx] : [currIdx],
          pointers: { curr: currIdx, prev: prevIdx, temp: tempIdx },
          label: 'Linked List',
        },
        pointerState: { curr: currVal, prev: prevIdx !== -1 ? nodes[prevIdx].val : 'null', temp: tempVal, label: 'Pointers' },
        resultList: { elements: listFromIdx(prevIdx !== -1 ? prevIdx : -1).reverse().reverse(), highlighted: [], label: 'Reversed Portion' },
      },
      highlightIndices: tempIdx !== -1 ? [currIdx, tempIdx] : [currIdx],
      activeElements: [],
    });

    // Step: curr.next = prev (reverse the link)
    nodes[currIdx].nextIdx = prevIdx;
    steps.push({
      stepNumber: stepNum++,
      operation: 'reverse_link',
      codeLineHighlight: null,
      description: `curr.next = prev → Node ${currVal} now points to ${prevIdx !== -1 ? nodes[prevIdx].val : 'null'}. Link reversed!`,
      state: {
        elements: [...arr],
        variables: { curr: currVal, prev: prevIdx !== -1 ? nodes[prevIdx].val : 'null', temp: tempVal },
      },
      dataStructures: {
        linkedList: {
          nodes: listSnapshot(),
          highlighted: [currIdx],
          pointers: { curr: currIdx, prev: prevIdx, temp: tempIdx },
          label: 'Linked List',
        },
        pointerState: { curr: currVal, prev: prevIdx !== -1 ? nodes[prevIdx].val : 'null', temp: tempVal, label: 'Pointers' },
        resultList: { elements: listFromIdx(currIdx), highlighted: [0], label: 'Reversed Portion' },
      },
      highlightIndices: [currIdx],
      activeElements: [currIdx],
    });

    // Step: prev = curr
    prevIdx = currIdx;
    steps.push({
      stepNumber: stepNum++,
      operation: 'move_prev',
      codeLineHighlight: null,
      description: `prev = curr → prev now points to node ${currVal}. Moving prev forward.`,
      state: {
        elements: [...arr],
        variables: { curr: currVal, prev: currVal, temp: tempVal },
      },
      dataStructures: {
        linkedList: {
          nodes: listSnapshot(),
          highlighted: [prevIdx],
          pointers: { curr: currIdx, prev: prevIdx, temp: tempIdx },
          label: 'Linked List',
        },
        pointerState: { curr: currVal, prev: currVal, temp: tempVal, label: 'Pointers' },
        resultList: { elements: listFromIdx(prevIdx), highlighted: [], label: 'Reversed Portion' },
      },
      highlightIndices: [prevIdx],
      activeElements: [],
    });

    // Step: curr = temp
    currIdx = tempIdx;
    const newCurrVal = currIdx !== -1 ? nodes[currIdx].val : 'null';
    steps.push({
      stepNumber: stepNum++,
      operation: 'move_curr',
      codeLineHighlight: null,
      description: `curr = temp → curr now points to ${newCurrVal}. Moving to the next unprocessed node.`,
      state: {
        elements: [...arr],
        variables: { curr: newCurrVal, prev: nodes[prevIdx].val, temp: tempVal },
      },
      dataStructures: {
        linkedList: {
          nodes: listSnapshot(),
          highlighted: currIdx !== -1 ? [currIdx, prevIdx] : [prevIdx],
          pointers: { curr: currIdx, prev: prevIdx, temp: -1 },
          label: 'Linked List',
        },
        pointerState: { curr: newCurrVal, prev: nodes[prevIdx].val, temp: tempVal, label: 'Pointers' },
        resultList: { elements: listFromIdx(prevIdx), highlighted: [], label: 'Reversed Portion' },
      },
      highlightIndices: currIdx !== -1 ? [currIdx] : [],
      activeElements: [],
    });
  }

  // Final step — reversal complete
  const reversedList = listFromIdx(prevIdx);
  steps.push({
    stepNumber: stepNum,
    operation: 'complete',
    codeLineHighlight: null,
    description: `Linked List Reversal complete! curr is null, so loop ends. Return prev. Reversed list: ${reversedList.join(' → ')} → null`,
    state: { elements: reversedList, variables: {} },
    dataStructures: {
      linkedList: {
        nodes: listSnapshot(),
        highlighted: Array.from({ length: arr.length }, (_, i) => i),
        pointers: { curr: -1, prev: prevIdx, temp: -1 },
        label: 'Linked List (Reversed)',
      },
      pointerState: { curr: 'null', prev: nodes[prevIdx].val, temp: 'null', label: 'Pointers' },
      resultList: { elements: reversedList, highlighted: reversedList.map((_, i) => i), label: 'Reversed List' },
    },
    highlightIndices: [],
    activeElements: [],
  });

  return { steps, resultArray: reversedList };
}

// Default sample arrays for different algorithms
const DEFAULT_ARRAYS = {
  sorting: [64, 34, 25, 12, 22, 11, 90],
  searching: [11, 22, 25, 34, 64, 78, 90],
  stack: [10, 20, 30, 40, 50],
  queue: [10, 20, 30, 40, 50],
  fibonacci: [0, 1, 1, 2, 3, 5, 8, 13],
  tree: [1, 2, 3, 4, 5, 6, 7],
  linkedList: [1, 2, 3, 4, 5],
};

// Map algorithm type to generator function
const ALGORITHM_MAP = {
  bubble_sort: { fn: bubbleSort, type: 'sorting', name: 'Bubble Sort', complexity: { time: 'O(n²)', space: 'O(1)' } },
  selection_sort: { fn: selectionSort, type: 'sorting', name: 'Selection Sort', complexity: { time: 'O(n²)', space: 'O(1)' } },
  insertion_sort: { fn: insertionSort, type: 'sorting', name: 'Insertion Sort', complexity: { time: 'O(n²)', space: 'O(1)' } },
  merge_sort: { fn: mergeSort, type: 'sorting', name: 'Merge Sort', complexity: { time: 'O(n log n)', space: 'O(n)' } },
  quick_sort: { fn: quickSort, type: 'sorting', name: 'Quick Sort', complexity: { time: 'O(n log n) avg', space: 'O(log n)' } },
  linear_search: { fn: linearSearch, type: 'searching', name: 'Linear Search', complexity: { time: 'O(n)', space: 'O(1)' } },
  binary_search: { fn: binarySearch, type: 'searching', name: 'Binary Search', complexity: { time: 'O(log n)', space: 'O(1)' } },
  stack_operations: { fn: stackOperations, type: 'stack', name: 'Stack Operations', complexity: { time: 'O(1) per op', space: 'O(n)' } },
  queue_operations: { fn: queueOperations, type: 'queue', name: 'Queue Operations', complexity: { time: 'O(1) per op', space: 'O(n)' } },
  inorder_traversal: { fn: inorderTraversal, type: 'tree', name: 'Inorder Traversal', complexity: { time: 'O(n)', space: 'O(h)' }, combined: true },
  preorder_traversal: { fn: preorderTraversal, type: 'tree', name: 'Preorder Traversal', complexity: { time: 'O(n)', space: 'O(h)' }, combined: true },
  linked_list_reversal: { fn: linkedListReversal, type: 'linkedList', name: 'Linked List Reversal', complexity: { time: 'O(n)', space: 'O(1)' }, combined: true },
};

/**
 * Generate animation steps for a given algorithm.
 * Returns structured data the frontend AnimationPlayer can consume.
 */
function generateLocalAnimation(algorithmType, inputData) {
  const config = ALGORITHM_MAP[algorithmType];
  if (!config) {
    return null; // Unknown algorithm — caller can fall back to AI
  }

  // Parse input data or use defaults
  let arr;
  if (inputData && Array.isArray(inputData) && inputData.length > 0) {
    arr = inputData.map(Number).filter(n => !isNaN(n));
  } else if (typeof inputData === 'string' && inputData.trim()) {
    arr = inputData.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
  }
  if (!arr || arr.length === 0) {
    arr = DEFAULT_ARRAYS[config.type] || DEFAULT_ARRAYS.sorting;
  }

  const result = config.fn(arr);

  return {
    algorithmName: config.name,
    algorithmType,
    dataStructureType: config.combined ? 'combined' : config.type,
    initialState: { elements: config.type === 'searching' ? [...arr].sort((a, b) => a - b) : [...(inputData && Array.isArray(inputData) && inputData.length > 0 ? inputData.map(Number) : arr)] },
    steps: result.steps,
    complexity: config.complexity,
    totalSteps: result.steps.length,
    combined: !!config.combined,
  };
}

module.exports = { generateLocalAnimation, ALGORITHM_MAP };
