import { gql } from "@apollo/client";

/**
 * Fragment for created item response.
 */
export const CREATED_ITEM_FRAGMENT = gql`
  fragment CreatedItem on Item {
    id
    name
    group {
      id
      title
      color
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
    }
    created_at
    updated_at
  }
`;

export const CREATE_ITEM = gql`
  mutation CreateItem(
    $boardId: ID!
    $groupId: String!
    $name: String!
    $cv: JSON!
  ) {
    create_item(
      board_id: $boardId
      group_id: $groupId
      item_name: $name
      column_values: $cv
    ) {
      ...CreatedItem
    }
  }
  ${CREATED_ITEM_FRAGMENT}
`;

export const UPDATE_ITEM_COLUMNS = gql`
  mutation UpdateItemColumns($boardId: ID!, $itemId: ID!, $cv: JSON!) {
    change_multiple_column_values(
      board_id: $boardId
      item_id: $itemId
      column_values: $cv
    ) {
      id
    }
  }
`;

export const UPDATE_ITEM_NAME = gql`
  mutation UpdateItemName($boardId: ID!, $itemId: ID!, $name: String!) {
    change_simple_column_value(
      board_id: $boardId
      item_id: $itemId
      column_id: "name"
      value: $name
    ) {
      id
    }
  }
`;

export const SET_RELATION_COLUMN = gql`
  mutation SetRelation(
    $boardId: ID!
    $itemId: ID!
    $columnId: String!
    $value: JSON!
  ) {
    change_column_value(
      board_id: $boardId
      item_id: $itemId
      column_id: $columnId
      value: $value
    ) {
      id
    }
  }
`;
