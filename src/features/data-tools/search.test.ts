import { describe, expect, it } from "vitest";
import { allContainerIds, defaultExpanded, findByPath, jsonToTree } from "./model";
import { searchTree } from "./search";

const tree = jsonToTree({ name: "Speaking", sections: [{ name: "Part", n: 12 }, { id: "abc" }] });

describe("searchTree", () => {
  it("matches keys and values without regard to case", () => {
    expect(searchTree(tree, "SPEAK").matches).toEqual(["$.name"]);
    expect(searchTree(tree, "name").matches).toEqual(["$.name", "$.sections[0].name"]);
    expect(searchTree(tree, "abc").matches).toEqual(["$.sections[1].id"]);
  });

  it("lists the containers to open for matches deep in the tree", () => {
    const { ancestors } = searchTree(tree, "12");
    expect([...ancestors]).toEqual(["$", "$.sections", "$.sections[0]"]);
  });

  it("does not search array indexes and returns nothing for an empty term", () => {
    expect(searchTree(tree, "0").matches).toEqual([]);
    expect(searchTree(tree, "").matches).toEqual([]);
  });
});

describe("tree helpers", () => {
  it("jsonToTree records the JSON path", () => {
    const node = tree.children![1]!.children![0]!.children![1]!;
    expect(node.path).toEqual(["sections", 0, "n"]);
  });

  it("defaultExpanded opens the root and its children only", () => {
    expect([...defaultExpanded(tree)].sort()).toEqual(["$", "$.sections"]);
  });

  it("allContainerIds opens every non-empty container and honours the cap", () => {
    expect(allContainerIds(tree).size).toBe(4);
    expect(allContainerIds(tree, 2).size).toBe(2);
  });

  it("findByPath returns the node and its ancestors, or null", () => {
    const found = findByPath(tree, ["sections", 1, "id"]);
    expect(found?.node.value).toBe("abc");
    expect(found?.ancestors.map((n) => n.id)).toEqual(["$", "$.sections", "$.sections[1]"]);
    expect(findByPath(tree, ["nope"])).toBeNull();
  });
});
