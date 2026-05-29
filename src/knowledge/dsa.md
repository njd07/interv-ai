# Data Structures & Algorithms — Interview Knowledge Base

## Core Topics
Arrays, Strings, Linked Lists (singly/doubly/circular), Stacks, Queues, Deques, Hash Tables, Trees (Binary, BST, AVL, Red-Black, Segment, Fenwick), Tries, Heaps / Priority Queues, Graphs (adjacency list/matrix, BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, Topological Sort, Union-Find), Dynamic Programming (top-down memoization, bottom-up tabulation, 0/1 knapsack, unbounded knapsack, LCS, LIS, edit distance, matrix chain), Sorting (merge, quick, heap, counting, radix, bucket), Searching (binary search and variants — lower/upper bound, on answer space), Two Pointers, Sliding Window (fixed and variable), Prefix Sums, Backtracking, Bit Manipulation, Greedy, Divide and Conquer, Recursion, Tail Recursion.

## Complexity Cheatsheet
- Array access O(1), search O(n), insert/delete O(n)
- HashMap avg O(1), worst O(n)
- BST balanced O(log n) all ops; skewed O(n)
- Heap insert/extract O(log n), peek O(1), build O(n)
- BFS/DFS O(V+E); Dijkstra O((V+E) log V) with heap
- Sorting: quick/merge/heap O(n log n); counting/radix O(n+k)

## Interview Questions & Ideal Answers

### Q1. Longest substring without repeating characters
Use sliding window with a HashMap of char→last index. Expand right pointer, when a duplicate is found inside the window, move left to `max(left, lastIndex+1)`. Track max length. Time O(n), space O(min(n, charset)).

### Q2. Implement LRU Cache
Use HashMap + Doubly Linked List. HashMap key→node gives O(1) lookup; DLL maintains usage order. On get: move node to head. On put: insert/update, if over capacity evict tail. All ops O(1).

### Q3. Detect cycle in a directed graph
Two approaches. (a) DFS with 3-color marking: WHITE unvisited, GRAY in current stack, BLACK finished. Visiting a GRAY node ⇒ back edge ⇒ cycle. (b) Kahn's algorithm: repeatedly remove zero-indegree nodes; if not all nodes processed, a cycle exists. Both O(V+E).

### Q4. Find K-th largest element in an array
Min-heap of size K — push, if size > K pop, final top is answer. O(n log k). Or Quickselect average O(n), worst O(n²). Discuss tradeoff: heap is steady; quickselect is faster average but unstable.

### Q5. Reverse a linked list iteratively
Three pointers: prev=null, curr=head, next. Loop: next=curr.next; curr.next=prev; prev=curr; curr=next. Return prev. O(n) time, O(1) space.

### Q6. Merge K sorted lists
Min-heap of size K holding the head of each list. Pop smallest, append to result, push next from that list. O(N log K) where N = total nodes. Or divide-and-conquer pairwise merge: same complexity.

### Q7. Coin change — minimum coins for amount
DP. `dp[i] = min(dp[i - coin] + 1)` for each coin if `i >= coin`. Init dp[0]=0, others ∞. Time O(amount × coins), space O(amount). Discuss why greedy fails (e.g. coins=[1,3,4], amount=6).

### Q8. Longest Increasing Subsequence
O(n²) DP: dp[i] = 1 + max(dp[j]) for j<i with a[j]<a[i]. Optimal O(n log n) using patience sorting: maintain `tails[]`; for each x binary-search its lower_bound and replace. tails length = LIS length.

### Q9. Word ladder (shortest transformation)
BFS over implicit graph. Build buckets: each word's wildcard patterns (h*t, ho*, *ot) map to lists of words. From each word, enumerate patterns to find neighbors in O(L²). BFS gives shortest path. Bidirectional BFS halves cost.

### Q10. Number of islands (grid)
DFS/BFS flood fill. For each unvisited '1', increment count and sink the whole island by visiting all connected 1s (4-directional). Time O(rows*cols). Union-Find alternative gives same complexity but supports dynamic merging.

### Q11. Trapping Rain Water
Two-pointer O(n) O(1). Maintain leftMax, rightMax. Move pointer at smaller side, water = max - height[ptr]. Each cell is bounded by min(leftMax, rightMax).

### Q12. Validate Binary Search Tree
Recursive with (min, max) bounds, NOT just left<node<right which fails for grandchildren. Or inorder traversal must be strictly increasing — verify using a previous-value pointer to keep O(1) space beyond recursion.

### Q13. Serialize and deserialize a binary tree
Preorder DFS with null markers. Serialize: "1,2,#,#,3,4,#,#,5,#,#". Deserialize: split tokens, consume in order, '#' means null. Both O(n).

### Q14. Course Schedule (can finish?)
Build adjacency list from prerequisites. Detect cycle via Kahn's BFS: collect in-degree, queue zero in-degrees, decrement neighbors, count processed nodes. If count == n, no cycle, return true.

### Q15. Median of two sorted arrays — O(log(min(m,n)))
Binary search the partition on the smaller array. Find i in A and j = (m+n+1)/2 - i in B such that A[i-1] ≤ B[j] and B[j-1] ≤ A[i]. Median from max(A[i-1], B[j-1]) and/or min(A[i], B[j]) depending on parity.

### Q16. Two Sum — return indices of two numbers that add to target
Use a HashMap to store number→index as you iterate. For each num, check if `target - num` exists in map. O(n) time and space. Follow up: sorted array — use two pointers from both ends O(n) time O(1) space.

### Q17. Maximum subarray sum (Kadane's Algorithm)
Maintain currentSum and maxSum. At each element: currentSum = max(nums[i], currentSum + nums[i]). maxSum = max(maxSum, currentSum). O(n) time O(1) space. Handle all-negative arrays by initializing maxSum to nums[0].

### Q18. Implement a stack using two queues
Push O(n): enqueue to q2, dequeue all from q1 to q2, swap q1 and q2. Pop O(1): dequeue from q1. Alternative: push O(1), pop O(n) by dequeuing n-1 elements to q2, last element is the pop result, swap queues.

### Q19. Find the diameter of a binary tree
DFS post-order. For each node, calculate left height + right height (that's the path through this node). Track global max. Return max(leftHeight, rightHeight) + 1 for height. O(n) time.

### Q20. Lowest Common Ancestor in a Binary Tree
Recursive: if root is null or matches p or q, return root. Recurse left and right. If both return non-null, root is LCA. If one is null, return the other. O(n) time. For BST: compare values to go left or right, O(h) time.

### Q21. Rotate a matrix 90 degrees clockwise
Transpose the matrix (swap matrix[i][j] with matrix[j][i]), then reverse each row. In-place O(n²) time O(1) space. For counter-clockwise: reverse each row first, then transpose.

### Q22. Group Anagrams
Sort each string's characters and use as a key in a HashMap. All anagrams share the same sorted key. O(n * k log k) where k = max string length. Alternative: use character frequency count as key for O(n * k).

### Q23. Clone a graph (deep copy)
BFS or DFS with a HashMap mapping original→clone. For each node: if not cloned, create clone and add to map. For each neighbor: recurse/enqueue and link. O(V+E) time and space.

### Q24. Implement a Trie (prefix tree)
Node has children[26] (for lowercase) and isEndOfWord flag. Insert: traverse/create nodes for each char, mark end. Search: traverse, return isEndOfWord. StartsWith: traverse, return true if path exists. All ops O(L) where L = word length.

### Q25. Find all permutations of a string/array
Backtracking. Swap current index with each subsequent index, recurse, swap back. Or maintain a used[] boolean array and build permutation in a separate list. O(n! * n) time.

### Q26. Detect a cycle in a linked list (Floyd's algorithm)
Two pointers: slow moves 1 step, fast moves 2 steps. If they meet, cycle exists. To find cycle start: reset one pointer to head, move both at 1 step — they meet at cycle start. O(n) time O(1) space.

### Q27. Minimum spanning tree — Kruskal's vs Prim's
Kruskal's: sort edges by weight, pick smallest that doesn't create a cycle (Union-Find). O(E log E). Prim's: grow tree from a starting node, always pick cheapest edge to a non-tree vertex (min-heap). O((V+E) log V). Dense graph → Prim's; sparse → Kruskal's.

### Q28. Subarray sum equals K
Use prefix sum + HashMap. Store cumulative sum→count. For each index, check if (prefixSum - k) exists in map. O(n) time O(n) space. Don't confuse with sliding window — that only works for positive numbers.

### Q29. Next Greater Element
Use a monotonic decreasing stack. Iterate from right to left. For each element, pop from stack while top ≤ current. Stack top is the next greater element (or -1 if empty). Push current. O(n) time.

### Q30. Edit Distance (Levenshtein)
DP table dp[i][j] = min edits to convert word1[0..i-1] to word2[0..j-1]. If chars match: dp[i][j] = dp[i-1][j-1]. Else: 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) for delete, insert, replace. O(m*n) time and space, optimizable to O(min(m,n)) space.

## Grading Rubric (5 criteria, score each 0-10)
1. **Correctness of approach** — Does the algorithm actually solve the problem for all valid inputs?
2. **Time complexity analysis** — Did the candidate state and justify Big-O? Did they consider optimal vs. naive?
3. **Space complexity awareness** — Did they account for auxiliary memory, recursion stack, etc.?
4. **Edge case handling** — Empty input, single element, duplicates, overflow, negative numbers, cycles.
5. **Code quality and naming** — Clean structure, meaningful variables, no copy-paste, modular helpers.
