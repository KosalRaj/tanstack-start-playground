import { createFileRoute } from "@tanstack/react-router";
import {
  getOrScrapeStockInfo,
  type StockDetail,
} from "../../server/stocksInfonfo";
import { getStocksList, type BasicStock } from "../../server/stocks";
import { useState } from "react";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
export const Route = createFileRoute("/_dashboard/stocks")({
  loader: async () => await getStocksList(),
  component: StocksPage,
});

function StocksPage() {
  const stocks = Route.useLoaderData();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [open, setOpen] = useState(false);

  const [isPending, setIsPending] = useState(false);
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [isError, setIsError] = useState(false);

  const handleRetrieve = async () => {
    if (!selectedSymbol) return;
    setIsPending(true);
    setIsError(false);
    try {
      const result = await getOrScrapeStockInfo({ data: selectedSymbol });
      if (result.error) {
        toast.error(result.error);
        setIsError(true);
      }
      setDetail(result);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "An error occurred while fetching data.");
      setIsError(true);
      setDetail(null);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-4xl space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Nepsealpha Stock Details
        </h1>
        <p className="text-muted-foreground">
          Select a stock to retrieve live or cached details from Nepsealpha.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-sm font-medium">Select Stock Symbol</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className="w-full mt-1">
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal h-10 px-3"
              >
                {selectedSymbol
                  ? `${selectedSymbol} - ${stocks.find((s) => s.symbol === selectedSymbol)?.name?.substring(0, 30)}${(stocks.find((s) => s.symbol === selectedSymbol)?.name?.length || 0) > 30 ? "..." : ""}`
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

        <Button
          onClick={handleRetrieve}
          disabled={!selectedSymbol || isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Retrieving...
            </>
          ) : (
            "Retrieve Info"
          )}
        </Button>
      </div>

      {detail && (
        <Card className="shadow-lg border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  {detail.symbol}
                  {detail.percentChange && (
                    <Badge
                      variant={
                        detail.percentChange.includes("-")
                          ? "destructive"
                          : "default"
                      }
                      className="ml-2"
                    >
                      {detail.percentChange}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  {detail.name || "Unknown Company"}
                </CardDescription>
              </div>
              {detail.sector && (
                <Badge variant="outline" className="text-xs">
                  {detail.sector}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {detail.error ? (
              <div className="text-destructive font-semibold">
                Error scraping data: {detail.error}
              </div>
            ) : (
              <>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t">
                  {renderStat("LTP (Last Traded Price)", detail.ltp)}
                  {renderStat("Change", detail.change)}
                  {renderStat("52 Weeks High/Low", detail.fiftyTwoWeekHighLow)}
                  {renderStat("Market Cap", detail.marketCap)}
                  {renderStat("Outstanding Shares", detail.shareOutstanding)}
                  {renderStat("Open", detail.open)}
                  {renderStat("High", detail.high)}
                  {renderStat("Low", detail.low)}
                  {renderStat("Volume", detail.volume)}
                </dl>

                <div className="mt-8 border-t pt-4">
                  <h3 className="font-semibold text-lg mb-4">
                    Key Financial Metrics
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {renderStat("EPS (TTM)", detail.eps)}
                    {renderStat("PE Ratio", detail.peRatio)}
                    {renderStat("PB Ratio", detail.pbRatio)}
                    {renderStat("ROE (TTM)", detail.roe)}
                    {renderStat("Book Value", detail.bookValue)}
                  </dl>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function renderStat(label: string, value?: string) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
