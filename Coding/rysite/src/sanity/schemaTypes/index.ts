import { type SchemaTypeDefinition } from 'sanity'
import { resume } from './resume'
import { photo } from './photo'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [resume, photo],
}
