import * as fs from "node:fs";
import { createServerFn } from "@tanstack/react-start";

const stocksFilePath = "db/stocks.json";

export type BasicStock = {
  symbol: string;
  name: string;
};

export const getStocksList = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const content = await fs.promises.readFile(stocksFilePath, "utf-8").catch(() => "[]");
    return JSON.parse(content) as BasicStock[];
  } catch (err) {
    console.error("Error reading stocks:", err);
    return [];
  }
});
