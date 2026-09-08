type StoredObject = { name: string; id: string | null };
interface PhotoBucket {
  list(prefix: string, options: { limit: number; offset: number; sortBy: { column: string; order: string } }): PromiseLike<{ data: StoredObject[] | null; error: unknown }>;
  remove(paths: string[]): PromiseLike<{ error: unknown }>;
}
export async function deleteAccountPhotos(bucket: PhotoBucket, userId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(userId)) throw new Error('Invalid user ID');
  const paths: string[] = [];
  const directories = [userId];
  while (directories.length) {
    const prefix = directories.pop()!;
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await bucket.list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw error;
      for (const item of data || []) {
        if (!item.name || item.name.includes('/') || item.name === '..' || item.name === '.') throw new Error('Invalid storage path');
        const path = `${prefix}/${item.name}`;
        if (item.id) paths.push(path);
        else directories.push(path);
      }
      if (!data || data.length < 100) break;
    }
  }
  // Enumerate completely first: deleting while paging would skip shifted rows.
  for (let offset = 0; offset < paths.length; offset += 1000) {
    const { error } = await bucket.remove(paths.slice(offset, offset + 1000));
    if (error) throw error;
  }
}
export const GARDEN_YEARLY_PRICE = 'price_1T99UJHzffTezY826uLS56sV';
export function isGardenSubscription(subscription: { metadata?: Record<string, string>; items: { data: { price: { id: string } }[] } }, userId: string) {
  if (subscription.metadata?.user_id && subscription.metadata.user_id !== userId) return false;
  return subscription.items.data.some(item => item.price.id === GARDEN_YEARLY_PRICE);
}
