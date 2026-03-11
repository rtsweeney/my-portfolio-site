import { defineField, defineType } from 'sanity'

export const travel = defineType({
  name: 'travel',
  title: 'Travel',
  type: 'document',
  fields: [
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'country',
      title: 'Country',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'coordinates',
      title: 'Coordinates',
      type: 'geopoint',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date Visited',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'rating',
      title: 'Rating (1–5)',
      type: 'number',
      validation: (rule) => rule.required().min(1).max(5).integer(),
      options: {
        list: [1, 2, 3, 4, 5],
      },
    }),
    defineField({
      name: 'description',
      title: 'Description',
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
            }),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: { title: 'city', subtitle: 'country', media: 'photos.0' },
    prepare({ title, subtitle, media }) {
      return { title, subtitle, media }
    },
  },
})
