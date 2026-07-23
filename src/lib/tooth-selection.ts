export function toggleToothSelection(selected: number[], toothNumber: number): number[] {
  return selected.includes(toothNumber)
    ? selected.filter((number) => number !== toothNumber)
    : [...selected, toothNumber];
}
