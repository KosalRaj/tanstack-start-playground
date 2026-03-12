import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Check,
  ChevronsUpDown,
  Plus,
  Trash2,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

import { getStocksList } from "../../server/stocks";
import {
  getTrades,
  addTradeFn,
  updateTradeFn,
  deleteTradeFn,
  updateStartingInvestmentFn,
  type Trade,
  type TradeType,
} from "../../server/trades";
import { calculateBuyDetails, calculateSellDetails } from "@/lib/nepse";

export const Route = createFileRoute("/_dashboard/calculator")({
  loader: async () => await getStocksList(),
  component: CalculatorPage,
});

function CalculatorPage() {
  const stocks = Route.useLoaderData();
  const router = useRouter();

  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [investment, setInvestment] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

  const fetchTrades = useServerFn(getTrades);
  const addTradeMutation = useServerFn(addTradeFn);
  const updateTradeMutation = useServerFn(updateTradeFn);
  const deleteTradeMutation = useServerFn(deleteTradeFn);
  const updateInvestmentMutation = useServerFn(updateStartingInvestmentFn);

  useEffect(() => {
    if (selectedSymbol) {
      loadTrades(selectedSymbol);
    } else {
      setTrades([]);
      setInvestment(0);
    }
  }, [selectedSymbol]);

  const loadTrades = async (symbol: string) => {
    setIsLoadingTrades(true);
    try {
      const data = await fetchTrades({ data: symbol });
      setTrades(data.trades);
      setInvestment(data.startingInvestment);
    } catch (error) {
      toast.error("Failed to load trades");
    } finally {
      setIsLoadingTrades(false);
    }
  };

  const handleUpdateInvestment = async (val: number) => {
    setInvestment(val);
    if (selectedSymbol) {
      try {
        await updateInvestmentMutation({
          data: { symbol: selectedSymbol, investment: val },
        });
      } catch (error) {
        toast.error("Failed to save investment");
      }
    }
  };

  const handleAddTrade = async () => {
    if (!selectedSymbol) {
      toast.error("Please select a stock first");
      return;
    }

    try {
      const result = await addTradeMutation({
        data: {
          symbol: selectedSymbol,
          date: new Date().toISOString(),
          type: "buy",
          quantity: 0,
          price: 0,
        },
      });
      if (result.success && result.trade) {
        setTrades([...trades, result.trade]);
        toast.success("Trade added");
      } else {
        toast.error(result.error || "Failed to add trade");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleRemoveTrade = async (id: string) => {
    try {
      const result = await deleteTradeMutation({ data: id });
      if (result.success) {
        setTrades(trades.filter((t) => t.id !== id));
        toast.success("Trade deleted");
      } else {
        toast.error(result.error || "Failed to delete trade");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleUpdateTrade = async (id: string, updates: Partial<Trade>) => {
    // Optimistic update
    const oldTrades = [...trades];
    setTrades(trades.map((t) => (t.id === id ? { ...t, ...updates } : t)));

    try {
      const result = await updateTradeMutation({
        data: { id, ...updates },
      });
      if (!result.success) {
        setTrades(oldTrades);
        toast.error(result.error || "Failed to update trade");
      }
    } catch (error) {
      setTrades(oldTrades);
      toast.error("An error occurred");
    }
  };

  const stats = useMemo(() => {
    let currentQty = 0;
    let currentWaccTotal = 0;
    let realizedProfit = 0;
    let totalInvested = 0;

    // For CGT calculation we need the date of first purchase in the FIFO/WACC sense
    // This is a simplified portfolio view.
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // We'll track the first purchase date for long-term calculation simplification
    const firstPurchaseDate = sortedTrades.find((t) => t.type === "buy")?.date;

    const calculatedTrades = sortedTrades.map((trade) => {
      if (trade.type === "buy") {
        const details = calculateBuyDetails(trade.quantity, trade.price);
        currentQty += trade.quantity;
        currentWaccTotal += details.total;
        totalInvested += details.total;

        return {
          ...trade,
          gross: details.purchasePrice,
          fees: details.commission + details.sebonFee + details.dpCharge,
          net: details.total,
          profit: 0,
        };
      } else {
        const avgCostPerShare =
          currentQty > 0 ? currentWaccTotal / currentQty : 0;

        // Simplified duration check: against first purchase date
        const isLongTerm = firstPurchaseDate
          ? differenceInDays(
              new Date(trade.date),
              new Date(firstPurchaseDate),
            ) >= 365
          : false;

        const details = calculateSellDetails(
          trade.quantity,
          trade.price,
          avgCostPerShare,
          isLongTerm,
        );

        realizedProfit += details.netProfit;

        // When selling, we reduce the currentWaccTotal proportionally to quantity sold
        currentQty -= trade.quantity;
        currentWaccTotal = currentQty > 0 ? currentQty * avgCostPerShare : 0;

        return {
          ...trade,
          gross: details.salesAmount,
          fees: details.totalFees,
          net: details.netReceivable,
          profit: details.netProfit,
        };
      }
    });

    const avgCost = currentQty > 0 ? currentWaccTotal / currentQty : 0;
    const remainingCash =
      investment -
      totalInvested +
      realizedProfit +
      calculatedTrades
        .filter((t) => t.type === "sell")
        .reduce((acc, t) => acc + (t.net || 0), 0);
    // Wait, the logic for remaining cash is: investment + sum(sell_net) - sum(buy_net)
    const netCash =
      investment -
      calculatedTrades
        .filter((t) => t.type === "buy")
        .reduce((acc, t) => acc + (t.net || 0), 0) +
      calculatedTrades
        .filter((t) => t.type === "sell")
        .reduce((acc, t) => acc + (t.net || 0), 0);

    return {
      calculatedTrades,
      realizedProfit,
      currentHoldingQty: currentQty,
      avgCost,
      remainingCash: netCash,
    };
  }, [trades, investment]);

  return (
    <div className="container mx-auto py-10 max-w-6xl space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          NEPSE Stock Profit Calculator
        </h1>
        <p className="text-muted-foreground">
          Accurate calculations including Brokerage, SEBON fees, DP charges, and
          CGT.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Select stock and budget</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Stock</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {selectedSymbol
                      ? stocks.find((s) => s.symbol === selectedSymbol)?.symbol
                      : "Search for a stock..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by symbol or name..." />
                    <CommandList>
                      <CommandEmpty>No stock found.</CommandEmpty>
                      <CommandGroup>
                        {stocks.map((stock) => (
                          <CommandItem
                            key={stock.symbol}
                            value={`${stock.symbol} ${stock.name}`}
                            onSelect={(currentValue) => {
                              const extractedSymbol = currentValue
                                .split(" ")[0]
                                .toUpperCase();
                              setSelectedSymbol(
                                extractedSymbol === selectedSymbol
                                  ? ""
                                  : extractedSymbol,
                              );
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedSymbol === stock.symbol
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {stock.symbol} - {stock.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="investment">Starting Investment (NPR)</Label>
              <Input
                id="investment"
                type="number"
                value={investment}
                onChange={(e) => setInvestment(Number(e.target.value))}
                onBlur={(e) => handleUpdateInvestment(Number(e.target.value))}
                placeholder="e.g. 100000"
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-xs text-blue-700 dark:text-blue-300 flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Fee Breakdown Applied:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Brokerage: 0.24% - 0.36% (tiered)</li>
                  <li>SEBON Fee: 0.015%</li>
                  <li>DP Charge: Rs. 25</li>
                  <li>CGT: 7.5% (Short) / 5% (Long)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Position Summary</CardTitle>
            <CardDescription>Net performance after all fees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="space-y-1 border-r pr-4">
                <p className="text-sm text-muted-foreground">Current Units</p>
                <p className="text-2xl font-bold">{stats.currentHoldingQty}</p>
              </div>
              <div className="space-y-1 border-r pr-4">
                <p className="text-sm text-muted-foreground">WACC (Avg Cost)</p>
                <p className="text-2xl font-bold text-primary">
                  Rs. {stats.avgCost.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1 border-r pr-4">
                <p className="text-sm text-muted-foreground">Realized Profit</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    stats.realizedProfit >= 0
                      ? "text-green-600"
                      : "text-red-600",
                  )}
                >
                  Rs. {stats.realizedProfit.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-2xl font-bold">
                  Rs. {stats.remainingCash.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Total Net Investment
                </p>
                <p className="text-xl font-bold">
                  Rs. {(investment - stats.remainingCash).toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  ROI (Realized)
                </p>
                <p
                  className={cn(
                    "text-xl font-bold",
                    stats.realizedProfit >= 0
                      ? "text-green-600"
                      : "text-red-600",
                  )}
                >
                  {investment > 0
                    ? ((stats.realizedProfit / investment) * 100).toFixed(2)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Detailed log of buys and sells</CardDescription>
          </div>
          <Button onClick={handleAddTrade} size="sm" disabled={!selectedSymbol}>
            <Plus className="mr-2 h-4 w-4" /> New Transaction
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {isLoadingTrades ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Total Fees</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Net Profit</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.calculatedTrades.map((trade) => (
                  <TableRow
                    key={trade.id}
                    className={
                      trade.type === "sell"
                        ? "bg-green-50/30 dark:bg-green-900/5"
                        : ""
                    }
                  >
                    <TableCell>
                      <DatePicker
                        date={trade.date ? new Date(trade.date) : undefined}
                        setDate={(date) =>
                          handleUpdateTrade(trade.id, {
                            date: date?.toISOString(),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={trade.type}
                        onValueChange={(value: TradeType) =>
                          handleUpdateTrade(trade.id, { type: value })
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "w-[80px] h-8 text-[10px] font-bold uppercase tracking-wider",
                            trade.type === "buy"
                              ? "border-blue-500 text-blue-500"
                              : "bg-green-600 text-white",
                          )}
                        >
                          <SelectValue placeholder="TYPE" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">BUY</SelectItem>
                          <SelectItem value="sell">SELL</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={trade.quantity}
                        onChange={(e) =>
                          handleUpdateTrade(trade.id, {
                            quantity: Number(e.target.value),
                          })
                        }
                        onBlur={(e) =>
                          handleUpdateTrade(trade.id, {
                            quantity: Number(e.target.value),
                          })
                        }
                        className="w-[80px] h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={trade.price}
                        onChange={(e) =>
                          handleUpdateTrade(trade.id, {
                            price: Number(e.target.value),
                          })
                        }
                        onBlur={(e) =>
                          handleUpdateTrade(trade.id, {
                            price: Number(e.target.value),
                          })
                        }
                        className="w-[100px] h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      Rs.
                      {trade.gross?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-red-500">
                      Rs.
                      {trade.fees?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold">
                      Rs.
                      {trade.net?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {trade.type === "sell" ? (
                        <span
                          className={cn(
                            "font-bold",
                            trade.profit >= 0
                              ? "text-green-600"
                              : "text-red-600",
                          )}
                        >
                          Rs.
                          {trade.profit.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTrade(trade.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {trades.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {selectedSymbol
                        ? "Ready to record trades."
                        : "Please select a stock symbol to begin."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <span
      className={cn(
        "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </span>
  );
}
