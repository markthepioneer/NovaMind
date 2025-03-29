/**
 * Base templates for common agent types
 */

export const baseTemplates = [
  {
    name: 'Customer Support Assistant',
    description: 'An agent that can handle customer inquiries and support tickets',
    category: 'business',
    basePrompt: `You are a helpful customer support assistant for {company_name}. Your goal is to assist customers with their questions and concerns in a professional and friendly manner.

Your responsibilities include:
1. Answering product-related questions
2. Troubleshooting common issues
3. Processing returns and refunds when needed
4. Escalating complex issues to human agents when necessary
5. Collecting relevant information from customers

Always be polite, empathetic, and solution-focused. If you don't know the answer to a question, acknowledge that and offer to connect the customer with someone who can help.`,
    suggestedCapabilities: [
      'text_generation',
      'knowledge_base',
      'ticket_management'
    ],
    suggestedIntegrations: [
      'zendesk',
      'intercom',
      'freshdesk'
    ],
    configTemplate: {
      company_name: 'Your Company',
      product_categories: [],
      escalation_threshold: 0.7,
      ticket_creation_enabled: true
    },
    uiTemplate: {
      type: 'chat',
      components: [
        {
          type: 'header',
          content: '{company_name} Support'
        },
        {
          type: 'chat_interface',
          placeholder: 'How can I help you today?',
          submit_button_text: 'Send'
        },
        {
          type: 'footer',
          content: '© {current_year} {company_name}'
        }
      ]
    },
    isPublic: true,
    author: 'NovaMind Team',
    version: '1.0.0'
  },
  {
    name: 'Calendar Assistant',
    description: 'An agent that helps book appointments and manage schedules',
    category: 'productivity',
    basePrompt: `You are a helpful calendar assistant for {user_name}. Your goal is to help manage their schedule, book appointments, and send reminders.

Your responsibilities include:
1. Finding available times for meetings and appointments
2. Creating new calendar events with correct details
3. Sending invitations to participants
4. Rescheduling or cancelling events when needed
5. Sending reminders about upcoming events
6. Helping prioritize tasks and manage time effectively

Always confirm the details before making changes to the calendar. Be proactive in suggesting optimal scheduling options based on the user's preferences and existing commitments.`,
    suggestedCapabilities: [
      'text_generation',
      'calendar_management',
      'email_communication'
    ],
    suggestedIntegrations: [
      'google_calendar',
      'outlook',
      'gmail'
    ],
    configTemplate: {
      user_name: 'User',
      calendar_id: 'primary',
      work_hours: {
        start: '09:00',
        end: '17:00'
      },
      days_off: ['saturday', 'sunday'],
      meeting_duration_default: 30,
      reminder_settings: {
        enabled: true,
        default_minutes_before: 15
      }
    },
    uiTemplate: {
      type: 'chat',
      components: [
        {
          type: 'header',
          content: 'Calendar Assistant'
        },
        {
          type: 'chat_interface',
          placeholder: 'What would you like to schedule?',
          submit_button_text: 'Send'
        },
        {
          type: 'calendar_widget',
          view: 'week'
        }
      ]
    },
    isPublic: true,
    author: 'NovaMind Team',
    version: '1.0.0'
  },
  {
    name: 'Content Creator',
    description: 'An agent that helps generate and optimize content for different platforms',
    category: 'marketing',
    basePrompt: `You are a content creation assistant for {company_name}. Your goal is to help create, optimize, and distribute content across various platforms.

Your responsibilities include:
1. Generating ideas for content based on trends and audience interests
2. Creating first drafts of different content types (blog posts, social media, emails)
3. Optimizing content for SEO when applicable
4. Adapting content for different platforms while maintaining consistent messaging
5. Suggesting visual elements that would complement the content
6. Helping schedule content for optimal engagement

Always aim to match the brand voice and style guidelines. Focus on creating valuable, engaging content that resonates with the target audience.`,
    suggestedCapabilities: [
      'text_generation',
      'content_optimization',
      'social_media_management'
    ],
    suggestedIntegrations: [
      'wordpress',
      'buffer',
      'hootsuite',
      'mailchimp'
    ],
    configTemplate: {
      company_name: 'Your Company',
      brand_voice: 'professional',
      target_audience: [],
      content_types: ['blog', 'social', 'email'],
      posting_frequency: {
        blog: 'weekly',
        social: 'daily',
        email: 'biweekly'
      }
    },
    uiTemplate: {
      type: 'dashboard',
      components: [
        {
          type: 'header',
          content: 'Content Creation Studio'
        },
        {
          type: 'tab_group',
          tabs: [
            {
              label: 'Content Ideas',
              content: {
                type: 'idea_generator'
              }
            },
            {
              label: 'Draft Creator',
              content: {
                type: 'text_editor'
              }
            },
            {
              label: 'Publishing',
              content: {
                type: 'scheduling_calendar'
              }
            }
          ]
        }
      ]
    },
    isPublic: true,
    author: 'NovaMind Team',
    version: '1.0.0'
  }
];
