const { contactsService } = require('../../services/firebaseService');
const { ForbiddenError } = require('apollo-server-express');

// Helper function to resolve the Node interface
const resolveType = (obj) => {
  if (obj.email && obj.message) {
    return 'Contact';
  }
  return null;
};

const contactResolvers = {
  Node: {
    __resolveType: resolveType
  },
  // Resolvers for custom types
  Contact: {
    id: (parent) => parent.id || parent._id,
    createdAt: (parent) => {
      if (!parent.createdAt) return new Date().toISOString();
      return parent.createdAt instanceof Date 
        ? parent.createdAt.toISOString() 
        : new Date(parent.createdAt).toISOString();
    },
    updatedAt: (parent) => {
      if (!parent.updatedAt) return null;
      return parent.updatedAt instanceof Date 
        ? parent.updatedAt.toISOString() 
        : new Date(parent.updatedAt).toISOString();
    },
  },

  // Query resolvers
  Query: {
    contacts: async (_, { status, search, first = 10, after }, { user, isAuthenticated }) => {
      try {
        if (!isAuthenticated) {
          throw new ForbiddenError('Not authorized to view contacts');
        }

        // Build query filters
        const filters = [];
        if (status) filters.push({ field: 'status', operator: '==', value: status });
        if (search) {
          filters.push({ 
            field: 'searchTerms', 
            operator: 'array-contains', 
            value: search.toLowerCase() 
          });
        }

        // Add pagination cursor if provided
        let startAfter = null;
        if (after) {
          // In a real implementation, you would decode and validate the cursor
          startAfter = after;
        }

        // Get contacts with pagination
        const { data, lastVisible, total } = await contactsService.getContacts({
          filters,
          limit: first,
          startAfter,
          orderBy: { field: 'createdAt', direction: 'desc' }
        });

        // Format response for Relay-style pagination
        const edges = data.map(contact => ({
          node: contact,
          cursor: contact.id // In a real implementation, you would encode this
        }));

        return {
          edges,
          pageInfo: {
            hasNextPage: edges.length === first,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
            totalCount: total || edges.length
          }
        };
      } catch (error) {
        console.error('Error fetching contacts:', error);
        throw new Error('Failed to fetch contacts');
      }
    },

    contact: async (_, { id }, { user, isAuthenticated }) => {
      try {
        if (!isAuthenticated) {
          throw new ForbiddenError('Not authorized to view this contact');
        }
        
        const contact = await contactsService.getContact(id);
        if (!contact) {
          throw new Error('Contact not found');
        }
        
        return contact;
      } catch (error) {
        console.error(`Error fetching contact ${id}:`, error);
        throw new Error('Failed to fetch contact');
      }
    },
  },

  // Mutation resolvers
  Mutation: {
    createContact: async (_, { input }, context) => {
      try {
        // Prepare contact data
        const contactData = {
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone ? input.phone.trim() : null,
          subject: input.subject ? input.subject.trim() : 'General Inquiry',
          message: input.message.trim(),
          status: 'NEW',
          source: 'website',
          metadata: {
            ...(input.metadata || {}),
            ipAddress: context.ip || null,
            userAgent: context.req?.get('user-agent') || null,
            referrer: context.req?.get('referer') || null,
            timestamp: new Date().toISOString()
          },
          // Create searchable terms for basic search
          searchTerms: [
            input.name.toLowerCase(),
            input.email.toLowerCase(),
            ...(input.phone ? [input.phone.replace(/\D/g, '')] : []),
            ...(input.subject ? input.subject.toLowerCase().split(/\s+/) : []),
            ...input.message.toLowerCase().split(/\s+/)
          ].filter(term => term.length > 2)
        };

        // Create the contact
        const contact = await contactsService.createContact(contactData);

        // Here you would typically send a notification email
        // await sendContactNotification(contact);

        return {
          success: true,
          message: 'Thank you for your message. We will get back to you soon!',
          contact
        };
      } catch (error) {
        console.error('Error in createContact resolver:', error);
        return {
          success: false,
          message: error.message || 'Failed to submit contact form',
          contact: null
        };
      }
    },

    updateContactStatus: async (_, { id, status }, { user, isAuthenticated }) => {
      try {
        if (!isAuthenticated) {
          throw new ForbiddenError('Not authorized to update contacts');
        }

        // Validate status
        const validStatuses = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'];
        if (!validStatuses.includes(status)) {
          throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        // Update the contact
        const updated = await contactsService.updateContactStatus(id, status);
        
        if (!updated) {
          throw new Error('Contact not found');
        }

        return {
          success: true,
          message: 'Contact status updated successfully',
          contact: updated
        };
      } catch (error) {
        console.error('Error updating contact status:', error);
        return {
          success: false,
          message: error.message || 'Failed to update contact status',
          contact: null
        };
      }
    }
  }
};

module.exports = contactResolvers;
