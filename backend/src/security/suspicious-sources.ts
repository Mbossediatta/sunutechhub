export function getSuspiciousSources(
  events: Array<{ sourceIp: string | null }>,
) {
  const failedByIp = new Map<string, number>();
  for (const event of events) {
    if (event.sourceIp) {
      failedByIp.set(event.sourceIp, (failedByIp.get(event.sourceIp) ?? 0) + 1);
    }
  }
  return [...failedByIp.entries()]
    .filter(([, attempts]) => attempts >= 5)
    .map(([sourceIp, attempts]) => ({ sourceIp, attempts }))
    .sort((left, right) => right.attempts - left.attempts)
    .slice(0, 20);
}
