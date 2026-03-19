import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";
import { onError } from "@apollo/client/link/error";

const MONDAY_API_TOKEN = import.meta.env.VITE_MONDAY_API_TOKEN;
const MONDAY_API_URL = "https://api.monday.com/v2";

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`,
      );
    });
  }
  if (networkError) {
    console.error(`[Network error ${operation.operationName}]:`, networkError);
  }
});

const httpLink = new HttpLink({
  uri: MONDAY_API_URL,
  headers: {
    Authorization: MONDAY_API_TOKEN,
    "Content-Type": "application/json",
  },
});

export const mondayClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      EmailValue: { keyFields: false },
      PhoneValue: { keyFields: false },
      DropdownValue: { keyFields: false },
      NumbersValue: { keyFields: false },
      LinkValue: { keyFields: false },
      LocationValue: { keyFields: false },
      TimelineValue: { keyFields: false },
      BoardRelationValue: { keyFields: false },
      StatusValue: { keyFields: false },
      LongTextValue: { keyFields: false },
      TextValue: { keyFields: false },
      DateValue: { keyFields: false },
      CheckboxValue: { keyFields: false },
      PeopleValue: { keyFields: false },
      MirrorValue: { keyFields: false },
      FileValue: { keyFields: false },
      SubtasksValue: { keyFields: false },
      Item: { keyFields: ["id"] },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: "network-only", errorPolicy: "all" },
    query: { fetchPolicy: "network-only", errorPolicy: "all" },
    mutate: { errorPolicy: "all" },
  },
});
