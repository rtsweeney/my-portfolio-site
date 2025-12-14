import { defineField, defineType } from 'sanity'

export const photo = defineType({
    name: 'photo',
    title: 'Gallery Photo',
    type: 'document',
    fields: [
        defineField({
            name: 'image',
            title: 'Image',
            type: 'image',
            options: {
                hotspot: true,
            },
            fields: [
                {
                    name: 'alt',
                    type: 'string',
                    title: 'Alternative Text',
                    description: 'Important for SEO and accessibility.',
                },
            ],
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'title',
            title: 'Title / Caption',
            type: 'string',
        }),
        defineField({
            name: 'dateTaken',
            title: 'Date Taken',
            type: 'date',
        }),
    ],
    preview: {
        select: {
            title: 'title',
            media: 'image',
        },
    },
})
