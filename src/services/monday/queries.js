import { gql } from "@apollo/client";

/**
 * Standard fragment for basic item data.
 */
export const ITEM_BASIC_FRAGMENT = gql`
  fragment ItemBasic on Item {
    id
    name
    group {
      id
      title
      color
    }
    created_at
    updated_at
  }
`;

/**
 * Fetches everything for a specific board.
 */
export const FETCH_BOARD_DATA = gql`
  query GetBoardData($boardId: [ID!]) {
    boards(ids: $boardId) {
      id
      name
      groups {
        id
        title
        color
      }
      columns {
        id
        title
        type
        settings_str
      }
      items_page(limit: 100) {
        items {
          id
          name
          group {
            id
            title
          }
          column_values {
            id
            text
            value
            ... on StatusValue {
              label
              index
            }
            ... on BoardRelationValue {
              display_value
            }
            ... on MirrorValue {
              display_value
            }
            ... on CheckboxValue {
              value
            }
            ... on DropdownValue {
              text
            }
          }
          created_at
          updated_at
        }
      }
    }
  }
`;

export const FETCH_TIME_ENTRIES = gql`
  query FetchTimeEntries($boardId: ID!, $colIds: [String!]) {
    boards(ids: [$boardId]) {
      items_page(limit: 100) {
        items {
          id
          name
          group {
            id
            title
          }
          column_values(ids: $colIds) {
            id
            text
            value
          }
        }
      }
    }
  }
`;

export const FETCH_EXPENSES = gql`
  query FetchExpenses($boardId: ID!, $groupId: String!, $colIds: [String!]) {
    boards(ids: [$boardId]) {
      groups(ids: [$groupId]) {
        items_page(limit: 100) {
          items {
            id
            name
            column_values(ids: $colIds) {
              id
              text
              value
            }
          }
        }
      }
    }
  }
`;
