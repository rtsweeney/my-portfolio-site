import { type SchemaTypeDefinition } from 'sanity'
import { resume } from './resume'
import { photo } from './photo'
import { project } from './project'
import { blogPost } from './blogPost'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [resume, photo, project, blogPost],
}
