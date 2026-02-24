import { defineField, defineType } from 'sanity'

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tag',
      title: 'Tag',
      type: 'string',
      options: {
        list: [
          { title: 'Update', value: 'update' },
          { title: 'Project', value: 'project' },
          { title: 'Personal', value: 'personal' },
          { title: 'Milestone', value: 'milestone' },
        ],
      },
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      date: 'date',
      tag: 'tag',
    },
    prepare({ title, date, tag }) {
      return {
        title,
        subtitle: `${tag || 'untagged'} — ${date || 'no date'}`,
      }
    },
  },
})
