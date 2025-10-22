// schemas/order.js
export default {
  name: 'order',
  title: 'Order',
  type: 'document',
  fields: [
    { name: 'customerName', title: 'Customer Name', type: 'string', validation: Rule => Rule.required() },
    { name: 'phone', title: 'Phone Number', type: 'string', validation: Rule => Rule.required() },
    { name: 'altPhone', title: 'Alt Phone/Landmark', type: 'string' },
    { name: 'address', title: 'Shipping Address', type: 'string', validation: Rule => Rule.required() },
    { name: 'city', title: 'City', type: 'string', validation: Rule => Rule.required() },
    { name: 'pincode', title: 'Pincode', type: 'string', validation: Rule => Rule.required() },
    { name: 'state', title: 'State', type: 'string', validation: Rule => Rule.required() }, // You might want a dropdown list here later
    { name: 'orderDetails', title: 'Order Details/Items', type: 'text', validation: Rule => Rule.required() },
    { name: 'comments', title: 'Comments/Notes', type: 'text' },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'New Submission', value: 'FormFilled' },
          { title: 'Pending', value: 'Pending' },
          { title: 'TO-DO', value: 'ToDo' },
          { title: 'Done', value: 'Processing' }, // Matched your label
          { title: 'Shipped/Dispatched', value: 'Dispatched' },
        ],
      },
      initialValue: 'FormFilled',
      validation: Rule => Rule.required()
    },
    // Sanity adds _createdAt and _updatedAt automatically
  ],
  initialValue: {
    status: 'FormFilled'
  },
  orderings: [ // Optional: Define default sorting in the Studio
    {
      title: 'Submission Date, Newest First',
      name: 'submissionDateDesc',
      by: [{field: '_createdAt', direction: 'desc'}]
    }
  ],
  preview: { // Optional: Customize how orders look in the Studio list
    select: {
      title: 'customerName',
      subtitle: 'orderDetails',
      status: 'status',
      createdAt: '_createdAt'
    },
    prepare({ title, subtitle, status, createdAt }) {
      const date = new Date(createdAt).toLocaleDateString();
      return {
        title: `${title} (${status})`,
        subtitle: `${subtitle?.substring(0, 30)}... - ${date}`
      }
    }
  }
}
