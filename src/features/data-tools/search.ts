import type { TreeNode } from "./model";

export interface TreeSearch {
  /** Ids of matching nodes in document order. */
  matches: string[];
  /** The same nodes, in the same order. */
  nodes: TreeNode[];
  /** Ids of every container that must be open to show all matches. */
  ancestors: Set<string>;
}

const MAX_MATCHES = 5000;

/** Case-insensitive search of keys and scalar values; array indexes are not searched. */
export function searchTree(root: TreeNode, term: string): TreeSearch {
  const needle = term.toLowerCase();
  const result: TreeSearch = { matches: [], nodes: [], ancestors: new Set() };
  if (needle === "") return result;
  const visit = (node: TreeNode, chain: string[]) => {
    if (result.matches.length >= MAX_MATCHES) return;
    const isIndex = node.index !== undefined && /^\d+$/.test(node.label);
    const hit =
      (!isIndex && node.label.toLowerCase().includes(needle)) ||
      (node.value !== undefined && node.value.toLowerCase().includes(needle));
    if (hit) {
      result.matches.push(node.id);
      result.nodes.push(node);
      for (const id of chain) result.ancestors.add(id);
    }
    for (const child of node.children ?? []) visit(child, [...chain, node.id]);
  };
  visit(root, []);
  return result;
}
