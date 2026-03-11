import { defineField, defineType } from 'sanity'

export const concert = defineType({
  name: 'concert',
  title: 'Concert',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Artist / Show Title',
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
      name: 'venue',
      title: 'Venue',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'rating',
      title: 'Star Rating',
      type: 'number',
      validation: (rule) => rule.required().min(1).max(5).integer(),
      options: {
        list: [1, 2, 3, 4, 5],
      },
    }),
    defineField({
      name: 'caption',
      title: 'Review / Caption',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              description: 'Important for accessibility.',
            }),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: { title: 'title', date: 'date', rating: 'rating', media: 'photos.0' },
    prepare({ title, date, rating, media }) {
      const stars = rating ? '★'.repeat(rating) : '—'
      return { title, subtitle: `${stars} — ${date || 'no date'}`, media }
    },
  },
})
