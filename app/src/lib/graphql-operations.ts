import { gql } from 'graphql-request';

export const FRAGMENT_USER = gql`
  fragment UserFields on User {
    id
    name
    email
    cpf
    birthDate
    photoUrl
    role
    createdAt
  }
`;

export const MUTATION_REGISTER = gql`
  ${FRAGMENT_USER}
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        ...UserFields
      }
    }
  }
`;

export const MUTATION_LOGIN = gql`
  ${FRAGMENT_USER}
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        ...UserFields
      }
    }
  }
`;

export const QUERY_ME = gql`
  ${FRAGMENT_USER}
  query Me {
    me {
      ...UserFields
    }
  }
`;

export const QUERY_EVENTS = gql`
  query Events($filter: EventFilter) {
    events(filter: $filter) {
      id
      title
      description
      category
      coverImage
      location
      address
      status
      featured
      dates {
        id
        date
        startTime
        endTime
        lots {
          id
          name
          active
          availableQuantity
          totalQuantity
          ticketTypes {
            id
            name
            price
            audience
            maxQuantity
            soldQuantity
          }
        }
      }
    }
  }
`;

export const QUERY_EVENT = gql`
  query Event($id: ID!) {
    event(id: $id) {
      id
      title
      description
      category
      coverImage
      location
      address
      status
      featured
      producer {
        id
        user {
          id
          name
          photoUrl
        }
      }
      dates {
        id
        date
        startTime
        endTime
        lots {
          id
          name
          active
          availableQuantity
          totalQuantity
          ticketTypes {
            id
            name
            description
            price
            audience
            maxQuantity
            soldQuantity
          }
        }
      }
    }
  }
`;

export const QUERY_PRODUCER_PUBLIC_PROFILE = gql`
  query ProducerPublicProfile($producerId: ID!) {
    producerPublicProfile(producerId: $producerId) {
      producer {
        id
        user {
          id
          name
          photoUrl
        }
        companyName
      }
      events {
        id
        title
        description
        category
        coverImage
        location
        address
        status
        featured
        dates {
          id
          date
          startTime
          endTime
          lots {
            id
            name
            active
            availableQuantity
            totalQuantity
            ticketTypes {
              id
              name
              price
              audience
              maxQuantity
              soldQuantity
            }
          }
        }
      }
    }
  }
`;

export const MUTATION_UPDATE_PROFILE_PHOTO = gql`
  mutation UpdateProfilePhoto($photoBase64: String!) {
    updateProfilePhoto(photoBase64: $photoBase64) {
      id
      name
      photoUrl
    }
  }
`;

export const MUTATION_VALIDATE_TICKET = gql`
  mutation ValidateTicket($eventId: ID!, $qrCode: String!) {
    validateTicket(eventId: $eventId, qrCode: $qrCode) {
      success
      errorCode
      message
      ticket {
        id
        code
        used
        usedAt
        ticketType {
          name
        }
        owner {
          name
        }
      }
    }
  }
`;

export const QUERY_MY_TICKETS = gql`
  query MyTickets {
    myTickets {
      id
      code
      qrCode
      used
      createdAt
      event {
        id
        title
        coverImage
        location
      }
      eventDate {
        id
        date
        startTime
      }
      ticketType {
        id
        name
      }
      owner {
        id
        name
        cpf
      }
    }
  }
`;

export const MUTATION_CHECKOUT_PREVIEW = gql`
  mutation CheckoutPreview($input: CheckoutInput!) {
    checkoutPreview(input: $input) {
      checkoutId
      total
      items {
        eventTitle
        eventDate
        ticketTypeName
        quantity
        unitPrice
        subtotal
      }
    }
  }
`;

export const MUTATION_CHECKOUT_PAY = gql`
  mutation CheckoutPay($input: CheckoutPayInput!) {
    checkoutPay(input: $input) {
      success
      ticketIds
      qrCodePayload
      qrCodeNumber
      message
    }
  }
`;

// Producer
export const QUERY_PRODUCER_EVENTS = gql`
  query ProducerEvents {
    producerEvents {
      id
      title
      description
      category
      coverImage
      location
      address
      status
      featured
      dates {
        id
        date
        startTime
        endTime
        lots {
          id
          name
          active
          availableQuantity
          totalQuantity
          ticketTypes {
            id
            name
            price
            audience
            maxQuantity
            soldQuantity
          }
        }
      }
    }
  }
`;

export const MUTATION_CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      title
      status
    }
  }
`;

export const MUTATION_UPDATE_EVENT = gql`
  mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      id
      title
      status
    }
  }
`;

export const MUTATION_PUBLISH_EVENT = gql`
  mutation PublishEvent($id: ID!) {
    publishEvent(id: $id) {
      id
      status
    }
  }
`;

export const MUTATION_UPDATE_EVENT_STATUS = gql`
  mutation UpdateEventStatus($id: ID!, $status: EventStatus!) {
    updateEventStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const MUTATION_CREATE_EVENT_DATE = gql`
  mutation CreateEventDate($eventId: ID!, $input: EventDateInput!) {
    createEventDate(eventId: $eventId, input: $input) {
      id
      date
      startTime
      endTime
    }
  }
`;

export const MUTATION_CREATE_LOT = gql`
  mutation CreateLot($dateId: ID!, $input: LotInput!) {
    createLot(dateId: $dateId, input: $input) {
      id
      name
      startsAt
      endsAt
      totalQuantity
      availableQuantity
      active
    }
  }
`;

export const MUTATION_CREATE_TICKET_TYPE = gql`
  mutation CreateTicketType($lotId: ID!, $input: TicketTypeInput!) {
    createTicketType(lotId: $lotId, input: $input) {
      id
      name
      price
      audience
      maxQuantity
      soldQuantity
    }
  }
`;
