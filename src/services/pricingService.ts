import { Vehicle, PriceEstimate } from '../types';

export function calculateRentalPrice(
  vehicle: Vehicle,
  startISO: string,
  endISO: string
): { valid: boolean; estimate?: PriceEstimate; error?: string } {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();

  if (isNaN(start) || isNaN(end)) {
    return { valid: false, error: 'Please choose valid pickup and return dates.' };
  }

  const diffMs = end - start;
  if (diffMs <= 0) {
    return { valid: false, error: 'Return date and time must be after pickup date and time.' };
  }

  const totalHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const leftoverHours = totalHours % 24;

  let baseRate = 0;
  let pricingStrategy: 'daily' | 'hourly' = 'hourly';

  if (totalHours < 24) {
    // Under a full day: hourly rate, but cap at daily rate if cheaper
    const hourlyCost = totalHours * vehicle.pricePerHour;
    if (hourlyCost > vehicle.pricePerDay) {
      baseRate = vehicle.pricePerDay;
      pricingStrategy = 'daily';
    } else {
      baseRate = hourlyCost;
      pricingStrategy = 'hourly';
    }
  } else {
    // 24 hours or more: standard daily + remaining hourly
    const daysCost = days * vehicle.pricePerDay;
    const extraHoursCost = leftoverHours * vehicle.pricePerHour;
    // If extra hours cost exceeds a full day, cap at another full day
    const adjustedExtraCost = extraHoursCost > vehicle.pricePerDay ? vehicle.pricePerDay : extraHoursCost;
    baseRate = daysCost + adjustedExtraCost;
    pricingStrategy = 'daily';
  }

  // Fees calculation
  const serviceFee = Math.round(baseRate * 0.10); // 10% platform fee
  const billableDays = Math.max(1, Math.ceil(totalHours / 24));
  const insuranceFee = billableDays * 12; // Standard AutoGO Trip Protection ($12/day)
  const totalAmount = baseRate + serviceFee + insuranceFee;

  return {
    valid: true,
    estimate: {
      days,
      hours: leftoverHours,
      totalHours,
      baseRate,
      serviceFee,
      insuranceFee,
      totalAmount,
      pricingStrategy,
    },
  };
}
