import * as fs from "node:fs";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { calculateBuyDetails, calculateSellDetails } from "../lib/nepse";
import { differenceInDays } from "date-fns";

const tradesFilePath = "db/stock-trades.json";

export type TradeType = 'buy' | 'sell';

export interface Trade {
  id: string;
  date: string; // ISO string
  type: TradeType;
  quantity: number;
  price: number;
}

export interface StockPosition {
  userId: string;
  symbol: string;
  totalUnits: number;
  avgCost: number;
  realizedProfit: number;
  startingInvestment: number;
  trades: Trade[];
}

async function readPositions(): Promise<StockPosition[]> {
  try {
    const content = await fs.promises.readFile(tradesFilePath, "utf-8").catch(() => "[]");
    const data = JSON.parse(content);
    
    // Simple migration check: if it's a flat array of trades (has symbol but no trades array)
    if (data.length > 0 && data[0].symbol && !Array.isArray(data[0].trades)) {
      console.log("Migrating flat trades to grouped positions...");
      return migrateFlatTradesToPositions(data);
    }
    
    // Ensure all positions have startingInvestment
    let migrationNeeded = false;
    for (const pos of data) {
      if (pos.startingInvestment === undefined) {
        pos.startingInvestment = 0;
        migrationNeeded = true;
      }
    }
    if (migrationNeeded) {
      await writePositions(data);
    }
    
    return data;
  } catch (err) {
    console.error("Error reading positions:", err);
    return [];
  }
}

function migrateFlatTradesToPositions(flatTrades: any[]): StockPosition[] {
  const groups: Record<string, StockPosition> = {};

  for (const t of flatTrades) {
    const key = `${t.userId}_${t.symbol}`;
    if (!groups[key]) {
      groups[key] = {
        userId: t.userId,
        symbol: t.symbol,
        totalUnits: 0,
        avgCost: 0,
        realizedProfit: 0,
        startingInvestment: 0,
        trades: []
      };
    }
    groups[key].trades.push({
      id: t.id,
      date: t.date,
      type: t.type,
      quantity: t.quantity,
      price: t.price
    });
  }

  const positions = Object.values(groups);
  for (const pos of positions) {
    updatePositionMetrics(pos);
  }
  return positions;
}

function updatePositionMetrics(position: StockPosition) {
  let currentQty = 0;
  let currentWaccTotal = 0;
  let realizedProfit = 0;

  const sortedTrades = [...position.trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstPurchaseDate = sortedTrades.find(t => t.type === 'buy')?.date;

  for (const trade of sortedTrades) {
    if (trade.type === 'buy') {
      const details = calculateBuyDetails(trade.quantity, trade.price);
      currentQty += trade.quantity;
      currentWaccTotal += details.total;
    } else {
      const avgCostPerShare = currentQty > 0 ? currentWaccTotal / currentQty : 0;
      const isLongTerm = firstPurchaseDate 
        ? differenceInDays(new Date(trade.date), new Date(firstPurchaseDate)) >= 365 
        : false;

      const details = calculateSellDetails(trade.quantity, trade.price, avgCostPerShare, isLongTerm);
      realizedProfit += details.netProfit;
      
      currentQty -= trade.quantity;
      currentWaccTotal = currentQty > 0 ? currentQty * avgCostPerShare : 0;
    }
  }

  position.totalUnits = currentQty;
  position.avgCost = currentQty > 0 ? currentWaccTotal / currentQty : 0;
  position.realizedProfit = realizedProfit;
}

async function writePositions(positions: StockPosition[]) {
  await fs.promises.writeFile(tradesFilePath, JSON.stringify(positions, null, 2), "utf-8");
}

export const getTrades = createServerFn({ method: "GET" })
  .inputValidator((symbol: string) => symbol)
  .handler(async ({ data: symbol }) => {
    const userId = getCookie("userId");
    if (!userId) return { trades: [], startingInvestment: 0 };

    const positions = await readPositions();
    const pos = positions.find(p => p.userId === userId && p.symbol === symbol);
    return {
      trades: pos ? pos.trades : [],
      startingInvestment: pos ? pos.startingInvestment : 0
    };
  });

export const addTradeFn = createServerFn({ method: "POST" })
  .inputValidator((data: { symbol: string } & Omit<Trade, 'id'>) => data)
  .handler(async ({ data }) => {
    const userId = getCookie("userId");
    if (!userId) return { success: false, error: "Unauthorized" };

    const positions = await readPositions();
    let pos = positions.find(p => p.userId === userId && p.symbol === data.symbol);
    
    if (!pos) {
      pos = {
        userId,
        symbol: data.symbol,
        totalUnits: 0,
        avgCost: 0,
        realizedProfit: 0,
        startingInvestment: 0,
        trades: []
      };
      positions.push(pos);
    }

    const newTrade: Trade = {
      id: crypto.randomUUID(),
      date: data.date,
      type: data.type,
      quantity: data.quantity,
      price: data.price,
    };

    pos.trades.push(newTrade);
    updatePositionMetrics(pos);
    
    await writePositions(positions);
    return { success: true, trade: newTrade };
  });

export const updateStartingInvestmentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { symbol: string, investment: number }) => data)
  .handler(async ({ data }) => {
    const userId = getCookie("userId");
    if (!userId) return { success: false, error: "Unauthorized" };

    const positions = await readPositions();
    let pos = positions.find(p => p.userId === userId && p.symbol === data.symbol);
    
    if (!pos) {
      pos = {
        userId,
        symbol: data.symbol,
        totalUnits: 0,
        avgCost: 0,
        realizedProfit: 0,
        startingInvestment: data.investment,
        trades: []
      };
      positions.push(pos);
    } else {
      pos.startingInvestment = data.investment;
    }

    await writePositions(positions);
    return { success: true };
  });

export const updateTradeFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string } & Partial<Omit<Trade, 'id'>>) => data)
  .handler(async ({ data }) => {
    const userId = getCookie("userId");
    if (!userId) return { success: false, error: "Unauthorized" };

    const positions = await readPositions();
    // We need to find which position contains this trade ID
    const pos = positions.find(p => p.userId === userId && p.trades.some(t => t.id === data.id));
    if (!pos) return { success: false, error: "Trade not found" };

    const tradeIndex = pos.trades.findIndex(t => t.id === data.id);
    pos.trades[tradeIndex] = { ...pos.trades[tradeIndex], ...data };
    
    updatePositionMetrics(pos);
    await writePositions(positions);
    return { success: true };
  });

export const deleteTradeFn = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const userId = getCookie("userId");
    if (!userId) return { success: false, error: "Unauthorized" };

    const positions = await readPositions();
    const pos = positions.find(p => p.userId === userId && p.trades.some(t => t.id === id));
    if (!pos) return { success: false, error: "Trade not found" };

    pos.trades = pos.trades.filter(t => t.id !== id);
    
    // If no trades left, maybe remove the position entirely?
    if (pos.trades.length === 0) {
      const idx = positions.indexOf(pos);
      positions.splice(idx, 1);
    } else {
      updatePositionMetrics(pos);
    }

    await writePositions(positions);
    return { success: true };
  });
