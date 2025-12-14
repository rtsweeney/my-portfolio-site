import { defineField, defineType } from 'sanity'

export const resume = defineType({
    name: 'resume',
    title: 'Resume Experience',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Job Title',
            type: 'string',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'company',
            title: 'Company',
            type: 'string',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'startDate',
            title: 'Start Date',
            type: 'date',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'endDate',
            title: 'End Date',
            type: 'date',
            description: 'Leave blank if currently working here',
        }),
        defineField({
            name: 'isCurrent',
            title: 'Current Position',
            type: 'boolean',
            initialValue: false,
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'array',
            of: [{ type: 'block' }],
        }),
        defineField({
            name: 'location',
            title: 'Location',
            type: 'string',
        }),
    ],
    preview: {
        select: {
            title: 'title',
            subtitle: 'company',
            date: 'startDate',
        },
        prepare({ title, subtitle, date }) {
            return {
                title,
                subtitle: `${subtitle} (${date ? date.split('-')[0] : 'No date'})`,
            }
        },
    },
})
