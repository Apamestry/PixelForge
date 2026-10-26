import { describe, it, expect } from "vitest";
import {
  editorReducer,
  initialEditorState,
  MAX_HISTORY,
} from "../editorState";
import { createNewElement } from "../dropPosition";

describe("editorState reducer", () => {
  it("initializes and sets canvas", () => {
    const customCanvas = {
      version: 1,
      width: 800,
      height: 600,
      background: "#000000",
      elements: [],
    };
    const state = editorReducer(initialEditorState, {
      type: "SET_CANVAS",
      payload: customCanvas,
    });
    expect(state.canvas.width).toBe(800);
    expect(state.canvas.height).toBe(600);
    expect(state.history.past).toHaveLength(0);
    expect(state.history.future).toHaveLength(0);
  });

  it("selects an element without adding to history", () => {
    const s1 = editorReducer(initialEditorState, {
      type: "SELECT_ELEMENT",
      payload: "elem-1",
    });
    expect(s1.selectedId).toBe("elem-1");
    expect(s1.history.past).toHaveLength(0);

    const s2 = editorReducer(s1, {
      type: "SELECT_ELEMENT",
      payload: null,
    });
    expect(s2.selectedId).toBeNull();
    expect(s2.history.past).toHaveLength(0);
  });

  it("adds an element, selects it, and records history", () => {
    const el = createNewElement("shape", { shape: "rect", id: "rect-1" });
    const s = editorReducer(initialEditorState, {
      type: "ADD_ELEMENT",
      payload: el,
    });
    expect(s.canvas.elements).toHaveLength(1);
    expect(s.canvas.elements[0].id).toBe("rect-1");
    expect(s.selectedId).toBe("rect-1");
    expect(s.history.past).toHaveLength(1);
    expect(s.history.future).toHaveLength(0);
  });

  it("updates an element and records history when coalesce is false", () => {
    const el = createNewElement("text", { id: "text-1", text: "Hello" });
    const s1 = editorReducer(initialEditorState, { type: "ADD_ELEMENT", payload: el });
    const s2 = editorReducer(s1, {
      type: "UPDATE_ELEMENT",
      payload: { ...el, text: "Updated" },
      coalesce: false,
    });
    expect(s2.canvas.elements[0].text).toBe("Updated");
    expect(s2.history.past).toHaveLength(2);
  });

  it("coalesces multiple updates (e.g. typing or dragging) into a single history entry", () => {
    const el = createNewElement("text", { id: "text-1", text: "H" });
    let s = editorReducer(initialEditorState, { type: "ADD_ELEMENT", payload: el });
    const historyLenBeforeTyping = s.history.past.length; // 1

    // Type "e", "l", "l", "o" with coalesce: true
    s = editorReducer(s, { type: "UPDATE_ELEMENT", payload: { ...el, text: "He" }, coalesce: true });
    s = editorReducer(s, { type: "UPDATE_ELEMENT", payload: { ...el, text: "Hel" }, coalesce: true });
    s = editorReducer(s, { type: "UPDATE_ELEMENT", payload: { ...el, text: "Hell" }, coalesce: true });
    s = editorReducer(s, { type: "UPDATE_ELEMENT", payload: { ...el, text: "Hello" }, coalesce: true });

    // Past history should have grown by exactly 1 entry for the whole typing session
    expect(s.history.past.length).toBe(historyLenBeforeTyping + 1);
    expect(s.canvas.elements[0].text).toBe("Hello");

    // Undo should restore the text before typing started ("H")
    const undone = editorReducer(s, { type: "UNDO" });
    expect(undone.canvas.elements[0].text).toBe("H");
  });

  it("moves and resizes elements with coalescing support", () => {
    const el = createNewElement("shape", { shape: "rect", id: "rect-1", x: 10, y: 10 });
    let s = editorReducer(initialEditorState, { type: "ADD_ELEMENT", payload: el });

    // Drag move coalesced
    s = editorReducer(s, { type: "MOVE_ELEMENT", payload: { id: "rect-1", x: 20, y: 30 }, coalesce: true });
    s = editorReducer(s, { type: "MOVE_ELEMENT", payload: { id: "rect-1", x: 50, y: 60 }, coalesce: true });
    expect(s.canvas.elements[0].x).toBe(50);
    expect(s.canvas.elements[0].y).toBe(60);

    // Resize
    s = editorReducer(s, {
      type: "RESIZE_ELEMENT",
      payload: { id: "rect-1", width: 300, height: 200 },
      coalesce: false,
    });
    expect(s.canvas.elements[0].width).toBe(300);
    expect(s.canvas.elements[0].height).toBe(200);
  });

  it("deletes an element and deselects it if selected", () => {
    const el = createNewElement("shape", { id: "shape-1" });
    let s = editorReducer(initialEditorState, { type: "ADD_ELEMENT", payload: el });
    expect(s.selectedId).toBe("shape-1");

    s = editorReducer(s, { type: "DELETE_ELEMENT", payload: "shape-1" });
    expect(s.canvas.elements).toHaveLength(0);
    expect(s.selectedId).toBeNull();
  });

  it("duplicates an element with offset and unique id", () => {
    const el = createNewElement("shape", { id: "shape-1", x: 100, y: 100, width: 200, height: 100 });
    let s = editorReducer(initialEditorState, { type: "ADD_ELEMENT", payload: el });

    s = editorReducer(s, { type: "DUPLICATE_ELEMENT", payload: "shape-1" });
    expect(s.canvas.elements).toHaveLength(2);
    const duplicate = s.canvas.elements[1];
    expect(duplicate.id).not.toBe("shape-1");
    expect(duplicate.x).toBe(120);
    expect(duplicate.y).toBe(120);
    expect(s.selectedId).toBe(duplicate.id);
  });

  it("reorders elements in z-index correctly", () => {
    const el1 = createNewElement("shape", { id: "1" });
    const el2 = createNewElement("shape", { id: "2" });
    const el3 = createNewElement("shape", { id: "3" });

    let s = editorReducer(initialEditorState, { type: "ADD_ELEMENT", payload: el1 });
    s = editorReducer(s, { type: "ADD_ELEMENT", payload: el2 });
    s = editorReducer(s, { type: "ADD_ELEMENT", payload: el3 });
    // order: [1, 2, 3]

    // Bring 1 up
    s = editorReducer(s, { type: "REORDER_ELEMENT", payload: { id: "1", direction: "up" } });
    expect(s.canvas.elements.map((e) => e.id)).toEqual(["2", "1", "3"]);

    // Send 3 to back
    s = editorReducer(s, { type: "REORDER_ELEMENT", payload: { id: "3", direction: "sendToBack" } });
    expect(s.canvas.elements.map((e) => e.id)).toEqual(["3", "2", "1"]);

    // Bring 3 to front
    s = editorReducer(s, { type: "REORDER_ELEMENT", payload: { id: "3", direction: "bringToFront" } });
    expect(s.canvas.elements.map((e) => e.id)).toEqual(["2", "1", "3"]);

    // Send 1 down
    s = editorReducer(s, { type: "REORDER_ELEMENT", payload: { id: "1", direction: "down" } });
    expect(s.canvas.elements.map((e) => e.id)).toEqual(["1", "2", "3"]);
  });

  it("sets canvas size and background with undo/redo", () => {
    let s = editorReducer(initialEditorState, {
      type: "SET_CANVAS_SIZE",
      payload: { width: 1200, height: 630 },
    });
    expect(s.canvas.width).toBe(1200);
    expect(s.canvas.height).toBe(630);

    s = editorReducer(s, {
      type: "SET_CANVAS_BACKGROUND",
      payload: "#F0F0F0",
    });
    expect(s.canvas.background).toBe("#F0F0F0");

    // Undo background
    s = editorReducer(s, { type: "UNDO" });
    expect(s.canvas.background).toBe("#FFFFFF");
    expect(s.canvas.width).toBe(1200);

    // Redo background
    s = editorReducer(s, { type: "REDO" });
    expect(s.canvas.background).toBe("#F0F0F0");
  });

  it("caps undo history at 100", () => {
    let s = initialEditorState;
    for (let i = 0; i < 110; i++) {
      s = editorReducer(s, {
        type: "SET_CANVAS_BACKGROUND",
        payload: `#${i.toString(16).padStart(6, "0")}`,
      });
    }
    expect(s.history.past.length).toBe(MAX_HISTORY);
  });
});
