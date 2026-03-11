import { type SchemaTypeDefinition } from 'sanity'
import { resume } from './resume'
import { photo } from './photo'
import { project } from './project'
import { blogPost } from './blogPost'
import { concert } from './concert'
import { travel } from './travel'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [resume, photo, project, blogPost, concert, travel],
}
