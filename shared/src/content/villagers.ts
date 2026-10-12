// The villagers who run the neighboring farms, and the quest givers they are.
export const NPC_NEIGHBORS: { username: string; giver: string }[] = [
  { username: 'Mayor_Maple', giver: 'Mayor Maple' },
  { username: 'Rosie_Bunny', giver: 'Rosie' },
  { username: 'Grandma_Fern', giver: 'Grandma Fern' },
  { username: 'Penny_Pig', giver: 'Penny' },
  { username: 'Henrietta_Hen', giver: 'Henrietta' },
  { username: 'Mama_Marigold', giver: 'Mama Marigold' },
];

export function villagerFor(username: string): string | undefined {
  return NPC_NEIGHBORS.find((n) => n.username.toLowerCase() === username.toLowerCase())?.giver;
}
