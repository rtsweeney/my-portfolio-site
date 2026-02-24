import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

const isConfigured = !!(projectId && dataset)

export const client = createClient({
  projectId: projectId || 'placeholder',
  dataset: dataset || 'production',
  apiVersion,
  useCdn: true,
})

export async function safeFetch<T>(query: string, fallback: T): Promise<T> {
  if (!isConfigured) return fallback
  try {
    return await client.fetch(query)
  } catch {
    return fallback
  }
}
