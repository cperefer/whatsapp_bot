import type Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { shoppingItems } from "../../db/schema.js";

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

const shoppingToolNames = new Set(shoppingTools.map((tool) => tool.name));

export function isShoppingTool(name: string): boolean {
  return shoppingToolNames.has(name);
}

export async function executeShoppingTool(
  name: string,
  input: Record<string, unknown>,
  userId: number,
): Promise<unknown> {
  switch (name) {
    case "add_item": {
      const item = String(input.item);
      const quantity = typeof input.quantity === "number" ? input.quantity : 1;
      await db.insert(shoppingItems).values({
        item,
        quantity,
        addedBy: userId,
        addedAt: Date.now(),
        checked: 0,
      });
      return { ok: true };
    }
    case "list_items": {
      const rows = await db.select().from(shoppingItems).where(eq(shoppingItems.checked, 0));
      return rows.map((row) => ({ item: row.item, quantity: row.quantity }));
    }
    case "check_item": {
      const item = String(input.item);
      await db
        .update(shoppingItems)
        .set({ checked: 1, checkedAt: Date.now() })
        .where(and(eq(shoppingItems.item, item), eq(shoppingItems.checked, 0)));
      return { ok: true };
    }
    case "clear_checked": {
      await db.delete(shoppingItems).where(eq(shoppingItems.checked, 1));
      return { ok: true };
    }
    default:
      throw new Error(`Unknown shopping tool: ${name}`);
  }
}
