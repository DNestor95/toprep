export function shrinkTowardPrior(
  estimate: number,
  sampleSize: number,
  priorMean: number,
  priorStrength: number
): number {
  const denominator = sampleSize + priorStrength
  if (denominator <= 0) return priorMean

  return (estimate * sampleSize + priorMean * priorStrength) / denominator
}
