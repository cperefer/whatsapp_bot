import type Anthropic from "@anthropic-ai/sdk";

export const shoppingTools: Anthropic.Tool[] = [
  {
    name: "add_item",
    description: "Add an item to the shared shopping list.",
    input_schema: {
      type: "object",
      properties: {
        item: { type: "string" },
        quantity: { type: "number" },
      },
      required: ["item"],
    },
  },
  {
    name: "list_items",
    description: "List all items currently on the shopping list.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "check_item",
    description: "Mark an item on the shopping list as checked/bought.",
    input_schema: {
      type: "object",
      properties: {
        item: { type: "string" },
      },
      required: ["item"],
    },
  },
  {
    name: "clear_checked",
    description: "Remove all checked items from the shopping list.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];
