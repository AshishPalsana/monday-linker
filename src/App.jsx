import { useState, useCallback } from 'react';
import { initialData } from './constants';
import AppRouter from './AppRouter';
import CustomerDrawer from './components/CustomerDrawer';
import LocationDrawer from './components/LocationDrawer';

export default function App() {
  const [data, setData] = useState(initialData);
  const [creating, setCreating] = useState(null); // { type: 'customer' | 'location', id: string }

  const updateData = useCallback((key, updater) => {
    setData(prev => ({ ...prev, [key]: updater(prev[key]) }));
  }, []);

  const createCustomer = useCallback((name, fromWorkOrderId) => {
    const id = 'c' + Date.now();
    const newCustomer = {
      id, name, contactName: '', email: '', phone: '', accountNumber: '',
      status: 'Active', billingAddress: '', billingTerms: '',
      xeroContactId: '', notes: '', locations: [], workOrders: fromWorkOrderId ? [fromWorkOrderId] : []
    };
    setData(prev => ({
      ...prev,
      customers: [...prev.customers, newCustomer],
      workOrders: prev.workOrders.map(wo => wo.id === fromWorkOrderId ? { ...wo, customerId: id } : wo)
    }));
    setCreating({ type: 'customer', id });
    return id;
  }, []);

  const createLocation = useCallback((name, fromWorkOrderId, customerId) => {
    const id = 'l' + Date.now();
    const newLocation = {
      id, name, streetAddress: '', city: '', state: '', zip: '',
      status: 'Active', notes: '', customerId: customerId || null,
      workOrders: fromWorkOrderId ? [fromWorkOrderId] : [], equipments: []
    };
    setData(prev => ({
      ...prev,
      locations: [...prev.locations, newLocation],
      workOrders: prev.workOrders.map(wo => wo.id === fromWorkOrderId ? { ...wo, locationId: id } : wo)
    }));
    setCreating({ type: 'location', id });
    return id;
  }, []);

  return (
    <>
      <AppRouter
        data={data}
        updateData={updateData}
        createCustomer={createCustomer}
        createLocation={createLocation}
      />
      {creating?.type === 'customer' && (
        <CustomerDrawer
          open={true}
          customer={data.customers.find(c => c.id === creating.id)}
          onClose={() => setCreating(null)}
          onUpdate={(id, fields) => {
            setData(prev => ({ ...prev, customers: prev.customers.map(c => c.id === id ? { ...c, ...fields } : c) }));
            setCreating(null);
          }}
          data={data}
        />
      )}
      {creating?.type === 'location' && (
        <LocationDrawer
          open={true}
          location={data.locations.find(l => l.id === creating.id)}
          onClose={() => setCreating(null)}
          onUpdate={(id, fields) => {
            setData(prev => ({ ...prev, locations: prev.locations.map(l => l.id === id ? { ...l, ...fields } : l) }));
            setCreating(null);
          }}
          data={data}
        />
      )}
    </>
  );
}