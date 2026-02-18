import { useState, useEffect } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchStockPrice, type StockQuote } from "@/lib/stock-price";
import { canLookup, lookupsRemaining, isPro, FREE_LIMIT } from "@/lib/pro";

interface Props {
  ticker: string;
  onPriceFetched?: (price: number) => void;
}

export default function LivePriceDisplay({ ticker, onPriceFetched }: Props) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when ticker changes
  useEffect(() => {
    setQuote(null);
    setError(null);
  }, [ticker]);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    const result = await fetchStockPrice(ticker);
    setLoading(false);
    if (result.ok) {
      setQuote(result.quote);
      onPriceFetched?.(result.quote.price);
    } else {
      setError('error' in result ? result.error : "Price unavailable");
    }
  };

  const remaining = lookupsRemaining();
  const pro = isPro();
  const allowed = canLookup();

  const timeAgo = quote
    ? Math.round((Date.now() - quote.fetchedAt) / 60000)
    : null;

  return (
    <div className="space-y-2">
      {quote ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl font-mono font-bold">${quote.price.toFixed(2)}</span>
          <span
            className={`text-sm font-mono font-semibold ${
              quote.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)} ({quote.change >= 0 ? "+" : ""}
            {quote.changePercent.toFixed(1)}%)
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFetch}
            disabled={loading || !allowed}
            className="h-7 w-7 p-0"
            aria-label="Refresh price"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={handleFetch}
          disabled={loading || !allowed}
        >
          <Zap className={`mr-1.5 h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
          {loading ? "Fetching…" : "Get Live Price"}
        </Button>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {quote && timeAgo !== null && (
        <p className="text-xs text-muted-foreground">
          Updated {timeAgo < 1 ? "just now" : `${timeAgo} min ago`}
        </p>
      )}

      {!pro && (
        <p className="text-xs text-muted-foreground">
          {allowed
            ? `${remaining} of ${FREE_LIMIT} free lookups remaining`
            : "You've used all 5 free lookups today. Upgrade to Pro for unlimited!"}
        </p>
      )}
    </div>
  );
}
