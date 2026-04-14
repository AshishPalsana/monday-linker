import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ApolloProvider } from '@apollo/client/react'
import { mondayClient } from './services/monday/client'
import { Provider } from 'react-redux'
import store from './store/index'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ApolloProvider client={mondayClient}>
        <App />
      </ApolloProvider>
    </Provider>
  </StrictMode>,
)
