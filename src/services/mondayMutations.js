import { mondayClient } from './mondayAPI';
import { gql } from '@apollo/client';

const BOARD_IDS = {
  CUSTOMERS:     '18400951947',
  LOCATIONS:     '18400965227',
  WORK_ORDERS:   '18402613691',
  EQUIPMENT:     '18403226725',
  TIME_ENTRIES:  '18406939306',
  EXPENSES:      '18406939432',
  INVOICE_ITEMS: '18403393439',
};

const GROUP_IDS = {
  CUSTOMERS_ACTIVE:   'topics',
  LOCATIONS_ACTIVE:   'topics',
  EQUIPMENT_ACTIVE:   'topics',
  TIME_ENTRIES_OPEN:  'topics',
  EXPENSES_PENDING:   'topics',
};

export const COL = {
  CUSTOMERS: {
    EMAIL:            'email_mm0rhasv',
    PHONE:            'phone_mm0rpam7',
    ACCOUNT_NUMBER:   'text_mm0ryhr9',
    STATUS:           'color_mm0rjkns',
    BILLING_ADDRESS:  'long_text_mm0r9ndz',
    BILLING_TERMS:    'dropdown_mm0r9ywe',
    XERO_CONTACT_ID:  'text_mm0rdxmk',
    XERO_SYNC_STATUS: 'color_mm0rxh2b',
    NOTES:            'long_text_mm0rppk5',
  },
  LOCATIONS: {
    STREET_ADDRESS:  'text_mm0r64n',
    CITY:            'text_mm0rv9zr',
    STATE:           'dropdown_mm0r9ajj',
    ZIP:             'text_mm0rrexv',
    STATUS:          'color_mm0rrea',
    NOTES:           'long_text_mm0rns1x',
    WORK_ORDERS_REL: 'board_relation_mm14vzq7',
    CUSTOMERS_REL:   'board_relation_mm18fk7h',
    EQUIPMENTS_REL:  'board_relation_mm19zxd8',
  },
  WORK_ORDERS: {
    CUSTOMER:          'board_relation_mm14ngb2',
    LOCATION:          'board_relation_mm14fdpt',
    DESCRIPTION:       'long_text_mm14ee7h',
    STATUS:            'color_mm14pf0q',
    TECHNICIAN:        'multiple_person_mm14sesj',
    SCHEDULED_DATE:    'date_mm14sjdg',
    MULTI_DAY:         'boolean_mm14act2',
    SERVICE_HISTORY:   'long_text_mm15p7rk',
    WORK_PERFORMED:    'long_text_mm15kfzp',
    EXECUTION_STATUS:  'color_mm1s7ak1',
    PARTS_ORDERED:     'color_mm1bs0w7',
    WORKORDER_ID:      'text_mm1s82bz',
    EQUIPMENTS_REL:    'board_relation_mm19cxzv',
    INVOICE_ITEMS_REL: 'board_relation_mm1ady0r',
  },
  // Equipment board (id: 18403226725)
  EQUIPMENT: {
    LOCATION:          'board_relation_mm19trhn',
    CUSTOMER_MIRROR:   'lookup_mm19dq9a',
    MANUFACTURER:      'text_mm19e8jk',
    MODEL_NUMBER:      'text_mm19j9gf',
    SERIAL_NUMBER:     'text_mm19epvj',
    INSTALL_DATE:      'date_mm19k1md',
    STATUS:            'color_mm19my9y',
    NOTES:             'long_text_mm1915x3',
    WORK_ORDERS_REL:   'board_relation_mm19qvrd',
    SERVICE_HISTORY:   'lookup_mm19r6xz',
    LAST_SERVICE_DATE: 'lookup_mm19zknx',
  },
  // Time Entries board (id: 18406939306)
  TIME_ENTRIES: {
    TOTAL_HOURS:     'numeric_mm21p49k',
    CLOCK_IN:        'date_mm21zkpj',
    CLOCK_OUT:       'date_mm2155gg',
    TASK_TYPE:       'dropdown_mm21wscp',    // Job=1, Non-Job=2
    WORK_ORDERS_REL: 'board_relation_mm21aenv',
    TECHNICIANS:     'multiple_person_mm21m56s',
    LOCATIONS_REL:   'board_relation_mm21vtd1',
    EXPENSES_ADDED:  'boolean_mm212dcy',
  },
  // Expenses board (id: 18406939432)
  EXPENSES: {
    TECHNICIAN:   'multiple_person_mm212yhb',
    RECEIPT:      'file_mm21j7d7',
    DESCRIPTION:  'text_mm213m15',
    EXPENSE_TYPE: 'dropdown_mm215jhc',  // Fuel=1, Lodging=2, Meals=3, Supplies=4
    WORK_ORDER:   'text_mm218mcp',
    AMOUNT:       'numeric_mm21a0kv',
  },
  // Invoice Line Items board (id: 18403393439)
  INVOICE_ITEMS: {
    WORK_ORDERS_REL:  'board_relation_mm1ae4as',
    CUSTOMER_MIRROR:  'lookup_mm1ag56m',
    LOCATION_MIRROR:  'lookup_mm1ac07c',
    ITEM_TYPE:        'dropdown_mm1ae5fd',
    QUANTITY:         'numeric_mm1ab4nj',
    UNIT_PRICE:       'numeric_mm1a6h84',
    TOTAL:            'formula_mm1astxs',
    BILLING_STATUS:   'color_mm1ae7q7',
    INVOICE_ID:       'text_mm1ay1cy',
    DESCRIPTION:      'long_text_mm1cdk36',
    REVENUE_ACCOUNT:  'color_mm1csz5m',
  },
};

function esc(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// Monday.com sometimes returns a temporary "c{timestamp}" ID before an item is
// fully committed. Guard all update mutations against these non-numeric IDs.
function isValidMondayId(id) {
  return id && /^\d+$/.test(String(id));
}

// ── Customers ──────────────────────────────────────────────────────────────────

export async function apiCreateCustomer(form) {
  console.log('API: Creating customer with form:', form);
  const cv = {};
  if (form.email)          cv[COL.CUSTOMERS.EMAIL]           = { text: form.email, email: form.email };
  if (form.phone)          cv[COL.CUSTOMERS.PHONE]           = { phone: form.phone, countryShortName: 'US' };
  if (form.accountNumber)  cv[COL.CUSTOMERS.ACCOUNT_NUMBER]  = form.accountNumber;
  if (form.billingAddress) cv[COL.CUSTOMERS.BILLING_ADDRESS] = { text: form.billingAddress };
  if (form.status)         cv[COL.CUSTOMERS.STATUS]          = { label: form.status };
  if (form.notes)          cv[COL.CUSTOMERS.NOTES]           = { text: form.notes };

  console.log('API: Column values prepared:', cv);

  const { data, errors } = await mondayClient.mutate({
    mutation: gql`
      mutation {
        create_item(
          board_id: ${BOARD_IDS.CUSTOMERS}
          group_id: "${GROUP_IDS.CUSTOMERS_ACTIVE}"
          item_name: "${esc(form.name)}"
          column_values: "${esc(JSON.stringify(cv))}"
        ) { id name }
      }
    `,
  });
  
  if (errors?.length) {
    console.error('API: Monday Error creating customer:', errors);
    throw new Error(errors[0].message);
  }
  console.log('API: Customer created successfully:', data.create_item);
  return data.create_item;
}

export async function apiUpdateCustomer(itemId, form) {
  if (!isValidMondayId(itemId)) {
    throw new Error(`Cannot update customer: item is still being created (id="${itemId}"). Please try again in a moment.`);
  }
  const cv = {};
  if (form.email !== undefined)          cv[COL.CUSTOMERS.EMAIL]           = { text: form.email, email: form.email };
  if (form.phone !== undefined)          cv[COL.CUSTOMERS.PHONE]           = { phone: form.phone, countryShortName: 'US' };
  if (form.accountNumber !== undefined)  cv[COL.CUSTOMERS.ACCOUNT_NUMBER]  = form.accountNumber;
  if (form.billingAddress !== undefined) cv[COL.CUSTOMERS.BILLING_ADDRESS] = { text: form.billingAddress };
  if (form.billingTerms !== undefined)   cv[COL.CUSTOMERS.BILLING_TERMS]   = form.billingTerms ? { labels: [form.billingTerms] } : { ids: [] };
  if (form.xeroContactId !== undefined)  cv[COL.CUSTOMERS.XERO_CONTACT_ID] = form.xeroContactId;
  if (form.xeroSyncStatus !== undefined) cv[COL.CUSTOMERS.XERO_SYNC_STATUS]= { label: form.xeroSyncStatus || '' };
  if (form.status !== undefined)         cv[COL.CUSTOMERS.STATUS]          = { label: form.status || '' };
  if (form.notes !== undefined)          cv[COL.CUSTOMERS.NOTES]           = { text: form.notes };

  const { data, errors } = await mondayClient.mutate({
    mutation: gql`
      mutation {
        change_multiple_column_values(
          board_id: ${BOARD_IDS.CUSTOMERS}
          item_id: ${itemId}
          column_values: "${esc(JSON.stringify(cv))}"
        ) { id }
      }
    `,
  });
  if (errors?.length) throw new Error(errors[0].message);

  if (form.name) {
    await mondayClient.mutate({
      mutation: gql`
        mutation {
          change_simple_column_value(
            board_id: ${BOARD_IDS.CUSTOMERS}
            item_id: ${itemId}
            column_id: "name"
            value: "${esc(form.name)}"
          ) { id }
        }
      `,
    });
  }
}

// ── Locations ──────────────────────────────────────────────────────────────────

export async function apiCreateLocation(form) {
  const cv = {};
  if (form.streetAddress) cv[COL.LOCATIONS.STREET_ADDRESS] = form.streetAddress;
  if (form.city)          cv[COL.LOCATIONS.CITY]           = form.city;
  if (form.zip)            cv[COL.LOCATIONS.ZIP]            = form.zip;
  if (form.locationStatus) cv[COL.LOCATIONS.STATUS]         = { label: form.locationStatus };
  if (form.notes)          cv[COL.LOCATIONS.NOTES]          = { text: form.notes };

  const { data } = await mondayClient.mutate({
    mutation: gql`
      mutation {
        create_item(
          board_id: ${BOARD_IDS.LOCATIONS}
          group_id: "${GROUP_IDS.LOCATIONS_ACTIVE}"
          item_name: "${esc(form.name)}"
          column_values: "${esc(JSON.stringify(cv))}"
        ) { id name }
      }
    `,
  });
  return data.create_item;
}

export async function apiUpdateLocation(itemId, form) {
  if (!isValidMondayId(itemId)) {
    throw new Error(`Cannot update location: item is still being created (id="${itemId}"). Please try again in a moment.`);
  }
  const cv = {};
  if (form.streetAddress !== undefined)  cv[COL.LOCATIONS.STREET_ADDRESS] = form.streetAddress;
  if (form.city !== undefined)           cv[COL.LOCATIONS.CITY]           = form.city;
  if (form.zip !== undefined)            cv[COL.LOCATIONS.ZIP]            = form.zip;
  if (form.notes !== undefined)          cv[COL.LOCATIONS.NOTES]          = { text: form.notes };
  if (form.state !== undefined)          cv[COL.LOCATIONS.STATE]          = form.state ? { labels: [form.state] } : { ids: [] };
  if (form.locationStatus !== undefined) cv[COL.LOCATIONS.STATUS]         = { label: form.locationStatus || '' };

  const { data, errors } = await mondayClient.mutate({
    mutation: gql`
      mutation {
        change_multiple_column_values(
          board_id: ${BOARD_IDS.LOCATIONS}
          item_id: ${itemId}
          column_values: "${esc(JSON.stringify(cv))}"
        ) { id }
      }
    `,
  });
  if (errors?.length) throw new Error(errors[0].message);

  if (form.name) {
    await mondayClient.mutate({
      mutation: gql`
        mutation {
          change_simple_column_value(
            board_id: ${BOARD_IDS.LOCATIONS}
            item_id: ${itemId}
            column_id: "name"
            value: "${esc(form.name)}"
          ) { id }
        }
      `,
    });
  }
}

// ── Equipment ─────────────────────────────────────────────────────────────────

export async function apiCreateEquipment(form) {
  const cv = {};
  if (form.manufacturer) cv[COL.EQUIPMENT.MANUFACTURER]  = form.manufacturer;
  if (form.modelNumber)  cv[COL.EQUIPMENT.MODEL_NUMBER]  = form.modelNumber;
  if (form.serialNumber) cv[COL.EQUIPMENT.SERIAL_NUMBER] = form.serialNumber;
  if (form.installDate)  cv[COL.EQUIPMENT.INSTALL_DATE]  = { date: form.installDate };
  if (form.status)       cv[COL.EQUIPMENT.STATUS]        = { label: form.status };
  if (form.notes)        cv[COL.EQUIPMENT.NOTES]         = { text: form.notes };

  if (form.locationId) {
    cv[COL.EQUIPMENT.LOCATION] = { 
      linkedPulseIds: [{ linkedPulseId: parseInt(form.locationId) }] 
    };
  }

  const { data, errors } = await mondayClient.mutate({
    mutation: gql`
      mutation {
        create_item(
          board_id: ${BOARD_IDS.EQUIPMENT}
          group_id: "${GROUP_IDS.EQUIPMENT_ACTIVE}"
          item_name: "${esc(form.name)}"
          column_values: "${esc(JSON.stringify(cv))}"
        ) { id name }
      }
    `,
  });

  if (errors?.length) {
    throw new Error(errors[0].message);
  }

  return data.create_item;
}

export async function apiUpdateEquipment(itemId, form) {
  if (!isValidMondayId(itemId)) {
    throw new Error(`Cannot update equipment: item is still being created (id="${itemId}"). Please try again in a moment.`);
  }
  const cv = {};
  if (form.manufacturer !== undefined) cv[COL.EQUIPMENT.MANUFACTURER]  = form.manufacturer;
  if (form.modelNumber !== undefined)  cv[COL.EQUIPMENT.MODEL_NUMBER]  = form.modelNumber;
  if (form.serialNumber !== undefined) cv[COL.EQUIPMENT.SERIAL_NUMBER] = form.serialNumber;
  if (form.installDate !== undefined)  cv[COL.EQUIPMENT.INSTALL_DATE]  = form.installDate ? { date: form.installDate } : { date: null };
  if (form.status !== undefined)       cv[COL.EQUIPMENT.STATUS]        = { label: form.status || '' };
  if (form.notes !== undefined)        cv[COL.EQUIPMENT.NOTES]         = { text: form.notes };
  
  if (form.locationId) {
    cv[COL.EQUIPMENT.LOCATION] = { 
      linkedPulseIds: [{ linkedPulseId: parseInt(form.locationId) }] 
    };
  }

  const { data, errors } = await mondayClient.mutate({
    mutation: gql`
      mutation {
        change_multiple_column_values(
          board_id: ${BOARD_IDS.EQUIPMENT}
          item_id: ${itemId}
          column_values: "${esc(JSON.stringify(cv))}"
        ) { id }
      }
    `,
  });
  if (errors?.length) throw new Error(errors[0].message);

  if (form.name) {
    await mondayClient.mutate({
      mutation: gql`
        mutation {
          change_simple_column_value(
            board_id: ${BOARD_IDS.EQUIPMENT}
            item_id: ${itemId}
            column_id: "name"
            value: "${esc(form.name)}"
          ) { id }
        }
      `,
    });
  }
}

// Sets the Location board_relation column on an Equipment item.
export async function apiSetEquipmentLocation(equipmentId, locationId) {
  const value = locationId
    ? JSON.stringify({ linkedPulseIds: [{ linkedPulseId: parseInt(locationId) }] })
    : JSON.stringify({ linkedPulseIds: [] });

  await mondayClient.mutate({
    mutation: gql`
      mutation {
        change_column_value(
          board_id: ${BOARD_IDS.EQUIPMENT}
          item_id: ${equipmentId}
          column_id: "${COL.EQUIPMENT.LOCATION}"
          value: "${esc(value)}"
        ) { id }
      }
    `,
  });
}

// ── Work Order Relations ───────────────────────────────────────────────────────

export async function apiCreateWorkOrder(form) {
  const cv = {};
  if (form.description) cv[COL.WORK_ORDERS.DESCRIPTION] = { text: form.description };
  if (form.status)      cv[COL.WORK_ORDERS.STATUS]      = { label: form.status };
  
  // Board relations require linkedPulseIds
  if (form.customerId) {
    cv[COL.WORK_ORDERS.CUSTOMER] = { 
      linkedPulseIds: [{ linkedPulseId: parseInt(form.customerId) }] 
    };
  }
  if (form.locationId) {
    cv[COL.WORK_ORDERS.LOCATION] = { 
      linkedPulseIds: [{ linkedPulseId: parseInt(form.locationId) }] 
    };
  }

  const { data, errors } = await mondayClient.mutate({
    mutation: gql`
      mutation {
        create_item(
          board_id: ${BOARD_IDS.WORK_ORDERS}
          group_id: "${form.groupId || 'topics'}"
          item_name: "${esc(form.name)}"
          column_values: "${esc(JSON.stringify(cv))}"
        ) {
          id
          name
          group { id title color }
          column_values {
            id
            text
            value
            ... on StatusValue { label index }
            ... on BoardRelationValue { display_value }
          }
          created_at
          updated_at
        }
      }
    `,
  });

  if (errors?.length) {
    throw new Error(errors[0].message);
  }

  return data.create_item;
}

export async function apiSetWorkOrderRelation(workOrderId, itemId, columnId) {
  const value = itemId
    ? JSON.stringify({ linkedPulseIds: [{ linkedPulseId: parseInt(itemId) }] })
    : JSON.stringify({ linkedPulseIds: [] });

  await mondayClient.mutate({
    mutation: gql`
      mutation {
        change_column_value(
          board_id: ${BOARD_IDS.WORK_ORDERS}
          item_id: ${workOrderId}
          column_id: "${columnId}"
          value: "${esc(value)}"
        ) { id }
      }
    `,
  });
}

export async function apiUpdateWorkOrder(itemId, form) {
  if (!isValidMondayId(itemId)) {
    throw new Error(`Cannot update work order: item is still being created (id="${itemId}"). Please try again in a moment.`);
  }
  const cv = {};
  if (form.description !== undefined)     cv[COL.WORK_ORDERS.DESCRIPTION]     = { text: form.description };
  if (form.status !== undefined)          cv[COL.WORK_ORDERS.STATUS]           = { label: form.status || '' };
  if (form.scheduledDate !== undefined)   cv[COL.WORK_ORDERS.SCHEDULED_DATE]   = form.scheduledDate ? { date: form.scheduledDate } : { date: null };
  if (form.multiDay !== undefined)        cv[COL.WORK_ORDERS.MULTI_DAY]        = { checked: form.multiDay ? 'true' : 'false' };
  if (form.serviceHistory !== undefined)  cv[COL.WORK_ORDERS.SERVICE_HISTORY]  = { text: form.serviceHistory };
  if (form.workPerformed !== undefined)   cv[COL.WORK_ORDERS.WORK_PERFORMED]   = { text: form.workPerformed };
  if (form.executionStatus !== undefined) cv[COL.WORK_ORDERS.EXECUTION_STATUS] = { label: form.executionStatus || '' };
  if (form.partsOrdered !== undefined)    cv[COL.WORK_ORDERS.PARTS_ORDERED]    = { label: form.partsOrdered || '' };

  if (form.customerId !== undefined) {
    cv[COL.WORK_ORDERS.CUSTOMER] = form.customerId
      ? { linkedPulseIds: [{ linkedPulseId: parseInt(form.customerId) }] }
      : { linkedPulseIds: [] };
  }
  if (form.locationId !== undefined) {
    cv[COL.WORK_ORDERS.LOCATION] = form.locationId
      ? { linkedPulseIds: [{ linkedPulseId: parseInt(form.locationId) }] }
      : { linkedPulseIds: [] };
  }

  const { errors } = await mondayClient.mutate({
    mutation: gql`
      mutation {
        change_multiple_column_values(
          board_id: ${BOARD_IDS.WORK_ORDERS}
          item_id: ${itemId}
          column_values: "${esc(JSON.stringify(cv))}"
        ) { id }
      }
    `,
  });
  if (errors?.length) throw new Error(errors[0].message);

  if (form.name !== undefined && form.name.trim()) {
    await mondayClient.mutate({
      mutation: gql`
        mutation {
          change_simple_column_value(
            board_id: ${BOARD_IDS.WORK_ORDERS}
            item_id: ${itemId}
            column_id: "name"
            value: "${esc(form.name)}"
          ) { id }
        }
      `,
    });
  }
}

// ── Time Entries (read from Monday.com board) ─────────────────────────────────

/**
 * Fetch time entries from the Monday.com Time Entries board
 * grouped by status (In Progress / Completed)
 */
export async function apiFetchTimeEntries() {
  const { data, errors } = await mondayClient.query({
    query: gql`
      query {
        boards(ids: [${BOARD_IDS.TIME_ENTRIES}]) {
          items_page(limit: 100) {
            items {
              id
              name
              group { id title }
              column_values(ids: [
                "${COL.TIME_ENTRIES.TOTAL_HOURS}"
                "${COL.TIME_ENTRIES.CLOCK_IN}"
                "${COL.TIME_ENTRIES.CLOCK_OUT}"
                "${COL.TIME_ENTRIES.TASK_TYPE}"
                "${COL.TIME_ENTRIES.TECHNICIANS}"
                "${COL.TIME_ENTRIES.WORK_ORDERS_REL}"
                "${COL.TIME_ENTRIES.EXPENSES_ADDED}"
              ]) { id text value }
            }
          }
        }
      }
    `,
  });
  if (errors?.length) throw new Error(errors[0].message);
  return data.boards[0]?.items_page?.items ?? [];
}

// ── Expenses (read from Monday.com board) ────────────────────────────────────

export async function apiFetchExpenses(status) {
  const groupId = status === 'Approved' ? 'group_mm215rfc'
                : status === 'Rejected' ? 'group_mm217p3s'
                : 'topics'; // Pending

  const { data, errors } = await mondayClient.query({
    query: gql`
      query {
        boards(ids: [${BOARD_IDS.EXPENSES}]) {
          groups(ids: ["${groupId}"]) {
            items_page(limit: 100) {
              items {
                id
                name
                column_values(ids: [
                  "${COL.EXPENSES.TECHNICIAN}"
                  "${COL.EXPENSES.DESCRIPTION}"
                  "${COL.EXPENSES.EXPENSE_TYPE}"
                  "${COL.EXPENSES.WORK_ORDER}"
                  "${COL.EXPENSES.AMOUNT}"
                ]) { id text value }
              }
            }
          }
        }
      }
    `,
  });
  if (errors?.length) throw new Error(errors[0].message);
  return data.boards[0]?.groups[0]?.items_page?.items ?? [];
}

