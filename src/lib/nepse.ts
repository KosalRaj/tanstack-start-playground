/**
 * NEPSE Transaction Fee Constants and Logic
 */

export const SEBON_FEE_RATE = 0.00015; // 0.015%
export const DP_CHARGE = 25;
export const CGT_SHORT_TERM_RATE = 0.075; // 7.5% (< 365 days)
export const CGT_LONG_TERM_RATE = 0.05; // 5% (> 365 days)

/**
 * Calculate Broker Commission based on transaction amount (Equity)
 */
export function calculateBrokerCommission(amount: number): number {
  let rate = 0;
  if (amount <= 50000) {
    rate = 0.0036;
  } else if (amount <= 500000) {
    rate = 0.0033;
  } else if (amount <= 2000000) {
    rate = 0.0031;
  } else if (amount <= 10000000) {
    rate = 0.0027;
  } else {
    rate = 0.0024;
  }

  const commission = amount * rate;
  return amount <= 50000 ? Math.max(10, commission) : commission;
}

/**
 * Calculate total costs for a BUY transaction
 */
export function calculateBuyDetails(quantity: number, price: number) {
  const purchasePrice = quantity * price;
  if (purchasePrice === 0) return { total: 0, commission: 0, sebonFee: 0, dpCharge: 0 };
  
  const commission = calculateBrokerCommission(purchasePrice);
  const sebonFee = purchasePrice * SEBON_FEE_RATE;
  const totalCost = purchasePrice + commission + sebonFee + DP_CHARGE;
  
  return {
    purchasePrice,
    commission,
    sebonFee,
    dpCharge: DP_CHARGE,
    total: totalCost,
    costPerShare: totalCost / quantity
  };
}

/**
 * Calculate details for a SELL transaction
 */
export function calculateSellDetails(
  quantity: number, 
  price: number, 
  avgCostPerShare: number,
  isLongTerm: boolean = false
) {
  const salesAmount = quantity * price;
  if (salesAmount === 0) return { total: 0, commission: 0, sebonFee: 0, dpCharge: 0, cgt: 0, netProfit: 0 };

  const commission = calculateBrokerCommission(salesAmount);
  const sebonFee = salesAmount * SEBON_FEE_RATE;
  
  // Total costs associated with selling (excluding CGT)
  const salesFees = commission + sebonFee + DP_CHARGE;
  
  // Cost of the shares being sold (using WACC/Average Cost)
  const purchaseCostOfSoldShares = quantity * avgCostPerShare;
  
  // Profit before CGT
  const profitBeforeTax = salesAmount - purchaseCostOfSoldShares - salesFees;
  
  // CGT is only on positive profit
  const cgtRate = isLongTerm ? CGT_LONG_TERM_RATE : CGT_SHORT_TERM_RATE;
  const cgt = profitBeforeTax > 0 ? profitBeforeTax * cgtRate : 0;
  
  const netReceivable = salesAmount - salesFees - cgt;
  const netProfit = netReceivable - purchaseCostOfSoldShares;

  return {
    salesAmount,
    commission,
    sebonFee,
    dpCharge: DP_CHARGE,
    cgt,
    totalFees: salesFees + cgt,
    netReceivable,
    netProfit
  };
}
