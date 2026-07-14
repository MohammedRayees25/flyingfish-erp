export type PartySplit = {
  partyName: "Flying Fish" | "Dive Goa" | "SEI";
  guestCount: number;
  amountDue: number;
};

// Automatic cost split: the combined boat + tempo cost for a trip is shared
// across the three parties (Flying Fish / Dive Goa / SEI) in proportion to
// how many of their guests were on the boat.
export function computeBoatSharingSplits(input: {
  boatAmount: number;
  tempoAmount: number;
  ffGuests: number;
  dgGuests: number;
  seiGuests: number;
}): PartySplit[] {
  const total = input.ffGuests + input.dgGuests + input.seiGuests;
  const totalCost = input.boatAmount + input.tempoAmount;
  if (total <= 0) return [];

  const perGuest = totalCost / total;

  return (
    [
      { partyName: "Flying Fish" as const, guestCount: input.ffGuests },
      { partyName: "Dive Goa" as const, guestCount: input.dgGuests },
      { partyName: "SEI" as const, guestCount: input.seiGuests },
    ] satisfies { partyName: PartySplit["partyName"]; guestCount: number }[]
  )
    .filter((p) => p.guestCount > 0)
    .map((p) => ({
      ...p,
      amountDue: Math.round(perGuest * p.guestCount),
    }));
}
